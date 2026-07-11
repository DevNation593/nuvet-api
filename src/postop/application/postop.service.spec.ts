import { Test } from '@nestjs/testing';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { JwtPayload, UserRole } from '@nuvet/types';
import { PostOpService } from './postop.service';
import {
    IPostOpCheckinRepository,
    IPostOpPlanRepository,
    POSTOP_CHECKIN_REPOSITORY,
    POSTOP_PLAN_REPOSITORY,
    PostOpCheckinEntity,
    PostOpPlanEntity,
} from '../domain/postop.repository';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const OWNER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const VET_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const PLAN_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const CHECKIN_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const OWNER_ACTOR: JwtPayload = {
    sub: OWNER_ID,
    tenantId: TENANT_A,
    role: UserRole.CLIENT,
    email: 'owner@a.test',
};

const VET_ACTOR: JwtPayload = {
    sub: VET_ID,
    tenantId: TENANT_A,
    role: UserRole.VET,
    email: 'vet@a.test',
};

const ADMIN_ACTOR: JwtPayload = {
    sub: '99999999-9999-9999-9999-999999999999',
    tenantId: TENANT_A,
    role: UserRole.CLINIC_ADMIN,
    email: 'admin@a.test',
};

const buildActor = (user: JwtPayload) => ({ userId: user.sub, role: user.role });

function makePlan(overrides: Partial<PostOpPlanEntity> = {}): PostOpPlanEntity {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // ayer
    const end = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000); // 6 días
    return {
        id: PLAN_ID,
        tenantId: TENANT_A,
        petId: PET_ID,
        ownerId: OWNER_ID,
        surgeryId: null,
        vetId: VET_ID,
        title: 'Recuperación post-cirugía',
        instructions: 'Reposo absoluto por 7 días',
        startDate: start,
        endDate: end,
        checkinIntervalDays: 2,
        status: 'ACTIVE',
        completedAt: null,
        cancelledAt: null,
        cancelReason: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function makeCheckin(overrides: Partial<PostOpCheckinEntity> = {}): PostOpCheckinEntity {
    const now = new Date();
    return {
        id: CHECKIN_ID,
        tenantId: TENANT_A,
        planId: PLAN_ID,
        ownerId: OWNER_ID,
        submittedAt: now,
        ownerNote: 'Come normal, sin vómito',
        photoUrls: [],
        weightKg: 4.5,
        appetite: 'normal',
        energyLevel: 'normal',
        concernsFlag: false,
        vetNote: null,
        reviewedAt: null,
        reviewedById: null,
        status: 'SUBMITTED',
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

interface MockSet {
    service: PostOpService;
    planRepo: jest.Mocked<IPostOpPlanRepository>;
    checkinRepo: jest.Mocked<IPostOpCheckinRepository>;
}

async function buildService(): Promise<MockSet> {
    const planRepo: jest.Mocked<IPostOpPlanRepository> = {
        createPlan: jest.fn(),
        findOnePlan: jest.fn(),
        findPlansByTenant: jest.fn(),
        findPlansByOwner: jest.fn(),
        updatePlan: jest.fn(),
        completePlan: jest.fn(),
        cancelPlan: jest.fn(),
    } as unknown as jest.Mocked<IPostOpPlanRepository>;

    const checkinRepo: jest.Mocked<IPostOpCheckinRepository> = {
        create: jest.fn(),
        findOne: jest.fn(),
        findByPlan: jest.fn(),
        review: jest.fn(),
    } as unknown as jest.Mocked<IPostOpCheckinRepository>;

    const moduleRef = await Test.createTestingModule({
        providers: [
            PostOpService,
            { provide: POSTOP_PLAN_REPOSITORY, useValue: planRepo },
            { provide: POSTOP_CHECKIN_REPOSITORY, useValue: checkinRepo },
        ],
    }).compile();

    return {
        service: moduleRef.get(PostOpService),
        planRepo,
        checkinRepo,
    };
}

describe('PostOpService · plans', () => {
    describe('createPlan', () => {
        it('crea el plan con fechas normalizadas', async () => {
            const { service, planRepo } = await buildService();
            const start = new Date('2026-07-10T00:00:00Z');
            const end = new Date('2026-07-20T00:00:00Z');
            const created = makePlan({ startDate: start, endDate: end });
            planRepo.createPlan.mockResolvedValueOnce(created);

            const result = await service.createPlan(TENANT_A, {
                tenantId: TENANT_A,
                petId: PET_ID,
                ownerId: OWNER_ID,
                vetId: VET_ID,
                title: 'Plan A',
                instructions: 'Reposo',
                startDate: start,
                endDate: end,
            });

            expect(result).toBe(created);
            expect(planRepo.createPlan).toHaveBeenCalledWith(
                expect.objectContaining({ startDate: start, endDate: end }),
            );
        });

        it('rechaza si endDate <= startDate', async () => {
            const { service, planRepo } = await buildService();
            const start = new Date('2026-07-10T00:00:00Z');
            const end = new Date('2026-07-10T00:00:00Z');
            await expect(
                service.createPlan(TENANT_A, {
                    tenantId: TENANT_A,
                    petId: PET_ID,
                    ownerId: OWNER_ID,
                    vetId: VET_ID,
                    title: 'Plan',
                    instructions: 'x',
                    startDate: start,
                    endDate: end,
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(planRepo.createPlan).not.toHaveBeenCalled();
        });
    });

    describe('findOnePlan', () => {
        it('lanza NotFound cuando no existe', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(null);
            await expect(
                service.findOnePlan(TENANT_A, PLAN_ID, buildActor(VET_ACTOR)),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('CLIENT solo puede ver sus propios planes', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan()); // owner = OWNER_ID
            await expect(
                service.findOnePlan(
                    TENANT_A,
                    PLAN_ID,
                    buildActor({ ...OWNER_ACTOR, sub: 'otro-user' }),
                ),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('vet/admin puede ver cualquier plan del tenant', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            const result = await service.findOnePlan(TENANT_A, PLAN_ID, buildActor(VET_ACTOR), true);
            expect(result.id).toBe(PLAN_ID);
            expect(planRepo.findOnePlan).toHaveBeenCalledWith(TENANT_A, PLAN_ID, true);
        });
    });

    describe('listByTenant / listByOwner', () => {
        it('pasa la paginación correcta', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findPlansByTenant.mockResolvedValueOnce({ data: [], total: 0 });
            await service.listByTenant(TENANT_A, {}, 2, 10);
            expect(planRepo.findPlansByTenant).toHaveBeenCalledWith(
                TENANT_A,
                {},
                { skip: 10, take: 10 },
            );
        });

        it('clamp pageSize a 100', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findPlansByOwner.mockResolvedValueOnce({ data: [], total: 0 });
            await service.listByOwner(OWNER_ID, {}, 1, 9999);
            expect(planRepo.findPlansByOwner).toHaveBeenCalledWith(
                OWNER_ID,
                {},
                { skip: 0, take: 100 },
            );
        });
    });

    describe('updatePlan', () => {
        it('rechaza editar un plan COMPLETED', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan({ status: 'COMPLETED' }));
            await expect(
                service.updatePlan(TENANT_A, PLAN_ID, { title: 'Nuevo' }),
            ).rejects.toBeInstanceOf(BadRequestException);
            expect(planRepo.updatePlan).not.toHaveBeenCalled();
        });

        it('rechaza si el patch genera endDate <= startDate', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            await expect(
                service.updatePlan(TENANT_A, PLAN_ID, {
                    startDate: new Date('2026-07-20T00:00:00Z'),
                    endDate: new Date('2026-07-20T00:00:00Z'),
                }),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('actualiza cuando está ACTIVE y las fechas son válidas', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            const updated = makePlan({ title: 'Nuevo título' });
            planRepo.updatePlan.mockResolvedValueOnce(updated);
            const result = await service.updatePlan(TENANT_A, PLAN_ID, { title: 'Nuevo título' });
            expect(result.title).toBe('Nuevo título');
        });
    });

    describe('completePlan / cancelPlan', () => {
        it('completePlan es idempotente si ya está COMPLETED', async () => {
            const { service, planRepo } = await buildService();
            const done = makePlan({ status: 'COMPLETED', completedAt: new Date() });
            planRepo.findOnePlan.mockResolvedValueOnce(done);
            const result = await service.completePlan(TENANT_A, PLAN_ID);
            expect(result).toBe(done);
            expect(planRepo.completePlan).not.toHaveBeenCalled();
        });

        it('no se puede completar un plan CANCELLED', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan({ status: 'CANCELLED' }));
            await expect(
                service.completePlan(TENANT_A, PLAN_ID),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('cancelPlan con razón guarda el motivo', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            const cancelled = makePlan({
                status: 'CANCELLED',
                cancelReason: 'cliente se mudó',
                cancelledAt: new Date(),
            });
            planRepo.cancelPlan.mockResolvedValueOnce(cancelled);
            const result = await service.cancelPlan(TENANT_A, PLAN_ID, 'cliente se mudó');
            expect(planRepo.cancelPlan).toHaveBeenCalledWith(
                TENANT_A,
                PLAN_ID,
                'cliente se mudó',
            );
            expect(result.status).toBe('CANCELLED');
        });

        it('no se puede cancelar un plan COMPLETED', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan({ status: 'COMPLETED' }));
            await expect(
                service.cancelPlan(TENANT_A, PLAN_ID),
            ).rejects.toBeInstanceOf(BadRequestException);
        });
    });
});

describe('PostOpService · checkins', () => {
    describe('createCheckin', () => {
        it('CLIENT no autorizado para plan ajeno', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan()); // owner = OWNER_ID
            await expect(
                service.createCheckin(
                    TENANT_A,
                    PLAN_ID,
                    buildActor({ ...OWNER_ACTOR, sub: 'otro-user' }),
                    { ownerNote: 'x' },
                ),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('rechaza si el plan no está ACTIVE', async () => {
            const { service, planRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan({ status: 'COMPLETED' }));
            await expect(
                service.createCheckin(TENANT_A, PLAN_ID, buildActor(OWNER_ACTOR), {}),
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('vet puede crear checkin en nombre del dueño', async () => {
            const { service, planRepo, checkinRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            const created = makeCheckin();
            checkinRepo.create.mockResolvedValueOnce(created);
            const result = await service.createCheckin(
                TENANT_A,
                PLAN_ID,
                buildActor(VET_ACTOR),
                { ownerNote: 'todo bien' },
            );
            expect(checkinRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    tenantId: TENANT_A,
                    planId: PLAN_ID,
                    ownerId: OWNER_ID,
                    concernsFlag: false,
                    photoUrls: [],
                }),
            );
            expect(result).toBe(created);
        });
    });

    describe('listCheckins', () => {
        it('pasa paginación al repo', async () => {
            const { service, planRepo, checkinRepo } = await buildService();
            planRepo.findOnePlan.mockResolvedValueOnce(makePlan());
            checkinRepo.findByPlan.mockResolvedValueOnce({ data: [], total: 0 });
            await service.listCheckins(TENANT_A, PLAN_ID, buildActor(VET_ACTOR), 3, 5);
            expect(checkinRepo.findByPlan).toHaveBeenCalledWith(PLAN_ID, {
                skip: 10,
                take: 5,
            });
        });
    });

    describe('reviewCheckin', () => {
        it('CLIENT no puede revisar', async () => {
            const { service } = await buildService();
            await expect(
                service.reviewCheckin(
                    TENANT_A,
                    CHECKIN_ID,
                    VET_ID,
                    buildActor(OWNER_ACTOR),
                    { vetNote: 'x' },
                ),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('vet marca FLAGGED cuando flagged=true', async () => {
            const { service, checkinRepo } = await buildService();
            checkinRepo.findOne.mockResolvedValueOnce(makeCheckin());
            const reviewed = makeCheckin({
                status: 'FLAGGED',
                vetNote: 'revisar herida',
                reviewedById: VET_ID,
            });
            checkinRepo.review.mockResolvedValueOnce(reviewed);
            const result = await service.reviewCheckin(
                TENANT_A,
                CHECKIN_ID,
                VET_ID,
                buildActor(VET_ACTOR),
                { vetNote: 'revisar herida', flagged: true },
            );
            expect(checkinRepo.review).toHaveBeenCalledWith(
                TENANT_A,
                CHECKIN_ID,
                VET_ID,
                { vetNote: 'revisar herida', flagged: true },
            );
            expect(result.status).toBe('FLAGGED');
        });

        it('lanza NotFound si el checkin no existe', async () => {
            const { service, checkinRepo } = await buildService();
            checkinRepo.findOne.mockResolvedValueOnce(null);
            await expect(
                service.reviewCheckin(TENANT_A, CHECKIN_ID, VET_ID, buildActor(VET_ACTOR), {}),
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});

describe('PostOpService · ADMIN happy path', () => {
    it('admin puede crear, completar y leer planes', async () => {
        const { service, planRepo } = await buildService();
        planRepo.createPlan.mockResolvedValueOnce(makePlan());
        planRepo.findOnePlan.mockResolvedValueOnce(makePlan()); // para findOnePlan
        planRepo.findOnePlan.mockResolvedValueOnce(makePlan()); // para completePlan
        planRepo.completePlan.mockResolvedValueOnce(
            makePlan({ status: 'COMPLETED', completedAt: new Date() }),
        );

        const created = await service.createPlan(TENANT_A, {
            tenantId: TENANT_A,
            petId: PET_ID,
            ownerId: OWNER_ID,
            vetId: VET_ID,
            title: 'Plan',
            instructions: 'x',
            startDate: new Date('2026-07-10T00:00:00Z'),
            endDate: new Date('2026-07-20T00:00:00Z'),
        });
        expect(created.status).toBe('ACTIVE');

        const found = await service.findOnePlan(TENANT_A, PLAN_ID, buildActor(ADMIN_ACTOR));
        expect(found.id).toBe(PLAN_ID);

        const done = await service.completePlan(TENANT_A, PLAN_ID);
        expect(done.status).toBe('COMPLETED');
    });
});
