import {
    BadRequestException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreatePostOpCheckinData,
    CreatePostOpPlanData,
    IPostOpCheckinRepository,
    IPostOpPlanRepository,
    ListPostOpPlansFilter,
    POSTOP_CHECKIN_REPOSITORY,
    POSTOP_PLAN_REPOSITORY,
} from '../domain/postop.repository';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface ActorContext {
    userId: string;
    role: string;
    /** Si el actor es dueño, este set restringe a sus propias mascotas/planes. */
    ownerScope?: string;
}

@Injectable()
export class PostOpService {
    constructor(
        @Inject(POSTOP_PLAN_REPOSITORY)
        private readonly planRepo: IPostOpPlanRepository,
        @Inject(POSTOP_CHECKIN_REPOSITORY)
        private readonly checkinRepo: IPostOpCheckinRepository,
    ) {}

    async createPlan(tenantId: string, data: CreatePostOpPlanData) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            throw new BadRequestException('Fechas inválidas');
        }
        if (end.getTime() <= start.getTime()) {
            throw new BadRequestException(
                'endDate debe ser estrictamente posterior a startDate',
            );
        }
        return this.planRepo.createPlan({
            ...data,
            startDate: start,
            endDate: end,
        });
    }

    async findOnePlan(tenantId: string, id: string, actor: ActorContext, withCheckins = false) {
        const plan = await this.planRepo.findOnePlan(tenantId, id, withCheckins);
        if (!plan) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        this.assertCanRead(plan, actor);
        return plan;
    }

    async listByTenant(
        tenantId: string,
        filter: ListPostOpPlansFilter,
        page: number = DEFAULT_PAGE,
        pageSize: number = DEFAULT_PAGE_SIZE,
    ) {
        const safePage = Math.max(1, page);
        const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return this.planRepo.findPlansByTenant(tenantId, filter, {
            skip: (safePage - 1) * safePageSize,
            take: safePageSize,
        });
    }

    async listByOwner(
        ownerId: string,
        filter: ListPostOpPlansFilter,
        page: number = DEFAULT_PAGE,
        pageSize: number = DEFAULT_PAGE_SIZE,
    ) {
        const safePage = Math.max(1, page);
        const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return this.planRepo.findPlansByOwner(ownerId, filter, {
            skip: (safePage - 1) * safePageSize,
            take: safePageSize,
        });
    }

    async updatePlan(tenantId: string, id: string, data: Partial<CreatePostOpPlanData>) {
        const existing = await this.planRepo.findOnePlan(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
            throw new BadRequestException(
                `No se puede editar un plan en estado ${existing.status}`,
            );
        }
        const patch: Parameters<IPostOpPlanRepository['updatePlan']>[2] = {};
        if (data.title !== undefined) patch.title = data.title;
        if (data.instructions !== undefined) patch.instructions = data.instructions;
        if (data.startDate) patch.startDate = new Date(data.startDate);
        if (data.endDate) patch.endDate = new Date(data.endDate);
        if (data.checkinIntervalDays !== undefined) {
            patch.checkinIntervalDays = data.checkinIntervalDays;
        }
        if (patch.startDate && patch.endDate && patch.endDate <= patch.startDate) {
            throw new BadRequestException(
                'endDate debe ser estrictamente posterior a startDate',
            );
        }
        return this.planRepo.updatePlan(tenantId, id, patch);
    }

    async completePlan(tenantId: string, id: string) {
        const existing = await this.planRepo.findOnePlan(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        if (existing.status === 'COMPLETED') {
            return existing;
        }
        if (existing.status === 'CANCELLED') {
            throw new BadRequestException('No se puede completar un plan cancelado');
        }
        return this.planRepo.completePlan(tenantId, id);
    }

    async cancelPlan(tenantId: string, id: string, reason?: string) {
        const existing = await this.planRepo.findOnePlan(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        if (existing.status === 'CANCELLED') {
            return existing;
        }
        if (existing.status === 'COMPLETED') {
            throw new BadRequestException('No se puede cancelar un plan ya completado');
        }
        return this.planRepo.cancelPlan(tenantId, id, reason);
    }

    async createCheckin(
        tenantId: string,
        planId: string,
        actor: ActorContext,
        data: Omit<CreatePostOpCheckinData, 'tenantId' | 'planId' | 'ownerId'>,
    ) {
        const plan = await this.planRepo.findOnePlan(tenantId, planId);
        if (!plan) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        if (actor.role === 'CLIENT' && plan.ownerId !== actor.userId) {
            throw new ForbiddenException('No autorizado para este plan');
        }
        if (plan.status !== 'ACTIVE') {
            throw new BadRequestException(
                `No se pueden agregar checkins a un plan ${plan.status}`,
            );
        }
        // Si marcó preocupación o subió fotos, el checkin es al menos SUBMITTED
        return this.checkinRepo.create({
            tenantId,
            planId,
            ownerId: plan.ownerId,
            ...data,
            photoUrls: data.photoUrls ?? [],
            concernsFlag: data.concernsFlag ?? false,
        });
    }

    async listCheckins(tenantId: string, planId: string, actor: ActorContext, page = 1, pageSize = 20) {
        const plan = await this.planRepo.findOnePlan(tenantId, planId);
        if (!plan) {
            throw new NotFoundException('Plan postoperatorio no encontrado');
        }
        if (actor.role === 'CLIENT' && plan.ownerId !== actor.userId) {
            throw new ForbiddenException('No autorizado para este plan');
        }
        const safePage = Math.max(1, page);
        const safePageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, pageSize));
        return this.checkinRepo.findByPlan(planId, {
            skip: (safePage - 1) * safePageSize,
            take: safePageSize,
        });
    }

    async reviewCheckin(
        tenantId: string,
        checkinId: string,
        reviewerId: string,
        actor: ActorContext,
        data: { vetNote?: string; flagged?: boolean },
    ) {
        if (actor.role === 'CLIENT') {
            throw new ForbiddenException('Solo el staff puede revisar checkins');
        }
        const checkin = await this.checkinRepo.findOne(tenantId, checkinId);
        if (!checkin) {
            throw new NotFoundException('Checkin no encontrado');
        }
        return this.checkinRepo.review(tenantId, checkinId, reviewerId, data);
    }

    private assertCanRead(plan: { ownerId: string }, actor: ActorContext): void {
        if (actor.role === 'CLIENT' && plan.ownerId !== actor.userId) {
            throw new ForbiddenException('No autorizado para este plan');
        }
    }
}
