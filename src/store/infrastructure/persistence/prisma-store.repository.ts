import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IStoreRepository,
    ProductData,
    CreateProductData,
    StockAdjustmentData,
    CreateOrderData,
    DiscountUsageRecord,
} from '../../domain/store.repository';
import { OrderStatus } from '@nuvet/types';

@Injectable()
export class PrismaStoreRepository implements IStoreRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAllProducts(
        tenantId: string,
        skip: number,
        take: number,
        category?: string,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId, isActive: true, ...(category ? { category } : {}) };
        const [data, total] = await Promise.all([
            this.prisma.product.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
            this.prisma.product.count({ where }),
        ]);
        return { data, total };
    }

    async findProductById(tenantId: string, id: string): Promise<ProductData | null> {
        return this.prisma.product.findFirst({
            where: { id, tenantId },
        }) as Promise<ProductData | null>;
    }

    async findProductBySku(tenantId: string, sku: string): Promise<ProductData | null> {
        return this.prisma.product.findFirst({
            where: { tenantId, sku },
        }) as Promise<ProductData | null>;
    }

    async findProductsByIds(tenantId: string, ids: string[]): Promise<ProductData[]> {
        return this.prisma.product.findMany({
            where: { id: { in: ids }, tenantId, isActive: true },
        }) as Promise<ProductData[]>;
    }

    async createProduct(data: CreateProductData): Promise<unknown> {
        return this.prisma.product.create({ data: data as any });
    }

    async updateProduct(id: string, data: Record<string, unknown>): Promise<unknown> {
        return this.prisma.product.update({ where: { id }, data: data as any });
    }

    async deactivateProduct(id: string): Promise<unknown> {
        return this.prisma.product.update({ where: { id }, data: { isActive: false } });
    }

    async adjustStock(data: StockAdjustmentData, newStock: number): Promise<unknown> {
        const [updated] = await this.prisma.$transaction([
            this.prisma.product.update({
                where: { id: data.productId },
                data: { stock: newStock },
            }),
            this.prisma.stockMovement.create({
                data: {
                    tenantId: data.tenantId,
                    productId: data.productId,
                    type: data.type as any,
                    quantity: data.quantity,
                    reason: data.reason,
                    userId: data.userId,
                },
            }),
        ]);
        return updated;
    }

    async getLowStockProducts(tenantId: string): Promise<ProductData[]> {
        const products = await this.prisma.product.findMany({
            where: { tenantId, isActive: true },
            orderBy: { stock: 'asc' },
        });
        return (products as unknown as ProductData[]).filter(
            (p) => p.stock <= p.lowStockThreshold,
        );
    }

    async findAllOrders(
        tenantId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { product: { select: { id: true, name: true } } } },
                    client: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.order.count({ where }),
        ]);
        return { data, total };
    }

    async findClientOrders(
        tenantId: string,
        clientId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId, clientId };
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { product: { select: { id: true, name: true } } } },
                    client: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.order.count({ where }),
        ]);
        return { data, total };
    }

    async createOrderWithItems(
        data: CreateOrderData,
        discountUsages: DiscountUsageRecord[],
        discountIdsToIncrement: string[],
    ): Promise<unknown> {
        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    tenantId: data.tenantId,
                    clientId: data.clientId,
                    subtotal: data.subtotal,
                    discount: data.discount,
                    tax: data.tax,
                    total: data.total,
                    notes: data.notes,
                    items: { create: data.items },
                },
                include: { items: true },
            });

            if (discountUsages.length > 0) {
                await tx.discountUsage.createMany({ data: discountUsages.map((u) => ({ ...u, orderId: order.id })) });
                await tx.discount.updateMany({
                    where: { id: { in: discountIdsToIncrement } },
                    data: { usedCount: { increment: 1 } },
                });
            }

            for (const item of data.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } },
                });
            }

            return order;
        });
    }

    async updateOrderStatus(tenantId: string, id: string, status: OrderStatus): Promise<unknown> {
        return this.prisma.order.update({
            where: { id },
            data: { status: status as any },
        });
    }

    async findOrderById(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.order.findFirst({ where: { id, tenantId } });
    }
}
