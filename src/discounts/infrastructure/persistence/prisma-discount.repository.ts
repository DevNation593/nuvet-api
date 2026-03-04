import { Injectable } from '@nestjs/common';
import { DiscountTargetType } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { IDiscountRepository, CreateDiscountData } from '../../domain/discount.repository';

@Injectable()
export class PrismaDiscountRepository implements IDiscountRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number },
        onlyActive?: boolean,
    ): Promise<{ data: unknown[]; total: number }> {
        const where: any = {
            tenantId,
            ...(onlyActive !== undefined ? { isActive: onlyActive } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.discount.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.discount.count({ where }),
        ]);
        return { data, total };
    }

    async findAllActive(tenantId: string, now: Date): Promise<unknown[]> {
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
            orderBy: { startAt: 'asc' },
        });
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.discount.findFirst({
            where: { id, tenantId },
            include: {
                orderItems: { orderBy: { createdAt: 'desc' }, take: 10 },
            },
        });
    }

    async findByName(tenantId: string, name: string): Promise<unknown | null> {
        return this.prisma.discount.findFirst({
            where: { tenantId, name, isActive: true },
        });
    }

    async findApplicableProductDiscounts(
        tenantId: string,
        productId: string,
        category: string,
        lineTotal: number,
        now: Date,
    ): Promise<unknown[]> {
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: [
                    {
                        OR: [
                            { targetType: DiscountTargetType.ALL_PRODUCTS },
                            { targetType: DiscountTargetType.PRODUCT, targetId: productId },
                            { targetType: DiscountTargetType.PRODUCT_CATEGORY, category },
                        ],
                    },
                    {
                        OR: [
                            { minAmount: null },
                            { minAmount: { lte: lineTotal } },
                        ],
                    },
                ],
            },
        });
    }

    async findActiveServiceDiscounts(
        tenantId: string,
        serviceType: string,
        now: Date,
    ): Promise<unknown[]> {
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: [
                    {
                        OR: [
                            { targetType: DiscountTargetType.ALL_SERVICES },
                            { targetType: DiscountTargetType.SERVICE, serviceType },
                        ],
                    },
                ],
            },
        });
    }

    async create(data: CreateDiscountData): Promise<unknown> {
        return this.prisma.discount.create({ data });
    }

    async update(id: string, data: Partial<Omit<CreateDiscountData, 'tenantId'>>): Promise<unknown> {
        return this.prisma.discount.update({ where: { id }, data });
    }

    async softDelete(id: string): Promise<unknown> {
        return this.prisma.discount.update({ where: { id }, data: { isActive: false } });
    }
}
