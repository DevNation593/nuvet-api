import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatus, AppointmentType, OrderStatus } from '@nuvet/types';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getAppointmentsReport(tenantId: string, from: string, to: string, vetId?: string, type?: AppointmentType) {
        const where: Record<string, unknown> = {
            tenantId,
            scheduledAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
            ...(vetId && { vetId }),
            ...(type && { type }),
        };

        const [total, byStatus, byType] = await Promise.all([
            this.prisma.appointment.count({ where }),
            this.prisma.appointment.groupBy({ by: ['status'], where, _count: true }),
            this.prisma.appointment.groupBy({ by: ['type'], where, _count: true }),
        ]);

        return { total, byStatus, byType, from, to };
    }

    async getRevenueReport(tenantId: string, from: string, to: string) {
        const orders = await this.prisma.order.findMany({
            where: {
                tenantId,
                status: OrderStatus.COMPLETED,
                createdAt: { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') },
            },
            select: { total: true, createdAt: true },
        });

        const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
        return { totalRevenue, orderCount: orders.length, from, to, orders };
    }

    async getInventoryReport(tenantId: string) {
        const [products, lowStock, movements] = await Promise.all([
            this.prisma.product.count({ where: { tenantId, isActive: true } }),
            this.prisma.product.findMany({
                where: { tenantId, isActive: true },
                orderBy: { stock: 'asc' },
                take: 20,
                select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
            }),
            this.prisma.stockMovement.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 50,
                include: { product: { select: { name: true, sku: true } } },
            }),
        ]);

        const alerts = lowStock.filter((p) => p.stock <= p.lowStockThreshold);
        return { totalProducts: products, lowStockAlerts: alerts, recentMovements: movements };
    }

    async getUpcomingVaccinations(tenantId: string, daysAhead = 30) {
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);
        const upcoming = await this.prisma.vaccination.findMany({
            where: { tenantId, nextDueAt: { lte: until, gte: new Date() } },
            include: {
                pet: {
                    select: {
                        id: true, name: true, species: true,
                        owner: { select: { firstName: true, lastName: true, email: true, phone: true } },
                    },
                },
                vet: { select: { firstName: true, lastName: true } },
            },
            orderBy: { nextDueAt: 'asc' },
        });
        return { count: upcoming.length, daysAhead, upcoming };
    }

    async getExpiringStock(tenantId: string, daysAhead = 30) {
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);
        const today = new Date();

        const batches = await this.prisma.productBatch.findMany({
            where: {
                tenantId,
                expiryDate: { gte: today, lte: until },
            },
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
