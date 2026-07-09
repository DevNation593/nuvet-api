import { Injectable } from '@nestjs/common';
import { MembershipBillingPeriod, PetSpecies } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    CreatePlanData,
    IMembershipPlanRepository,
    MEMBERSHIP_PLAN_REPOSITORY,
    UpdatePlanData,
} from '../../domain/membership.repository';

@Injectable()
export class PrismaMembershipPlanRepository implements IMembershipPlanRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreatePlanData) {
        return this.prisma.membershipPlan.create({
            data: {
                tenantId: data.tenantId,
                slug: data.slug,
                name: data.name,
                description: data.description ?? null,
                priceCents: data.priceCents,
                currency: data.currency ?? 'USD',
                billingPeriod: data.billingPeriod ?? MembershipBillingPeriod.MONTHLY,
                includedBenefits: data.includedBenefits ?? [],
                applicableSpecies: (data.applicableSpecies ?? []) as PetSpecies[],
                isActive: data.isActive ?? true,
                displayOrder: data.displayOrder ?? 0,
            },
        });
    }

    async findOne(tenantId: string, id: string) {
        return this.prisma.membershipPlan.findFirst({ where: { tenantId, id } });
    }

    async findBySlug(tenantId: string, slug: string) {
        return this.prisma.membershipPlan.findFirst({ where: { tenantId, slug } });
    }

    async findCatalog(tenantId: string, options: { onlyActive?: boolean }) {
        return this.prisma.membershipPlan.findMany({
            where: {
                tenantId,
                ...(options.onlyActive ? { isActive: true } : {}),
            },
            orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
        });
    }

    async update(tenantId: string, id: string, data: UpdatePlanData) {
        const { applicableSpecies, ...rest } = data;
        return this.prisma.membershipPlan.update({
            where: { id },
            data: {
                ...rest,
                ...(applicableSpecies
                    ? { applicableSpecies: applicableSpecies as PetSpecies[] }
                    : {}),
            },
        });
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await this.prisma.membershipPlan.update({
            where: { id },
            data: { isActive: false },
        });
        void tenantId;
    }
}
