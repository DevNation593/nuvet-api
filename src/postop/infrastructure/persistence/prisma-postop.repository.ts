import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, type PostOpCheckin, type PostOpPlan } from '@prisma/client';
import {
    CreatePostOpCheckinData,
    CreatePostOpPlanData,
    IPostOpCheckinRepository,
    IPostOpPlanRepository,
    ListPostOpPlansFilter,
    PostOpCheckinEntity,
    PostOpPlanEntity,
    ReviewPostOpCheckinData,
    UpdatePostOpPlanData,
} from '../../domain/postop.repository';

const PLAN_INCLUDE = {
    pet: { select: { id: true, name: true, species: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    vet: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PostOpPlanInclude;

const PLAN_INCLUDE_WITH_CHECKINS = {
    ...PLAN_INCLUDE,
    checkins: {
        orderBy: { submittedAt: 'desc' as const },
        include: {
            owner: { select: { id: true, firstName: true, lastName: true } },
            reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        },
    },
} satisfies Prisma.PostOpPlanInclude;

function toPlanEntity(plan: PostOpPlan & {
    pet?: { id: string; name: string; species: string } | null;
    owner?: { id: string; firstName: string; lastName: string; email: string } | null;
    vet?: { id: string; firstName: string; lastName: string } | null;
    checkins?: PostOpCheckinEntity[];
}): PostOpPlanEntity {
    return {
        ...plan,
        pet: plan.pet ?? undefined,
        owner: plan.owner ?? undefined,
        vet: plan.vet ?? undefined,
        checkins: plan.checkins ?? undefined,
    };
}

@Injectable()
export class PrismaPostOpPlanRepository implements IPostOpPlanRepository {
    constructor(private readonly prisma: PrismaService) {}

    async createPlan(data: CreatePostOpPlanData): Promise<PostOpPlanEntity> {
        const plan = await this.prisma.postOpPlan.create({
            data: {
                tenantId: data.tenantId,
                petId: data.petId,
                ownerId: data.ownerId,
                surgeryId: data.surgeryId ?? null,
                vetId: data.vetId,
                title: data.title,
                instructions: data.instructions,
                startDate: data.startDate,
                endDate: data.endDate,
                checkinIntervalDays: data.checkinIntervalDays ?? 2,
            },
            include: PLAN_INCLUDE,
        });
        return toPlanEntity(plan);
    }

    async findOnePlan(
        tenantId: string,
        id: string,
        withCheckins = false,
    ): Promise<PostOpPlanEntity | null> {
        const plan = await this.prisma.postOpPlan.findFirst({
            where: { id, tenantId },
            include: withCheckins ? PLAN_INCLUDE_WITH_CHECKINS : PLAN_INCLUDE,
        });
        return plan ? toPlanEntity(plan) : null;
    }

    async findPlansByTenant(
        tenantId: string,
        filter: ListPostOpPlansFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpPlanEntity[]; total: number }> {
        const where = this.buildWhere(tenantId, filter);
        const [data, total] = await Promise.all([
            this.prisma.postOpPlan.findMany({
                where,
                include: PLAN_INCLUDE,
                orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
                skip: pagination.skip,
                take: pagination.take,
            }),
            this.prisma.postOpPlan.count({ where }),
        ]);
        return { data: data.map(toPlanEntity), total };
    }

    async findPlansByOwner(
        ownerId: string,
        filter: ListPostOpPlansFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpPlanEntity[]; total: number }> {
        const where: Prisma.PostOpPlanWhereInput = {
            ownerId,
            ...(filter.status ? { status: filter.status } : {}),
            ...(filter.petId ? { petId: filter.petId } : {}),
            ...(filter.vetId ? { vetId: filter.vetId } : {}),
            ...(filter.surgeryId ? { surgeryId: filter.surgeryId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.postOpPlan.findMany({
                where,
                include: PLAN_INCLUDE,
                orderBy: [{ status: 'asc' }, { endDate: 'asc' }],
                skip: pagination.skip,
                take: pagination.take,
            }),
            this.prisma.postOpPlan.count({ where }),
        ]);
        return { data: data.map(toPlanEntity), total };
    }

    async updatePlan(
        tenantId: string,
        id: string,
        data: UpdatePostOpPlanData,
    ): Promise<PostOpPlanEntity> {
        const plan = await this.prisma.postOpPlan.update({
            where: { id },
            data: {
                ...(data.title !== undefined ? { title: data.title } : {}),
                ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
                ...(data.startDate ? { startDate: data.startDate } : {}),
                ...(data.endDate ? { endDate: data.endDate } : {}),
                ...(data.checkinIntervalDays !== undefined
                    ? { checkinIntervalDays: data.checkinIntervalDays }
                    : {}),
            },
            include: PLAN_INCLUDE,
        });
        // tenantId is in the where implicitly via the id+update; sanity check
        if (plan.tenantId !== tenantId) {
            throw new Error('PostOpPlan tenantId mismatch');
        }
        return toPlanEntity(plan);
    }

    async completePlan(tenantId: string, id: string): Promise<PostOpPlanEntity> {
        const plan = await this.prisma.postOpPlan.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
            include: PLAN_INCLUDE,
        });
        if (plan.tenantId !== tenantId) {
            throw new Error('PostOpPlan tenantId mismatch');
        }
        return toPlanEntity(plan);
    }

    async cancelPlan(
        tenantId: string,
        id: string,
        reason?: string,
    ): Promise<PostOpPlanEntity> {
        const plan = await this.prisma.postOpPlan.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: reason ?? null,
            },
            include: PLAN_INCLUDE,
        });
        if (plan.tenantId !== tenantId) {
            throw new Error('PostOpPlan tenantId mismatch');
        }
        return toPlanEntity(plan);
    }

    private buildWhere(
        tenantId: string,
        filter: ListPostOpPlansFilter,
    ): Prisma.PostOpPlanWhereInput {
        return {
            tenantId,
            ...(filter.status ? { status: filter.status } : {}),
            ...(filter.petId ? { petId: filter.petId } : {}),
            ...(filter.ownerId ? { ownerId: filter.ownerId } : {}),
            ...(filter.vetId ? { vetId: filter.vetId } : {}),
            ...(filter.surgeryId ? { surgeryId: filter.surgeryId } : {}),
            ...(filter.activeOnDate
                ? {
                      status: 'ACTIVE',
                      startDate: { lte: filter.activeOnDate },
                      endDate: { gte: filter.activeOnDate },
                  }
                : {}),
        };
    }
}

const CHECKIN_INCLUDE = {
    owner: { select: { id: true, firstName: true, lastName: true } },
    reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.PostOpCheckinInclude;

function toCheckinEntity(checkin: PostOpCheckin & {
    owner?: { id: string; firstName: string; lastName: string } | null;
    reviewedBy?: { id: string; firstName: string; lastName: string } | null;
}): PostOpCheckinEntity {
    return {
        ...checkin,
        owner: checkin.owner ?? undefined,
        reviewedBy: checkin.reviewedBy ?? undefined,
    };
}

@Injectable()
export class PrismaPostOpCheckinRepository implements IPostOpCheckinRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreatePostOpCheckinData): Promise<PostOpCheckinEntity> {
        const checkin = await this.prisma.postOpCheckin.create({
            data: {
                tenantId: data.tenantId,
                planId: data.planId,
                ownerId: data.ownerId,
                ownerNote: data.ownerNote ?? null,
                photoUrls: data.photoUrls ?? [],
                weightKg: data.weightKg ?? null,
                appetite: data.appetite ?? null,
                energyLevel: data.energyLevel ?? null,
                concernsFlag: data.concernsFlag ?? false,
            },
            include: CHECKIN_INCLUDE,
        });
        return toCheckinEntity(checkin);
    }

    async findOne(
        tenantId: string,
        id: string,
    ): Promise<PostOpCheckinEntity | null> {
        const checkin = await this.prisma.postOpCheckin.findFirst({
            where: { id, tenantId },
            include: CHECKIN_INCLUDE,
        });
        return checkin ? toCheckinEntity(checkin) : null;
    }

    async findByPlan(
        planId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpCheckinEntity[]; total: number }> {
        const [data, total] = await Promise.all([
            this.prisma.postOpCheckin.findMany({
                where: { planId },
                include: CHECKIN_INCLUDE,
                orderBy: { submittedAt: 'desc' },
                skip: pagination.skip,
                take: pagination.take,
            }),
            this.prisma.postOpCheckin.count({ where: { planId } }),
        ]);
        return { data: data.map(toCheckinEntity), total };
    }

    async review(
        tenantId: string,
        id: string,
        reviewerId: string,
        data: ReviewPostOpCheckinData,
    ): Promise<PostOpCheckinEntity> {
        const status = data.flagged ? 'FLAGGED' : 'REVIEWED';
        const checkin = await this.prisma.postOpCheckin.update({
            where: { id },
            data: {
                status,
                vetNote: data.vetNote ?? null,
                reviewedAt: new Date(),
                reviewedById: reviewerId,
            },
            include: CHECKIN_INCLUDE,
        });
        if (checkin.tenantId !== tenantId) {
            throw new Error('PostOpCheckin tenantId mismatch');
        }
        return toCheckinEntity(checkin);
    }
}
