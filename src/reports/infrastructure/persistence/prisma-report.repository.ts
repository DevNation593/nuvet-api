import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IReportRepository,
    AppointmentsReportResult,
    RevenueReportResult,
    InventoryReportResult,
    UpcomingVaccinationsResult,
    ExpiringStockResult,
} from '../../domain/report.repository';
import { AppointmentType, OrderStatus } from '@nuvet/types';

@Injectable()
export class PrismaReportRepository implements IReportRepository {
    constructor(private readonly prisma: PrismaService) {}

    async getAppointmentsReport(
        tenantId: string,
        from: string,
        to: string,
        vetId?: string,
        type?: AppointmentType,
    ): Promise<AppointmentsReportResult> {
        const where: Record<string, unknown> = {
            tenantId,
            scheduledAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
            ...(vetId && { vetId }),
            ...(type && { type }),
        };

        const [total, byStatusRaw, byTypeRaw] = await Promise.all([
            this.prisma.appointment.count({ where }),
            this.prisma.appointment.groupBy({ by: ['status'], where, _count: true }),
            this.prisma.appointment.groupBy({ by: ['type'], where, _count: true }),
        ]);

        const byStatus = (byStatusRaw as any[]).map((r) => ({
            status: r.status as string,
            _count: r._count as number,
        }));

        const byType = (byTypeRaw as any[]).map((r) => ({
            type: r.type as string,
            _count: r._count as number,
        }));

        return { total, byStatus, byType, from, to };
    }

    async getRevenueReport(
        tenantId: string,
        from: string,
        to: string,
    ): Promise<RevenueReportResult> {
        const orders = await this.prisma.order.findMany({
            where: {
                tenantId,
                status: OrderStatus.COMPLETED as any,
                createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
            },
            select: { total: true, createdAt: true },
        });

        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        return {
            totalRevenue,
            orderCount: orders.length,
            from,
            to,
            orders: orders.map((o) => ({ total: o.total, createdAt: o.createdAt })),
        };
    }

    async getInventoryReport(tenantId: string): Promise<InventoryReportResult> {
        const [totalProducts, lowStock, movements] = await Promise.all([
            this.prisma.product.count({ where: { tenantId, isActive: true } }),
            this.prisma.product.findMany({
                where: { tenantId, isActive: true },
                orderBy: { stock: 'asc' },
                take: 20,
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    stock: true,
                    lowStockThreshold: true,
                },
            }),
            this.prisma.stockMovement.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: { product: { select: { name: true, sku: true } } },
            }),
        ]);

        const lowStockAlerts = (lowStock as any[]).filter(
            (p) => p.stock <= p.lowStockThreshold,
        );

        return {
            totalProducts,
            lowStockAlerts,
            recentMovements: movements,
        };
    }

    async getUpcomingVaccinations(
        tenantId: string,
        daysAhead: number,
    ): Promise<UpcomingVaccinationsResult> {
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);

        const upcoming = await this.prisma.vaccination.findMany({
            where: { tenantId, nextDueAt: { lte: until, gte: new Date() } },
            include: {
                pet: {
                    select: {
                        id: true,
                        name: true,
                        species: true,
                        owner: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
                vet: { select: { firstName: true, lastName: true } },
            },
            orderBy: { nextDueAt: 'asc' },
        });

        return { count: upcoming.length, daysAhead, upcoming };
    }

    async getExpiringStock(
        tenantId: string,
        daysAhead: number,
    ): Promise<ExpiringStockResult> {
        const today = new Date();
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);

        const batches = await this.prisma.productBatch.findMany({
            where: { tenantId, expiryDate: { gte: today, lte: until } },
            orderBy: { expiryDate: 'asc' },
            include: {
                product: {
                    select: { id: true, name: true, sku: true, category: true },
                },
            },
        });

        return { count: batches.length, daysAhead, batches };
    }
}
