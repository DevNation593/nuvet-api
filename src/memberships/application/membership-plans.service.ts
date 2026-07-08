import {
    ConflictException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    CreateMembershipPlanDto,
    UpdateMembershipPlanDto,
} from './dto/membership-plan.dto';
import {
    IMembershipPlanRepository,
    MEMBERSHIP_PLAN_REPOSITORY,
} from '../domain/membership.repository';

@Injectable()
export class MembershipPlansService {
    constructor(
        @Inject(MEMBERSHIP_PLAN_REPOSITORY)
        private readonly repo: IMembershipPlanRepository,
    ) {}

    /** Lee el catálogo (cliente o cualquiera). */
    async listCatalog(tenantId: string, onlyActive = true) {
        return this.repo.findCatalog(tenantId, { onlyActive });
    }

    async findOne(tenantId: string, id: string) {
        const plan = await this.repo.findOne(tenantId, id);
        if (!plan) throw new NotFoundException('Plan not found');
        return plan;
    }

    /** Crea un plan (CLINIC_ADMIN). */
    async create(tenantId: string, dto: CreateMembershipPlanDto) {
        const existing = await this.repo.findBySlug(tenantId, dto.slug);
        if (existing) throw new ConflictException(`Plan con slug "${dto.slug}" ya existe`);
        return this.repo.create({ ...dto, tenantId });
    }

    /** Modifica un plan. */
    async update(tenantId: string, id: string, dto: UpdateMembershipPlanDto) {
        await this.findOne(tenantId, id);
        return this.repo.update(tenantId, id, dto);
    }

    /** Soft delete (isActive=false). */
    async remove(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        await this.repo.delete(tenantId, id);
        return { ok: true };
    }
}
