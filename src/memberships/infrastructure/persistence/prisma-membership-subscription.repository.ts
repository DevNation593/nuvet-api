import { Injectable } from '@nestjs/common';
import { MembershipSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    CreateSubscriptionData,
    IMembershipSubscriptionRepository,
    MEMBERSHIP_SUBSCRIPTION_REPOSITORY,
} from '../../domain/membership.repository';

@Injectable()
export class PrismaMembershipSubscriptionRepository implements IMembershipSubscriptionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateSubscriptionData) {
        return this.prisma.membershipSubscription.create({
            data: {
                tenantId: data.tenantId,
                sourceTenantId: data.sourceTenantId,
                petId: data.petId,
                ownerId: data.ownerId,
                planId: data.planId,
                status: MembershipSubscriptionStatus.PENDING,
                currentPeriodStart: data.currentPeriodStart,
                currentPeriodEnd: data.currentPeriodEnd,
                nextBillingAt: data.nextBillingAt,
                autoRenew: data.autoRenew ?? true,
                paymentMethodToken: data.paymentMethodToken,
                providerKind: data.providerKind,
            },
        });
    }

    async findOneGlobal(id: string) {
        return this.prisma.membershipSubscription.findUnique({ where: { id } });
    }

    async findByOwner(
        ownerId: string,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ) {
        const where = { ownerId, ...(filter.status ? { status: filter.status } : {}) };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.membershipSubscription.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
                include: { plan: true, pet: { select: { id: true, name: true } } },
            }),
            this.prisma.membershipSubscription.count({ where }),
        ]);
        return { data, total };
    }

    async findByTenant(
        tenantId: string,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ) {
        const where = { tenantId, ...(filter.status ? { status: filter.status } : {}) };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.membershipSubscription.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
                include: { plan: true, pet: { select: { id: true, name: true } } },
            }),
            this.prisma.membershipSubscription.count({ where }),
        ]);
        return { data, total };
    }

    async findActiveForPetAndPlan(petId: string, planId: string) {
        return this.prisma.membershipSubscription.findFirst({
            where: {
                petId,
                planId,
                status: { in: ['PENDING', 'ACTIVE', 'PAUSED'] },
            },
        });
    }

    async updateStatus(
        id: string,
        status: MembershipSubscriptionStatus,
        extra: {
            canceledAt?: Date;
            cancelReason?: string;
            lastChargedAt?: Date;
            lastChargeTxId?: string;
            autoRenew?: boolean;
        },
    ) {
        return this.prisma.membershipSubscription.update({
            where: { id },
            data: {
                status,
                canceledAt: extra.canceledAt ?? undefined,
                cancelReason: extra.cancelReason ?? undefined,
                lastChargedAt: extra.lastChargedAt ?? undefined,
                lastChargeTxId: extra.lastChargeTxId ?? undefined,
                autoRenew: extra.autoRenew ?? undefined,
            },
        });
    }

    async advancePeriod(
        id: string,
        data: { currentPeriodStart: Date; currentPeriodEnd: Date; nextBillingAt: Date },
    ) {
        return this.prisma.membershipSubscription.update({
            where: { id },
            data,
        });
    }
}
