import { Test } from '@nestjs/testing';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { HomeVetBookingStatus } from '@prisma/client';
import { JwtPayload, UserRole } from '@nuvet/types';
import { HomeVetBookingsService } from './home-vet-bookings.service';
import {
    HOME_VET_BOOKING_REPOSITORY,
    HomeVetBookingEntity,
    IHomeVetBookingRepository,
} from '../domain/home-vet-booking.repository';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const VET_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const BOOKING_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

const OWNER_ACTOR: JwtPayload = {
    sub: OWNER_ID,
    tenantId: TENANT_A,
    role: UserRole.CLIENT,
    email: 'owner@a.test',
};

const ADMIN_ACTOR: JwtPayload = {
    sub: '99999999-9999-9999-9999-999999999999',
    tenantId: TENANT_A,
    role: UserRole.CLINIC_ADMIN,
    email: 'admin@a.test',
};

const VET_ACTOR: JwtPayload = {
    sub: VET_ID,
    tenantId: TENANT_A,
    role: UserRole.VET,
    email: 'vet@a.test',
};

function makeBooking(
    overrides: Partial<HomeVetBookingEntity> = {},
): HomeVetBookingEntity {
    const now = new Date();
    return {
        id: BOOKING_ID,
        tenantId: TENANT_A,
        ownerId: OWNER_ID,
        petId: PET_ID,
        vetId: null,
        scheduledAt: new Date(now.getTime() + 60_000),
        address: 'Av. Siempre Viva 742',
        addressNotes: null,
        reason: 'Vacunación anual',
        status: HomeVetBookingStatus.REQUESTED,
        visitFeeCents: 3000,
        travelFeeCents: 1500,
        totalCents: 4500,
        currency: 'USD',
        visitNotes: null,
        diagnosis: null,
        internalNotes: null,
        cancelReason: null,
        cancelledAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

interface MockSet {
    service: HomeVetBookingsService;
    repo: jest.Mocked<IHomeVetBookingRepository>;
}

async function buildService(): Promise<MockSet> {
    const repo: jest.Mocked<IHomeVetBookingRepository> = {
        create: jest.fn(),
        findOne: jest.fn(),
        findByTenant: jest.fn(),
        findByOwner: jest.fn(),
        update: jest.fn(),
        assignVet: jest.fn(),
        markStatus: jest.fn(),
    } as unknown as jest.Mocked<IHomeVetBookingRepository>;

    const moduleRef = await Test.createTestingModule({
        providers: [
            HomeVetBookingsService,
            { provide: HOME_VET_BOOKING_REPOSITORY, useValue: repo },
        ],
    }).compile();

    return { service: moduleRef.get(HomeVetBookingsService), repo };
}

const futureDate = (ms = 60_000) => new Date(Date.now() + ms);

describe('HomeVetBookingsService', () => {
    // ── create ──────────────────────────────────────────────────────────────
    it('create: CLIENT crea para sí mismo con ownerId implícito', async () => {
        const { service, repo } = await buildService();
        const created = makeBooking();
        repo.create.mockResolvedValueOnce(created);

        const result = await service.create(OWNER_ACTOR, {
            petId: PET_ID,
            scheduledAt: futureDate(),
            address: 'Av. Siempre Viva 742',
            reason: 'Vacunación anual',
            visitFeeCents: 3000,
            travelFeeCents: 1500,
        });

        expect(result.id).toBe(BOOKING_ID);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: TENANT_A,
                ownerId: OWNER_ID,
                petId: PET_ID,
                totalCents: 4500,
                currency: 'USD',
            }),
        );
    });

    it('create: CLIENT ignora ownerId del body y usa actor.sub', async () => {
        const { service, repo } = await buildService();
        const created = makeBooking();
        repo.create.mockResolvedValueOnce(created);

        await service.create(OWNER_ACTOR, {
            petId: PET_ID,
            scheduledAt: futureDate(),
            address: 'x',
            reason: 'r',
            ownerId: '00000000-0000-0000-0000-000000000000',
        });

        const call = repo.create.mock.calls[0][0];
        expect(call.ownerId).toBe(OWNER_ID);
    });

    it('create: staff con ownerId explícito lo usa', async () => {
        const { service, repo } = await buildService();
        repo.create.mockResolvedValueOnce(makeBooking());

        await service.create(ADMIN_ACTOR, {
            petId: PET_ID,
            scheduledAt: futureDate(),
            address: 'x',
            reason: 'r',
            ownerId: 'other-owner',
        });

        expect(repo.create.mock.calls[0][0].ownerId).toBe('other-owner');
    });

    it('create: staff sin ownerId lanza BadRequest', async () => {
        const { service } = await buildService();

        await expect(
            service.create(ADMIN_ACTOR, {
                petId: PET_ID,
                scheduledAt: futureDate(),
                address: 'x',
                reason: 'r',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('create: scheduledAt en el pasado lanza BadRequest', async () => {
        const { service } = await buildService();

        await expect(
            service.create(OWNER_ACTOR, {
                petId: PET_ID,
                scheduledAt: new Date(Date.now() - 60_000),
                address: 'x',
                reason: 'r',
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    // ── list ────────────────────────────────────────────────────────────────
    it('list: CLIENT usa findByOwner (no ve los ajenos)', async () => {
        const { service, repo } = await buildService();
        repo.findByOwner.mockResolvedValueOnce({ data: [makeBooking()], total: 1 });

        const result = await service.list(OWNER_ACTOR, {}, { skip: 0, take: 20 });

        expect(repo.findByOwner).toHaveBeenCalledWith(
            OWNER_ID,
            {},
            { skip: 0, take: 20 },
        );
        expect(repo.findByTenant).not.toHaveBeenCalled();
        expect(result.total).toBe(1);
    });

    it('list: staff usa findByTenant', async () => {
        const { service, repo } = await buildService();
        repo.findByTenant.mockResolvedValueOnce({ data: [], total: 0 });

        await service.list(ADMIN_ACTOR, {}, { skip: 0, take: 20 });

        expect(repo.findByTenant).toHaveBeenCalledWith(
            TENANT_A,
            {},
            { skip: 0, take: 20 },
        );
        expect(repo.findByOwner).not.toHaveBeenCalled();
    });

    // ── getOne ─────────────────────────────────────────────────────────────
    it('getOne: cliente no-dueno recibe NotFound (no-leak)', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ ownerId: '00000000-0000-0000-0000-000000000000' }),
        );

        await expect(service.getOne(OWNER_ACTOR, BOOKING_ID)).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    // ── update ─────────────────────────────────────────────────────────────
    it('update: CLIENT no puede editar', async () => {
        const { service } = await buildService();

        await expect(
            service.update(OWNER_ACTOR, BOOKING_ID, { reason: 'r' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('update: staff no puede editar CANCELLED/COMPLETED', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ status: HomeVetBookingStatus.CANCELLED }),
        );

        await expect(
            service.update(ADMIN_ACTOR, BOOKING_ID, { reason: 'r' }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.update).not.toHaveBeenCalled();
    });

    // ── assignVet ──────────────────────────────────────────────────────────
    it('assignVet: CLIENT no puede', async () => {
        const { service } = await buildService();

        await expect(
            service.assignVet(OWNER_ACTOR, BOOKING_ID, VET_ID),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assignVet: staff reasigna (no admin) lanza Forbidden', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ vetId: 'old-vet' }),
        );

        await expect(
            service.assignVet(VET_ACTOR, BOOKING_ID, VET_ID),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('assignVet: staff asigna vet por primera vez y transiciona a CONFIRMED', async () => {
        const { service, repo } = await buildService();
        const afterAssign = makeBooking({ vetId: VET_ID });
        const afterConfirm = makeBooking({
            vetId: VET_ID,
            status: HomeVetBookingStatus.CONFIRMED,
        });
        repo.findOne.mockResolvedValueOnce(makeBooking({ vetId: null }));
        repo.assignVet.mockResolvedValueOnce(afterAssign);
        repo.markStatus.mockResolvedValueOnce(afterConfirm);

        const result = await service.assignVet(VET_ACTOR, BOOKING_ID, VET_ID);

        expect(repo.assignVet).toHaveBeenCalledWith(TENANT_A, BOOKING_ID, VET_ID);
        expect(repo.markStatus).toHaveBeenCalledWith(
            TENANT_A,
            BOOKING_ID,
            HomeVetBookingStatus.CONFIRMED,
            {},
        );
        expect(result.status).toBe(HomeVetBookingStatus.CONFIRMED);
    });

    it('assignVet: admin reasigna sin transicionar (ya estaba CONFIRMED)', async () => {
        const { service, repo } = await buildService();
        const afterAssign = makeBooking({
            vetId: VET_ID,
            status: HomeVetBookingStatus.CONFIRMED,
        });
        repo.findOne.mockResolvedValueOnce(afterAssign);
        repo.assignVet.mockResolvedValueOnce(afterAssign);

        await service.assignVet(ADMIN_ACTOR, BOOKING_ID, VET_ID);

        expect(repo.markStatus).not.toHaveBeenCalled();
    });

    // ── transition ─────────────────────────────────────────────────────────
    it('transition: REQUESTED -> CONFIRMED permitido para staff', async () => {
        const { service, repo } = await buildService();
        const confirmed = makeBooking({ status: HomeVetBookingStatus.CONFIRMED });
        repo.findOne.mockResolvedValueOnce(makeBooking());
        repo.markStatus.mockResolvedValueOnce(confirmed);

        const result = await service.transition(
            VET_ACTOR,
            BOOKING_ID,
            HomeVetBookingStatus.CONFIRMED,
        );

        expect(result.status).toBe(HomeVetBookingStatus.CONFIRMED);
    });

    it('transition: CONFIRMED -> COMPLETED NO permitido (debe pasar por IN_PROGRESS)', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ status: HomeVetBookingStatus.CONFIRMED }),
        );

        await expect(
            service.transition(
                VET_ACTOR,
                BOOKING_ID,
                HomeVetBookingStatus.COMPLETED,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(repo.markStatus).not.toHaveBeenCalled();
    });

    it('transition: cliente solo puede CANCELLED, no CONFIRMED', async () => {
        const { service } = await buildService();

        await expect(
            service.transition(
                OWNER_ACTOR,
                BOOKING_ID,
                HomeVetBookingStatus.CONFIRMED,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('transition: cliente cancela su propio booking', async () => {
        const { service, repo } = await buildService();
        const cancelled = makeBooking({
            status: HomeVetBookingStatus.CANCELLED,
            cancelReason: 'mejoro',
        });
        repo.findOne.mockResolvedValueOnce(makeBooking());
        repo.markStatus.mockResolvedValueOnce(cancelled);

        const result = await service.transition(
            OWNER_ACTOR,
            BOOKING_ID,
            HomeVetBookingStatus.CANCELLED,
            { cancelReason: 'mejoro' },
        );

        expect(result.status).toBe(HomeVetBookingStatus.CANCELLED);
        expect(repo.markStatus).toHaveBeenCalledWith(
            TENANT_A,
            BOOKING_ID,
            HomeVetBookingStatus.CANCELLED,
            { cancelReason: 'mejoro' },
        );
    });

    it('transition: cliente intenta cancelar booking ajeno → NotFound (no-leak)', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ ownerId: '00000000-0000-0000-0000-000000000000' }),
        );

        await expect(
            service.transition(
                OWNER_ACTOR,
                BOOKING_ID,
                HomeVetBookingStatus.CANCELLED,
            ),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('transition: COMPLETED es terminal, no permite más cambios', async () => {
        const { service, repo } = await buildService();
        repo.findOne.mockResolvedValueOnce(
            makeBooking({ status: HomeVetBookingStatus.COMPLETED }),
        );

        await expect(
            service.transition(
                VET_ACTOR,
                BOOKING_ID,
                HomeVetBookingStatus.CANCELLED,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
});
