import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITenantRepository, UpdateTenantData, BillingConfigData, BillingConfigResult } from '../../domain/tenant.repository';

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOne(id: string): Promise<unknown | null> {
        const tenant = await (this.prisma.tenant as any).findUnique({
            where: { id },
            include: {
                _count: { select: { users: true, pets: true } },
                config: {
                    select: {
                        billingApiKey: true,
                        billingApiSecret: true,
                        billingEstablishmentCode: true,
                        billingEmissionPointCode: true,
                    },
                },
            },
        });
        if (!tenant) return null;

        const { config, ...rest } = tenant as any;
        return {
            ...rest,
            billingApiKey: config?.billingApiKey ?? null,
            billingEstablishmentCode: config?.billingEstablishmentCode ?? null,
            billingEmissionPointCode: config?.billingEmissionPointCode ?? null,
            hasBillingApiSecret: Boolean(config?.billingApiSecret),
        };
    }

    async findBillingConfig(id: string): Promise<BillingConfigResult | null> {
        const config = await (this.prisma as any).tenantConfig.findUnique({
            where: { tenantId: id },
            select: {
                billingApiKey: true,
                billingApiSecret: true,
                billingEstablishmentCode: true,
                billingEmissionPointCode: true,
            },
        });
        return config ?? null;
    }

    async upsertBillingConfig(tenantId: string, data: BillingConfigData): Promise<unknown> {
        const updateData: Record<string, unknown> = {};
        if (data.billingApiKey !== undefined) updateData.billingApiKey = data.billingApiKey;
        if (data.billingApiSecret !== undefined) updateData.billingApiSecret = data.billingApiSecret;
        if (data.billingEstablishmentCode !== undefined) updateData.billingEstablishmentCode = data.billingEstablishmentCode;
        if (data.billingEmissionPointCode !== undefined) updateData.billingEmissionPointCode = data.billingEmissionPointCode;

        const result = await (this.prisma as any).tenantConfig.upsert({
            where: { tenantId },
            create: { tenantId, ...updateData },
            update: updateData,
        });

        const { billingApiSecret, ...rest } = result;
        return { ...rest, hasBillingApiSecret: Boolean(billingApiSecret) };
    }

    async update(id: string, data: UpdateTenantData): Promise<unknown> {
        return this.prisma.tenant.update({ where: { id }, data });
    }
}
