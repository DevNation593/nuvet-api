import type { PostOpCheckinStatus, PostOpPlanStatus } from '@prisma/client';

/**
 * Domain layer del módulo `postop` (Fase 3 · Slice 3).
 *
 * Seguimiento postoperatorio: el vet crea un plan para la mascota
 * (típicamente después de una cirugía), define un período de
 * recuperación y un intervalo de checkins. El dueño sube checkins
 * con fotos/notas; el vet revisa y deja comentarios o marca
 * preocupaciones clínicas.
 */

export interface PostOpPlanEntity {
    id: string;
    tenantId: string;
    petId: string;
    ownerId: string;
    surgeryId: string | null;
    vetId: string;
    title: string;
    instructions: string;
    startDate: Date;
    endDate: Date;
    checkinIntervalDays: number;
    status: PostOpPlanStatus;
    completedAt: Date | null;
    cancelledAt: Date | null;
    cancelReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    /** JOINs opcionales para UI. */
    pet?: { id: string; name: string; species: string };
    owner?: { id: string; firstName: string; lastName: string; email: string };
    vet?: { id: string; firstName: string; lastName: string };
    checkins?: PostOpCheckinEntity[];
}

export interface PostOpCheckinEntity {
    id: string;
    tenantId: string;
    planId: string;
    ownerId: string;
    submittedAt: Date;
    ownerNote: string | null;
    photoUrls: string[];
    weightKg: number | null;
    appetite: string | null;
    energyLevel: string | null;
    concernsFlag: boolean;
    vetNote: string | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    status: PostOpCheckinStatus;
    createdAt: Date;
    updatedAt: Date;
    /** JOINs opcionales para UI. */
    owner?: { id: string; firstName: string; lastName: string };
    reviewedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface CreatePostOpPlanData {
    tenantId: string;
    petId: string;
    ownerId: string;
    surgeryId?: string;
    vetId: string;
    title: string;
    instructions: string;
    startDate: Date;
    endDate: Date;
    checkinIntervalDays?: number;
}

export interface UpdatePostOpPlanData {
    title?: string;
    instructions?: string;
    startDate?: Date;
    endDate?: Date;
    checkinIntervalDays?: number;
}

export interface ListPostOpPlansFilter {
    status?: PostOpPlanStatus;
    petId?: string;
    ownerId?: string;
    vetId?: string;
    surgeryId?: string;
    activeOnDate?: Date;
}

export interface CreatePostOpCheckinData {
    tenantId: string;
    planId: string;
    ownerId: string;
    ownerNote?: string;
    photoUrls?: string[];
    weightKg?: number;
    appetite?: string;
    energyLevel?: string;
    concernsFlag?: boolean;
}

export interface ReviewPostOpCheckinData {
    vetNote?: string;
    flagged?: boolean;
}

export interface IPostOpPlanRepository {
    createPlan(data: CreatePostOpPlanData): Promise<PostOpPlanEntity>;
    findOnePlan(
        tenantId: string,
        id: string,
        withCheckins?: boolean,
    ): Promise<PostOpPlanEntity | null>;
    findPlansByTenant(
        tenantId: string,
        filter: ListPostOpPlansFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpPlanEntity[]; total: number }>;
    findPlansByOwner(
        ownerId: string,
        filter: ListPostOpPlansFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpPlanEntity[]; total: number }>;
    updatePlan(
        tenantId: string,
        id: string,
        data: UpdatePostOpPlanData,
    ): Promise<PostOpPlanEntity>;
    completePlan(tenantId: string, id: string): Promise<PostOpPlanEntity>;
    cancelPlan(
        tenantId: string,
        id: string,
        reason?: string,
    ): Promise<PostOpPlanEntity>;
}

export interface IPostOpCheckinRepository {
    create(data: CreatePostOpCheckinData): Promise<PostOpCheckinEntity>;
    findOne(
        tenantId: string,
        id: string,
    ): Promise<PostOpCheckinEntity | null>;
    findByPlan(
        planId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: PostOpCheckinEntity[]; total: number }>;
    review(
        tenantId: string,
        id: string,
        reviewerId: string,
        data: ReviewPostOpCheckinData,
    ): Promise<PostOpCheckinEntity>;
}

export const POSTOP_PLAN_REPOSITORY = Symbol('IPostOpPlanRepository');
export const POSTOP_CHECKIN_REPOSITORY = Symbol('IPostOpCheckinRepository');
