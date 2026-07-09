import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { BillingProviderKind, MembershipBillingPeriod, MembershipSubscriptionStatus, UserRole } from '@prisma/client';
import { MembershipSubscriptionsService, computePeriod } from './membership-subscriptions.service';

/**
 * Tests de `MembershipSubscriptionsService` para Fase 2 · Slice 2.
 *   - subscribe: happy path, fallo de cobro, mascota inexistente, plan
 *     inactivo, suscripción duplicada, permisos (dueño/staff/forastero)
 *   - cancel: dueño + staff (mismo tenant), bloqueo cross-tenant
 *   - pause / resume: solo el dueño
 *   - renewIfDue: renovación exitosa, fallo de cobro → past_due,
 *     suscripción no elegible → expired
 *   - computePeriod: monthly + annual
 *
 * Se mockean `IMembershipSubscriptionRepository`, `BillingProvider`,
 * `PrismaService` y `PassportPrismaService` a mano para no depender de la
 * base de datos ni del gateway.
 */

const PLAN_FULL = {
    id: 'plan-1',
    tenantId: 'tenant-1',
    slug: 'basic-monthly',
    name: 'Plan Basic',
    description: 'Plan básico mensual',
    priceCents: 1990,
    currency: 'USD',
    billingPeriod: MembershipBillingPeriod.MONTHLY,
    includedBenefits: ['consulta', 'vacuna'],
    applicableSpecies: [],
    isActive: true,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const PET_FULL = {
    id: 'pet-1',
    tenantId: 'tenant-1',
    ownerId: 'owner-1',
    name: 'Rex',
    species: 'DOG',
    breed: 'mix',
    sex: 'MALE',
    birthDate: null,
    weight: 12,
    color: null,
    microchip: null,
    photoUrl: null,
    allergies: null,
    isNeutered: false,
    isActive: true,
    createdAt: new Date(),
};

const OWNER_ACTOR = { sub: 'owner-1', tenantId: 'tenant-1', role: UserRole.CLIENT };
const STAFF_ACTOR = { sub: 'vet-1', tenantId: 'tenant-1', role: UserRole.VET };
const OTHER_OWNER_ACTOR = { sub: 'owner-2', tenantId: 'tenant-1', role: UserRole.CLIENT };
const STAFF_OTHER_TENANT = { sub: 'vet-9', tenantId: 'tenant-other', role: UserRole.VET };

function buildService() {
    const repo = {
        findByOwner: jest.fn(),
        findByTenant: jest.fn(),
        findActiveForPetAndPlan: jest.fn(),
        findOneGlobal: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        advancePeriod: jest.fn(),
    };

    const billingProvider = {
        charge: jest.fn(),
        cancelAtPeriodEnd: jest.fn(),
    };

    const report = {
        listFailures: jest.fn(),
        summarizeFailures: jest.fn(),
    };

    const prisma = {
        pet: { findFirst: jest.fn() },
        membershipPlan: { findFirst: jest.fn() },
    };

    // PassportPrismaService se mantiene neutral en estos tests; si un test
    // lo toca directamente, se mockea por separado.
    const passportPrisma = {} as any;

    const service = new MembershipSubscriptionsService(
        repo as any,
        billingProvider as any,
        report as any,
        prisma as any,
        passportPrisma,
    );

    return { service, repo, billingProvider, report, prisma };
}

describe('MembershipSubscriptionsService.computePeriod', () => {
    it('calcula monthly con end = start + 1 mes, next = end', () => {
        const from = new Date('2026-07-08T15:00:00Z');
        const p = computePeriod(MembershipBillingPeriod.MONTHLY, from);
        expect(p.currentPeriodStart.getTime()).toBeLessThan(p.currentPeriodEnd.getTime());
        expect(p.nextBillingAt.getTime()).toBe(p.currentPeriodEnd.getTime());
        // 30/31 días de diferencia — solo verificamos orden
        expect(p.nextBillingAt.getTime()).toBeGreaterThan(p.currentPeriodStart.getTime());
    });

    it('calcula annual con end = start + 1 año, next = end', () => {
        const from = new Date('2026-07-08T15:00:00Z');
        const p = computePeriod(MembershipBillingPeriod.ANNUAL, from);
        expect(p.currentPeriodEnd.getFullYear()).toBe(p.currentPeriodStart.getFullYear() + 1);
        expect(p.nextBillingAt.getTime()).toBe(p.currentPeriodEnd.getTime());
    });
});

describe('MembershipSubscriptionsService.subscribe', () => {
    it('happy path: dueño contrata un plan y queda ACTIVE', async () => {
        const { service, repo, billingProvider, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(PLAN_FULL);
        repo.findActiveForPetAndPlan.mockResolvedValueOnce(null);
        billingProvider.charge.mockResolvedValueOnce({
            ok: true,
            transactionId: 'tx-1',
        });
        repo.create.mockResolvedValueOnce({ id: 'sub-1' });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1', status: 'ACTIVE' });

        const result = await service.subscribe(OWNER_ACTOR, {
            petId: 'pet-1',
            planId: 'plan-1',
            paymentMethodToken: 'tok_test_abc',
        });

        expect(result).toEqual({ id: 'sub-1' });
        expect(billingProvider.charge).toHaveBeenCalledTimes(1);
        expect(repo.create).toHaveBeenCalledTimes(1);
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.ACTIVE,
            expect.objectContaining({ lastChargeTxId: 'tx-1' }),
        );
    });

    it('permite a un VET del mismo tenant suscribir a una mascota de su clínica', async () => {
        const { service, repo, billingProvider, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(PLAN_FULL);
        repo.findActiveForPetAndPlan.mockResolvedValueOnce(null);
        billingProvider.charge.mockResolvedValueOnce({ ok: true, transactionId: 'tx-2' });
        repo.create.mockResolvedValueOnce({ id: 'sub-2' });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-2' });

        const result = await service.subscribe(STAFF_ACTOR, {
            petId: 'pet-1',
            planId: 'plan-1',
        });
        expect(result).toBeDefined();
    });

    it('rechaza cuando la mascota no existe o pertenece a otro tenant', async () => {
        const { service, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(null);
        await expect(
            service.subscribe(OWNER_ACTOR, { petId: 'pet-x', planId: 'plan-1' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('rechaza cuando el plan no existe o está inactivo', async () => {
        const { service, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(null);
        await expect(
            service.subscribe(OWNER_ACTOR, { petId: 'pet-1', planId: 'plan-bad' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('rechaza cuando un CLIENT distinto al ownerId intenta suscribir', async () => {
        const { service, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        await expect(
            service.subscribe(OTHER_OWNER_ACTOR, { petId: 'pet-1', planId: 'plan-1' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('bloquea roles no-staff (GROOMER, INVENTORY, ADOPTION_MANAGER) incluso si la query del pet devolviera resultado', async () => {
        // Nota: el aislamiento por tenant se delega al Prisma middleware
        // (applyTenantScope) — el servicio considera "staff" a cualquier
        // actor con rol CLINIC_ADMIN / VET / RECEPTIONIST. Este test
        // verifica el fallback de autorización del servicio para roles
        // que no están en esa lista (ej. GROOMER).
        const { service, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        const groomer = { sub: 'groomer-1', tenantId: 'tenant-1', role: UserRole.GROOMER };
        await expect(
            service.subscribe(groomer, { petId: 'pet-1', planId: 'plan-1' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza cuando ya existe una suscripción activa para ese pet+plan', async () => {
        const { service, repo, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(PLAN_FULL);
        repo.findActiveForPetAndPlan.mockResolvedValueOnce({ id: 'sub-existing' });
        await expect(
            service.subscribe(OWNER_ACTOR, { petId: 'pet-1', planId: 'plan-1' }),
        ).rejects.toThrow(ConflictException);
    });

    it('rechaza cuando el billing provider rechaza el cobro inicial', async () => {
        const { service, repo, billingProvider, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(PLAN_FULL);
        repo.findActiveForPetAndPlan.mockResolvedValueOnce(null);
        billingProvider.charge.mockResolvedValueOnce({
            ok: false,
            failureCode: 'card_declined',
            failureMessage: 'Tarjeta rechazada',
        });
        await expect(
            service.subscribe(OWNER_ACTOR, { petId: 'pet-1', planId: 'plan-1' }),
        ).rejects.toThrow(BadRequestException);
        expect(repo.create).not.toHaveBeenCalled();
    });

    it('persiste providerKind=MOCK al crear la suscripción', async () => {
        const { service, repo, billingProvider, prisma } = buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(PET_FULL);
        prisma.membershipPlan.findFirst.mockResolvedValueOnce(PLAN_FULL);
        repo.findActiveForPetAndPlan.mockResolvedValueOnce(null);
        billingProvider.charge.mockResolvedValueOnce({ ok: true, transactionId: 'tx-3' });
        repo.create.mockResolvedValueOnce({ id: 'sub-3' });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-3' });

        await service.subscribe(OWNER_ACTOR, { petId: 'pet-1', planId: 'plan-1' });
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ providerKind: BillingProviderKind.MOCK }),
        );
    });
});

describe('MembershipSubscriptionsService.cancel', () => {
    it('permite al dueño cancelar su suscripción', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            ownerId: 'owner-1',
        });
        billingProvider.cancelAtPeriodEnd.mockResolvedValueOnce(undefined);
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1' });

        const result = await service.cancel(OWNER_ACTOR, 'sub-1', { reason: 'too_expensive' });
        expect(result).toBeDefined();
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.CANCELLED,
            expect.objectContaining({ cancelReason: 'too_expensive' }),
        );
    });

    it('permite a VET del mismo tenant cancelar (staff del catálogo)', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            ownerId: 'owner-1',
        });
        billingProvider.cancelAtPeriodEnd.mockResolvedValueOnce(undefined);
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1' });

        const result = await service.cancel(STAFF_ACTOR, 'sub-1', { reason: 'admin' });
        expect(result).toBeDefined();
    });

    it('bloquea staff de OTRO tenant', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            ownerId: 'owner-1',
        });
        await expect(
            service.cancel(STAFF_OTHER_TENANT, 'sub-1', { reason: 'x' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('NotFound si la suscripción no existe', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce(null);
        await expect(
            service.cancel(OWNER_ACTOR, 'sub-x', { reason: 'x' }),
        ).rejects.toThrow(NotFoundException);
    });
});

describe('MembershipSubscriptionsService.pause / resume', () => {
    it('permite al dueño pausar y deja autoRenew=false', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            ownerId: 'owner-1',
        });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1', status: 'PAUSED' });

        await service.pause(OWNER_ACTOR, 'sub-1');
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.PAUSED,
            expect.objectContaining({ autoRenew: false }),
        );
    });

    it('permite al dueño reanudar y deja autoRenew=true', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            ownerId: 'owner-1',
        });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1', status: 'ACTIVE' });

        await service.resume(OWNER_ACTOR, 'sub-1');
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.ACTIVE,
            expect.objectContaining({ autoRenew: true }),
        );
    });

    it('bloquea staff que intente pausar (solo el dueño)', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValue({ id: 'sub-1', ownerId: 'owner-1' });
        await expect(service.pause(STAFF_ACTOR, 'sub-1')).rejects.toThrow(ForbiddenException);
        await expect(service.resume(STAFF_ACTOR, 'sub-1')).rejects.toThrow(ForbiddenException);
    });

    it('NotFound si la suscripción no existe', async () => {
        const { service, repo } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce(null);
        await expect(service.pause(OWNER_ACTOR, 'sub-x')).rejects.toThrow(NotFoundException);
        await expect(service.resume(OWNER_ACTOR, 'sub-x')).rejects.toThrow(NotFoundException);
    });
});

describe('MembershipSubscriptionsService.renewIfDue', () => {
    it('renueva exitosamente una suscripción ACTIVE y devuelve "renewed"', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            status: MembershipSubscriptionStatus.ACTIVE,
            paymentMethodToken: 'tok_xyz',
            plan: {
                priceCents: 1990,
                currency: 'USD',
                billingPeriod: MembershipBillingPeriod.MONTHLY,
            },
        });
        billingProvider.charge.mockResolvedValueOnce({ ok: true, transactionId: 'tx-renew-1' });
        repo.advancePeriod.mockResolvedValueOnce({ id: 'sub-1' });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1' });

        const result = await service.renewIfDue('sub-1');
        expect(result).toEqual({ status: 'renewed' });
        expect(repo.advancePeriod).toHaveBeenCalledTimes(1);
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.ACTIVE,
            expect.objectContaining({ lastChargeTxId: 'tx-renew-1' }),
        );
    });

    it('marca past_due si el cobro de renovación falla', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            status: MembershipSubscriptionStatus.ACTIVE,
            paymentMethodToken: 'tok_xyz',
            plan: { priceCents: 1990, currency: 'USD', billingPeriod: MembershipBillingPeriod.MONTHLY },
        });
        billingProvider.charge.mockResolvedValueOnce({
            ok: false,
            failureCode: 'insufficient_funds',
            failureMessage: 'Sin fondos',
        });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1', status: 'PAST_DUE' });

        const result = await service.renewIfDue('sub-1');
        expect(result).toEqual({ status: 'past_due' });
        expect(repo.updateStatus).toHaveBeenCalledWith(
            'sub-1',
            MembershipSubscriptionStatus.PAST_DUE,
            {},
        );
        expect(repo.advancePeriod).not.toHaveBeenCalled();
    });

    it('devuelve "expired" si la suscripción no existe', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce(null);
        const result = await service.renewIfDue('sub-missing');
        expect(result).toEqual({ status: 'expired' });
        expect(billingProvider.charge).not.toHaveBeenCalled();
    });

    it('devuelve "expired" si la suscripción está CANCELLED / PAUSED / EXPIRED', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            status: MembershipSubscriptionStatus.CANCELLED,
            paymentMethodToken: 'tok',
            plan: { priceCents: 1990, currency: 'USD', billingPeriod: MembershipBillingPeriod.MONTHLY },
        });
        const result = await service.renewIfDue('sub-1');
        expect(result).toEqual({ status: 'expired' });
        expect(billingProvider.charge).not.toHaveBeenCalled();
    });

    it('también renova suscripciones en estado PAST_DUE (intento de recuperación)', async () => {
        const { service, repo, billingProvider } = buildService();
        repo.findOneGlobal.mockResolvedValueOnce({
            id: 'sub-1',
            tenantId: 'tenant-1',
            status: MembershipSubscriptionStatus.PAST_DUE,
            paymentMethodToken: 'tok',
            plan: { priceCents: 1990, currency: 'USD', billingPeriod: MembershipBillingPeriod.MONTHLY },
        });
        billingProvider.charge.mockResolvedValueOnce({ ok: true, transactionId: 'tx-recover' });
        repo.advancePeriod.mockResolvedValueOnce({ id: 'sub-1' });
        repo.updateStatus.mockResolvedValueOnce({ id: 'sub-1' });

        const result = await service.renewIfDue('sub-1');
        expect(result).toEqual({ status: 'renewed' });
    });
});

describe('MembershipSubscriptionsService.getBillingFailureReport', () => {
    const SUMMARY_FIXTURE = {
        failuresLast24Hours: 2,
        failuresLast7Days: 8,
        failuresLast30Days: 31,
        pastDueSubscriptions: 4,
        topFailureCodes: [
            { failureCode: 'card_declined', failureMessage: 'Tarjeta rechazada', count: 14 },
            { failureCode: 'insufficient_funds', failureMessage: 'Sin fondos', count: 8 },
        ],
        totalRecoveredAfterFailure: 5,
    };

    it('combina listFailures + summarizeFailures en una sola respuesta', async () => {
        const { service, report } = buildService();
        report.listFailures.mockResolvedValueOnce({
            data: [{ id: 'att-1' }],
            total: 17,
        });
        report.summarizeFailures.mockResolvedValueOnce(SUMMARY_FIXTURE);

        const result = await service.getBillingFailureReport('tenant-1', {});

        expect(result.attempts).toEqual([{ id: 'att-1' }]);
        expect(result.total).toBe(17);
        expect(result.summary).toEqual(SUMMARY_FIXTURE);
        expect(report.listFailures).toHaveBeenCalledWith(
            'tenant-1',
            expect.objectContaining({
                take: 20,
                skip: 0,
            }),
        );
        expect(report.summarizeFailures).toHaveBeenCalledWith(
            'tenant-1',
            expect.any(Date),
        );
    });

    it('respeta pageSize y calcula skip correctamente', async () => {
        const { service, report } = buildService();
        report.listFailures.mockResolvedValueOnce({ data: [], total: 0 });
        report.summarizeFailures.mockResolvedValueOnce({
            ...SUMMARY_FIXTURE,
            failuresLast24Hours: 0,
            failuresLast7Days: 0,
            failuresLast30Days: 0,
            pastDueSubscriptions: 0,
            topFailureCodes: [],
            totalRecoveredAfterFailure: 0,
        });

        const result = await service.getBillingFailureReport('tenant-1', {
            page: 3,
            pageSize: 10,
        });

        expect(result.page).toBe(3);
        expect(result.pageSize).toBe(10);
        expect(report.listFailures).toHaveBeenCalledWith(
            'tenant-1',
            expect.objectContaining({ take: 10, skip: 20 }),
        );
    });

    it('cap pageSize al rango [1, 100]', async () => {
        const { service, report } = buildService();
        report.listFailures.mockResolvedValue({ data: [], total: 0 });
        report.summarizeFailures.mockResolvedValue({
            failuresLast24Hours: 0,
            failuresLast7Days: 0,
            failuresLast30Days: 0,
            pastDueSubscriptions: 0,
            topFailureCodes: [],
            totalRecoveredAfterFailure: 0,
        });

        const resultDown = await service.getBillingFailureReport('tenant-1', {
            pageSize: 0,
        });
        const resultUp = await service.getBillingFailureReport('tenant-1', {
            pageSize: 9999,
        });
        const resultMinPage = await service.getBillingFailureReport('tenant-1', {
            page: -5,
        });
        const resultFractional = await service.getBillingFailureReport('tenant-1', {
            page: 1.7,
        });

        expect(resultDown.pageSize).toBe(1);
        expect(resultUp.pageSize).toBe(100);
        expect(resultMinPage.page).toBe(1);
        expect(resultFractional.page).toBe(1);
    });

    it('usa el since provisto o hace default a 30 días atrás', async () => {
        const { service, report } = buildService();
        report.listFailures.mockResolvedValue({ data: [], total: 0 });
        report.summarizeFailures.mockResolvedValue({
            failuresLast24Hours: 0,
            failuresLast7Days: 0,
            failuresLast30Days: 0,
            pastDueSubscriptions: 0,
            topFailureCodes: [],
            totalRecoveredAfterFailure: 0,
        });

        const explicit = new Date('2026-01-01T00:00:00.000Z');
        await service.getBillingFailureReport('tenant-1', { since: explicit });
        expect(report.listFailures).toHaveBeenLastCalledWith(
            'tenant-1',
            expect.objectContaining({ since: explicit }),
        );
        expect(report.summarizeFailures).toHaveBeenLastCalledWith('tenant-1', explicit);

        // Default = 30 días atrás (aprox)
        const before = Date.now();
        await service.getBillingFailureReport('tenant-1', {});
        const after = Date.now();
        const lastSince = report.listFailures.mock.calls.at(-1)?.[1]?.since as Date;
        expect(lastSince).toBeDefined();
        const sinceTs = lastSince.getTime();
        expect(sinceTs).toBeGreaterThan(before - 30 * 24 * 60 * 60 * 1000 - 5000);
        expect(sinceTs).toBeLessThan(after - 30 * 24 * 60 * 60 * 1000 + 5000);
    });
});
