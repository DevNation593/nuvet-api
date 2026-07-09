import { Test } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConsentScope, ConsentStatus, ConsentAuditAction, UserRole } from '@prisma/client';
import { ConsentService } from './consent.service';
import { ConsentAuditWriter } from './consent-audit.writer';
import {
    CONSENT_REPOSITORY,
    ConsentWithRelations,
    IConsentRepository,
} from '../domain/consent.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';

/**
 * Tests unitarios de `ConsentService` (Fase 2 — v1: modelo grant-based).
 *
 * Cubre las reglas de negocio críticas del pasaporte digital:
 *   1. grant (owner)         → ok + audit GRANTED
 *   2. grant (staff tenant)  → ok
 *   3. grant (other tenant)  → ForbiddenException
 *   4. grant (no encontrado) → NotFoundException
 *   5. grant (same tenant)   → BadRequestException
 *   6. grant (target inactivo) → BadRequestException
 *   7. grant (expiresAt pasado) → BadRequestException
 *   8. revoke (owner)        → ok + audit REVOKED
 *   9. revoke (no owner)     → ForbiddenException
 *  10. revoke (ya revocado)  → no re-audita
 *  11. listMine (CLIENT)     → llama findByOwner
 *  12. listMine (staff sin petId) → vacío
 *  13. listMine (staff con petId) → llama findByPet
 *  14. recordAccess          → delega al writer con action=ACCESSED
 *
 * El repositorio, PrismaService, PassportPrismaService y el writer se
 * mockean a mano para no depender de Postgres.
 */

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const OWNER_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const TARGET_TENANT_ID = TENANT_B;

const CLIENT_ACTOR = {
    sub: OWNER_USER_ID,
    tenantId: TENANT_A,
    role: UserRole.CLIENT,
};

const VET_TENANT_A = {
    sub: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    tenantId: TENANT_A,
    role: UserRole.VET,
};

function makePet(overrides: Partial<{ id: string; tenantId: string; ownerId: string; isActive: boolean }> = {}) {
    return {
        id: PET_ID,
        tenantId: TENANT_A,
        ownerId: OWNER_USER_ID,
        isActive: true,
        ...overrides,
    };
}

function makeConsent(overrides: Partial<ConsentWithRelations> = {}): ConsentWithRelations {
    const now = new Date();
    return {
        id: 'consent-1',
        tenantId: TENANT_A,
        sourceTenantId: TENANT_A,
        petId: PET_ID,
        ownerId: OWNER_USER_ID,
        targetTenantId: TARGET_TENANT_ID,
        targetClinicName: 'Clínica B',
        status: ConsentStatus.GRANTED,
        scopes: [ConsentScope.PASSPORT_READ],
        message: null,
        grantedAt: now,
        expiresAt: null,
        revokedAt: null,
        revokeReason: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

interface MockSet {
    service: ConsentService;
    repo: jest.Mocked<IConsentRepository>;
    prisma: { pet: { findFirst: jest.Mock } };
    passportPrisma: { client: { tenant: { findUnique: jest.Mock } } };
    auditWriter: { write: jest.Mock };
}

async function buildService(): Promise<MockSet> {
    const repo: jest.Mocked<IConsentRepository> = {
        findOne: jest.fn(),
        findOneGlobal: jest.fn(),
        findByOwner: jest.fn(),
        findByPet: jest.fn(),
        findActiveGrant: jest.fn(),
        countActiveGrantsForPetTarget: jest.fn(),
        upsertGrant: jest.fn(),
        revoke: jest.fn(),
    } as unknown as jest.Mocked<IConsentRepository>;

    const petFindFirst = jest.fn();
    const tenantFindUnique = jest.fn();

    const auditWriter = { write: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
        providers: [
            ConsentService,
            { provide: CONSENT_REPOSITORY, useValue: repo },
            {
                provide: PrismaService,
                useValue: { pet: { findFirst: petFindFirst } },
            },
            {
                provide: PassportPrismaService,
                useValue: { client: { tenant: { findUnique: tenantFindUnique } } },
            },
            { provide: ConsentAuditWriter, useValue: auditWriter },
        ],
    }).compile();

    const service = moduleRef.get(ConsentService);
    return {
        service,
        repo,
        prisma: { pet: { findFirst: petFindFirst } },
        passportPrisma: { client: { tenant: { findUnique: tenantFindUnique } } },
        auditWriter,
    };
}

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('ConsentService (v1: grant-based)', () => {
    // ── grant: casos felices ─────────────────────────────────────────────────
    it('grant por owner: persiste + audita GRANTED', async () => {
        const { service, repo, prisma, passportPrisma, auditWriter } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());
        passportPrisma.client.tenant.findUnique.mockResolvedValueOnce({
            id: TARGET_TENANT_ID,
            name: 'Clínica B',
            isActive: true,
        });
        const created = makeConsent();
        repo.upsertGrant.mockResolvedValueOnce(created);

        const result = await service.grant(
            CLIENT_ACTOR,
            {
                petId: PET_ID,
                targetTenantId: TARGET_TENANT_ID,
            },
            ctx,
        );

        expect(result.id).toBe('consent-1');
        expect(result.status).toBe(ConsentStatus.GRANTED);
        expect(repo.upsertGrant).toHaveBeenCalledTimes(1);
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        const auditArg = auditWriter.write.mock.calls[0][0];
        expect(auditArg.action).toBe(ConsentAuditAction.GRANTED);
        expect(auditArg.consentId).toBe('consent-1');
        expect(auditArg.actorUserId).toBe(CLIENT_ACTOR.sub);
        expect(auditArg.tenantId).toBe(TENANT_A);
    });

    it('grant por staff del tenant: persiste + audita', async () => {
        const { service, repo, prisma, passportPrisma, auditWriter } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());
        passportPrisma.client.tenant.findUnique.mockResolvedValueOnce({
            id: TARGET_TENANT_ID,
            name: 'Clínica B',
            isActive: true,
        });
        repo.upsertGrant.mockResolvedValueOnce(makeConsent());
        auditWriter.write.mockClear();

        await service.grant(
            VET_TENANT_A,
            { petId: PET_ID, targetTenantId: TARGET_TENANT_ID },
            ctx,
        );

        expect(repo.upsertGrant).toHaveBeenCalledTimes(1);
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
    });

    // ── grant: errores de autorización ──────────────────────────────────────
    it('grant: cliente que no es dueño y no es staff → ForbiddenException', async () => {
        const { service, prisma, repo, auditWriter } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());

        const otherClient = {
            sub: '99999999-9999-9999-9999-999999999999', // ≠ owner
            tenantId: TENANT_A,
            role: UserRole.CLIENT,
        };

        await expect(
            service.grant(
                otherClient,
                { petId: PET_ID, targetTenantId: TARGET_TENANT_ID },
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
        expect(auditWriter.write).not.toHaveBeenCalled();
    });

    it('grant: staff de otro tenant → ForbiddenException', async () => {
        const { service, prisma, repo, auditWriter } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());

        const crossTenantStaff = {
            sub: '99999999-9999-9999-9999-999999999999',
            tenantId: TENANT_B, // distinto del tenant del pet
            role: UserRole.VET,
        };

        await expect(
            service.grant(
                crossTenantStaff,
                { petId: PET_ID, targetTenantId: TARGET_TENANT_ID },
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
        expect(auditWriter.write).not.toHaveBeenCalled();
    });

    // ── grant: errores de validación ─────────────────────────────────────────
    it('grant: pet inexistente → NotFoundException', async () => {
        const { service, prisma, repo } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(null);

        await expect(
            service.grant(
                CLIENT_ACTOR,
                { petId: PET_ID, targetTenantId: TARGET_TENANT_ID },
                ctx,
            ),
        ).rejects.toBeInstanceOf(NotFoundException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
    });

    it('grant: target = mismo tenant → BadRequestException', async () => {
        const { service, prisma, repo } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());

        await expect(
            service.grant(
                CLIENT_ACTOR,
                { petId: PET_ID, targetTenantId: TENANT_A }, // mismo tenant
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
    });

    it('grant: target tenant inactivo → BadRequestException', async () => {
        const { service, prisma, passportPrisma, repo } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());
        passportPrisma.client.tenant.findUnique.mockResolvedValueOnce({
            id: TARGET_TENANT_ID,
            name: 'Clínica Cerrada',
            isActive: false,
        });

        await expect(
            service.grant(
                CLIENT_ACTOR,
                { petId: PET_ID, targetTenantId: TARGET_TENANT_ID },
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
    });

    it('grant: expiresAt en el pasado → BadRequestException', async () => {
        const { service, prisma, passportPrisma, repo } = await buildService();
        prisma.pet.findFirst.mockResolvedValueOnce(makePet());
        passportPrisma.client.tenant.findUnique.mockResolvedValueOnce({
            id: TARGET_TENANT_ID,
            name: 'Clínica B',
            isActive: true,
        });

        const past = new Date(Date.now() - 60_000).toISOString();
        await expect(
            service.grant(
                CLIENT_ACTOR,
                { petId: PET_ID, targetTenantId: TARGET_TENANT_ID, expiresAt: past },
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.upsertGrant).not.toHaveBeenCalled();
    });

    // ── revoke ───────────────────────────────────────────────────────────────
    it('revoke por owner: marca REVOKED + audita', async () => {
        const { service, repo, auditWriter } = await buildService();
        const existing = makeConsent();
        const revoked = makeConsent({ status: ConsentStatus.REVOKED, revokedAt: new Date() });
        repo.findOneGlobal.mockResolvedValueOnce(existing);
        repo.revoke.mockResolvedValueOnce(revoked);

        const result = await service.revoke(
            CLIENT_ACTOR,
            'consent-1',
            { reason: 'owner requested' },
            ctx,
        );

        expect(result.status).toBe(ConsentStatus.REVOKED);
        expect(repo.revoke).toHaveBeenCalledTimes(1);
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        const auditArg = auditWriter.write.mock.calls[0][0];
        expect(auditArg.action).toBe(ConsentAuditAction.REVOKED);
        expect(auditArg.metadata?.['reason']).toBe('owner requested');
    });

    it('revoke: cliente que no es dueño y no es staff → ForbiddenException', async () => {
        const { service, repo, auditWriter } = await buildService();
        repo.findOneGlobal.mockResolvedValueOnce(
            makeConsent({ ownerId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' }),
        );

        await expect(
            service.revoke(CLIENT_ACTOR, 'consent-1', {}, ctx),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repo.revoke).not.toHaveBeenCalled();
        expect(auditWriter.write).not.toHaveBeenCalled();
    });

    it('revoke sobre consentimiento ya revocado: idempotente, no re-audita', async () => {
        const { service, repo, auditWriter } = await buildService();
        const alreadyRevoked = makeConsent({ status: ConsentStatus.REVOKED });
        repo.findOneGlobal.mockResolvedValueOnce(alreadyRevoked);

        const result = await service.revoke(CLIENT_ACTOR, 'consent-1', {}, ctx);

        expect(result.status).toBe(ConsentStatus.REVOKED);
        expect(repo.revoke).not.toHaveBeenCalled();
        expect(auditWriter.write).not.toHaveBeenCalled();
    });

    // ── listMine ─────────────────────────────────────────────────────────────
    it('listMine como CLIENT → usa findByOwner', async () => {
        const { service, repo } = await buildService();
        const consent = makeConsent();
        repo.findByOwner.mockResolvedValueOnce({ data: [consent], total: 1 });

        const result = await service.listMine(CLIENT_ACTOR, {}, { skip: 0, take: 20 });

        expect(repo.findByOwner).toHaveBeenCalledWith(OWNER_USER_ID, {}, { skip: 0, take: 20 });
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
        expect(repo.findByPet).not.toHaveBeenCalled();
    });

    it('listMine como staff sin petId → no consulta repo, devuelve vacío', async () => {
        const { service, repo } = await buildService();

        const result = await service.listMine(VET_TENANT_A, {}, { skip: 0, take: 20 });

        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
        expect(repo.findByOwner).not.toHaveBeenCalled();
        expect(repo.findByPet).not.toHaveBeenCalled();
    });

    it('listMine como staff con petId → usa findByPet', async () => {
        const { service, repo } = await buildService();
        const consent = makeConsent();
        repo.findByPet.mockResolvedValueOnce({ data: [consent], total: 1 });

        const result = await service.listMine(
            VET_TENANT_A,
            { petId: PET_ID },
            { skip: 0, take: 20 },
        );

        expect(repo.findByPet).toHaveBeenCalledWith(TENANT_A, PET_ID, { skip: 0, take: 20 });
        expect(result.total).toBe(1);
        expect(result.data).toHaveLength(1);
        expect(repo.findByOwner).not.toHaveBeenCalled();
    });

    // ── recordAccess ─────────────────────────────────────────────────────────
    it('recordAccess delega al writer con action=ACCESSED', async () => {
        const { service, auditWriter } = await buildService();

        await service.recordAccess({
            tenantId: TENANT_A,
            consentId: 'consent-1',
            actorUserId: 'user-1',
            actorTenantId: TENANT_B,
            ipAddress: '1.2.3.4',
        });

        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        const arg = auditWriter.write.mock.calls[0][0];
        expect(arg.action).toBe(ConsentAuditAction.ACCESSED);
        expect(arg.consentId).toBe('consent-1');
        expect(arg.tenantId).toBe(TENANT_A);
        expect(arg.ipAddress).toBe('1.2.3.4');
    });
});
