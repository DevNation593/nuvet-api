import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IReportRepository,
    ClientSegmentationResult,
    ExecutiveKpisResult,
    AppointmentsReportResult,
    InventoryKardexResult,
    RestockSuggestionsResult,
    RevenueReportResult,
    TransactionsEvidenceResult,
    InventoryReportResult,
    PosDiscountUsageReportResult,
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
        const dateRange = { gte: new Date(from), lte: new Date(to + 'T23:59:59Z') };
        const where = {
            tenantId,
            status: OrderStatus.COMPLETED as any,
            createdAt: dateRange,
        };

        const [aggregate, orders] = await Promise.all([
            this.prisma.order.aggregate({
                where,
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.order.findMany({
                where,
                select: { total: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 500,
            }),
        ]);

        return {
            totalRevenue: aggregate._sum.total ?? 0,
            orderCount: aggregate._count,
            from,
            to,
            orders: orders.map((o) => ({ total: o.total, createdAt: o.createdAt })),
        };
    }

    async getInventoryReport(tenantId: string): Promise<InventoryReportResult> {
        const [totalProducts, allProducts, movements] = await Promise.all([
            this.prisma.product.count({ where: { tenantId, isActive: true } }),
            this.prisma.product.findMany({
                where: { tenantId, isActive: true },
                orderBy: [{ stock: 'asc' }, { updatedAt: 'asc' }],
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

        const lowStockAlerts = allProducts
            .filter((p) => p.stock <= p.lowStockThreshold)
            .slice(0, 100);

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

    async getTransactionsEvidence(
        tenantId: string,
        from: string,
        to: string,
        status?: string,
    ): Promise<TransactionsEvidenceResult> {
        const tickets = await this.prisma.posTicket.findMany({
            where: {
                tenantId,
                createdAt: { gte: new Date(from), lte: new Date(`${to}T23:59:59Z`) },
                ...(status ? { status: status as any } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                branch: { select: { id: true, name: true } },
                client: { select: { id: true, firstName: true, lastName: true, email: true } },
                payments: true,
                refunds: { select: { id: true, amount: true, reason: true, createdAt: true } },
            },
            take: 200,
        });

        const items = tickets.map((ticket) => ({
            id: ticket.id,
            status: ticket.status,
            total: ticket.total,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            branch: ticket.branch,
            client: ticket.client,
            invoice: {
                providerInvoiceId: ticket.providerInvoiceId,
                invoiceStatus: ticket.invoiceStatus,
                invoiceNumber: ticket.invoiceNumber,
                invoiceAccessKey: ticket.invoiceAccessKey,
                invoiceIssuedAt: ticket.invoiceIssuedAt,
                invoiceAuthorizedAt: ticket.invoiceAuthorizedAt,
            },
            evidences: {
                payments: ticket.payments,
                refunds: ticket.refunds,
                hasInvoiceEvidence: Boolean(ticket.providerInvoiceId || ticket.invoiceNumber),
            },
        }));

        return {
            from,
            to,
            total: items.length,
            items,
        };
    }

    async getPosDiscountUsageReport(
        tenantId: string,
        from: string,
        to: string,
        branchId?: string,
        discountId?: string,
    ): Promise<PosDiscountUsageReportResult> {
        const where: any = {
            tenantId,
            createdAt: {
                gte: new Date(from),
                lte: new Date(`${to}T23:59:59Z`),
            },
            posTicketId: { not: null },
            ...(discountId ? { discountId } : {}),
            ...(branchId ? { posTicket: { is: { branchId } } } : {}),
        };

        const usages = await this.prisma.discountUsage.findMany({
            where,
            include: {
                discount: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                posTicket: {
                    select: {
                        id: true,
                        branchId: true,
                        createdAt: true,
                        total: true,
                        subtotal: true,
                        discount: true,
                        status: true,
                        branch: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 1000,
        });

        const byDiscountMap = new Map<string, {
            discountId: string;
            discountName: string;
            usageCount: number;
            savedAmount: number;
        }>();

        for (const usage of usages) {
            const current = byDiscountMap.get(usage.discountId);
            if (!current) {
                byDiscountMap.set(usage.discountId, {
                    discountId: usage.discountId,
                    discountName: usage.discount.name,
                    usageCount: 1,
                    savedAmount: Number(usage.savedAmount ?? 0),
                });
                continue;
            }

            current.usageCount += 1;
            current.savedAmount += Number(usage.savedAmount ?? 0);
        }

        const totalSavedAmount = usages.reduce(
            (sum, usage) => sum + Number(usage.savedAmount ?? 0),
            0,
        );

        const items = usages.map((usage) => ({
            id: usage.id,
            createdAt: usage.createdAt,
            savedAmount: usage.savedAmount,
            discount: {
                id: usage.discount.id,
                name: usage.discount.name,
            },
            posTicket: usage.posTicket,
        }));

        return {
            from,
            to,
            branchId,
            discountId,
            totalUsages: usages.length,
            totalSavedAmount: Number(totalSavedAmount.toFixed(2)),
            byDiscount: Array.from(byDiscountMap.values())
                .map((entry) => ({
                    ...entry,
                    savedAmount: Number(entry.savedAmount.toFixed(2)),
                }))
                .sort((a, b) => b.savedAmount - a.savedAmount),
            items,
        };
    }

    async getInventoryKardex(
        tenantId: string,
        filters: { productId?: string; from?: string; to?: string },
    ): Promise<InventoryKardexResult> {
        const where: Record<string, unknown> = { tenantId };
        if (filters.productId) {
            where.productId = filters.productId;
        }
        if (filters.from || filters.to) {
            where.createdAt = {
                ...(filters.from ? { gte: new Date(filters.from) } : {}),
                ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59Z`) } : {}),
            };
        }

        const movements = await this.prisma.stockMovement.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: {
                product: { select: { id: true, name: true, sku: true } },
            },
            take: 2000,
        });

        const runningByProduct = new Map<string, number>();
        const entries = movements.map((movement) => {
            const current = runningByProduct.get(movement.productId) ?? 0;
            const delta = movement.type === 'IN'
                ? movement.quantity
                : movement.type === 'OUT'
                    ? -movement.quantity
                    : 0;
            const runningBalance = current + delta;
            runningByProduct.set(movement.productId, runningBalance);

            return {
                id: movement.id,
                createdAt: movement.createdAt,
                productId: movement.productId,
                productName: movement.product.name,
                sku: movement.product.sku,
                type: movement.type,
                quantity: movement.quantity,
                delta,
                reason: movement.reason,
                runningBalance,
            };
        });

        return {
            productId: filters.productId,
            totalMovements: entries.length,
            entries,
        };
    }

    async getRestockSuggestions(
        tenantId: string,
        lookbackDays: number,
    ): Promise<RestockSuggestionsResult> {
        const allActiveProducts = await this.prisma.product.findMany({
            where: { tenantId, isActive: true },
            select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                stock: true,
                lowStockThreshold: true,
            },
            orderBy: { stock: 'asc' },
        });

        const lowStockProducts = allActiveProducts
            .filter((p) => p.stock <= p.lowStockThreshold)
            .slice(0, 100);

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - lookbackDays);

        const soldItems = await this.prisma.posTicketItem.groupBy({
            by: ['productId'],
            where: {
                productId: { in: lowStockProducts.map((product) => product.id) },
                ticket: {
                    tenantId,
                    createdAt: { gte: fromDate },
                    status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
                },
            },
            _sum: { quantity: true },
        });

        const soldByProduct = soldItems.reduce<Record<string, number>>((acc, item) => {
            const productId = item.productId ?? '';
            if (!productId) return acc;
            acc[productId] = Number(item._sum.quantity ?? 0);
            return acc;
        }, {});

        const suggestions = lowStockProducts.map((product) => {
            const soldQty = soldByProduct[product.id] ?? 0;
            const avgDaily = soldQty / lookbackDays;
            const suggestedByDemand = Math.ceil(avgDaily * 14);
            const minimumBuffer = Math.max((product.lowStockThreshold * 2) - product.stock, 0);
            const suggestedQty = Math.max(suggestedByDemand, minimumBuffer, 1);

            return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                category: product.category,
                currentStock: product.stock,
                lowStockThreshold: product.lowStockThreshold,
                soldInLookback: soldQty,
                averageDailySales: Number(avgDaily.toFixed(2)),
                suggestedReorderQty: suggestedQty,
            };
        });

        return {
            lookbackDays,
            generatedAt: new Date().toISOString(),
            suggestions,
        };
    }

    async getClientSegmentation(
        tenantId: string,
        minFrequentPurchases: number,
        inactiveDays: number,
    ): Promise<ClientSegmentationResult> {
        const tickets = await this.prisma.posTicket.findMany({
            where: {
                tenantId,
                clientId: { not: null },
                status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
            },
            select: {
                clientId: true,
                total: true,
                createdAt: true,
                client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5000,
        });

        const byClient = new Map<string, {
            id: string;
            firstName: string;
            lastName: string;
            email: string | null;
            phone: string | null;
            purchases: number;
            totalSpent: number;
            lastPurchaseAt: Date;
        }>();

        for (const ticket of tickets) {
            if (!ticket.clientId || !ticket.client) continue;
            const current = byClient.get(ticket.clientId);
            if (!current) {
                byClient.set(ticket.clientId, {
                    id: ticket.client.id,
                    firstName: ticket.client.firstName,
                    lastName: ticket.client.lastName,
                    email: ticket.client.email,
                    phone: ticket.client.phone,
                    purchases: 1,
                    totalSpent: ticket.total,
                    lastPurchaseAt: ticket.createdAt,
                });
                continue;
            }

            current.purchases += 1;
            current.totalSpent += ticket.total;
            if (ticket.createdAt > current.lastPurchaseAt) {
                current.lastPurchaseAt = ticket.createdAt;
            }
        }

        const inactiveCutoff = new Date();
        inactiveCutoff.setDate(inactiveCutoff.getDate() - inactiveDays);

        const allClients = Array.from(byClient.values());
        const frequent = allClients
            .filter((client) => client.purchases >= minFrequentPurchases)
            .sort((a, b) => b.purchases - a.purchases)
            .slice(0, 100);

        const inactive = allClients
            .filter((client) => client.lastPurchaseAt < inactiveCutoff)
            .sort((a, b) => a.lastPurchaseAt.getTime() - b.lastPurchaseAt.getTime())
            .slice(0, 200);

        return {
            generatedAt: new Date().toISOString(),
            minFrequentPurchases,
            inactiveDays,
            frequent,
            inactive,
        };
    }

    async getExecutiveKpis(
        tenantId: string,
        from: string,
        to: string,
    ): Promise<ExecutiveKpisResult> {
        const range = { gte: new Date(from), lte: new Date(`${to}T23:59:59Z`) };
        const ticketWhere = {
            tenantId,
            createdAt: range,
            status: { in: ['COMPLETED', 'PARTIAL_REFUND', 'REFUNDED'] as any },
        };

        const [salesAggregate, byBranchRaw, topClientsRaw, repurchaseRaw, appointments, paymentMethodRaw] = await Promise.all([
            this.prisma.posTicket.aggregate({
                where: ticketWhere,
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.posTicket.groupBy({
                by: ['branchId'],
                where: ticketWhere,
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.posTicket.groupBy({
                by: ['clientId'],
                where: { ...ticketWhere, clientId: { not: null } },
                _sum: { total: true },
                _count: true,
                orderBy: { _sum: { total: 'desc' } },
                take: 10,
            }),
            this.prisma.posTicket.groupBy({
                by: ['clientId'],
                where: { ...ticketWhere, clientId: { not: null } },
                _count: true,
            }),
            this.prisma.appointment.findMany({
                where: {
                    tenantId,
                    scheduledAt: range,
                    status: 'COMPLETED' as any,
                },
                select: {
                    vetId: true,
                    groomerId: true,
                    vet: { select: { firstName: true, lastName: true } },
                    groomer: { select: { firstName: true, lastName: true } },
                },
            }),
            this.prisma.posPayment.groupBy({
                by: ['method'],
                where: { ticket: ticketWhere },
                _sum: { amount: true },
                _count: true,
            }),
        ]);

        const totalSales = salesAggregate._sum.total ?? 0;
        const totalTickets = salesAggregate._count;
        const averageTicket = totalTickets > 0 ? totalSales / totalTickets : 0;

        const uniqueClients = repurchaseRaw.length;
        const repurchaseClients = repurchaseRaw.filter((r) => r._count >= 2).length;
        const repurchaseRate = uniqueClients > 0
            ? Number(((repurchaseClients / uniqueClients) * 100).toFixed(2))
            : 0;

        const topClientIds = topClientsRaw.map((c) => c.clientId).filter(Boolean) as string[];
        const clientDetails = topClientIds.length > 0
            ? await this.prisma.user.findMany({
                where: { id: { in: topClientIds } },
                select: { id: true, firstName: true, lastName: true },
            })
            : [];
        const clientMap = new Map(clientDetails.map((c) => [c.id, c]));

        const topClients = topClientsRaw
            .filter((c) => c.clientId)
            .map((c) => {
                const client = clientMap.get(c.clientId!);
                return {
                    clientId: c.clientId!,
                    name: client ? `${client.firstName} ${client.lastName}`.trim() : 'Desconocido',
                    total: c._sum.total ?? 0,
                    purchases: c._count,
                };
            });

        const branchIds = byBranchRaw.map((b) => b.branchId).filter(Boolean) as string[];
        const branchDetails = branchIds.length > 0
            ? await this.prisma.branch.findMany({
                where: { id: { in: branchIds } },
                select: { id: true, name: true },
            })
            : [];
        const branchMap = new Map(branchDetails.map((b) => [b.id, b]));

        const byBranch = byBranchRaw
            .map((b) => {
                const branch = b.branchId ? branchMap.get(b.branchId) : null;
                const tickets = b._count;
                const total = b._sum.total ?? 0;
                return {
                    branchId: b.branchId,
                    branchName: branch?.name ?? 'Sin sucursal',
                    tickets,
                    total,
                    averageTicket: tickets > 0 ? Number((total / tickets).toFixed(2)) : 0,
                };
            })
            .sort((a, b) => b.total - a.total);

        const byProfessionalMap = new Map<string, { professionalId: string; name: string; appointments: number }>();
        for (const appointment of appointments) {
            const professionalId = appointment.vetId ?? appointment.groomerId;
            const professional = appointment.vet ?? appointment.groomer;
            if (!professionalId || !professional) continue;

            const current = byProfessionalMap.get(professionalId);
            if (!current) {
                byProfessionalMap.set(professionalId, {
                    professionalId,
                    name: `${professional.firstName} ${professional.lastName}`.trim(),
                    appointments: 1,
                });
            } else {
                current.appointments += 1;
            }
        }

        const byProfessional = Array.from(byProfessionalMap.values())
            .sort((a, b) => b.appointments - a.appointments);

        const byPaymentMethod = paymentMethodRaw.map((pm) => ({
            method: pm.method,
            total: Number((pm._sum.amount ?? 0).toFixed(2)),
            count: pm._count,
        }));

        return {
            from,
            to,
            sales: {
                total: Number(totalSales.toFixed(2)),
                averageTicket: Number(averageTicket.toFixed(2)),
                totalTickets,
                repurchaseRate,
            },
            topClients,
            byBranch,
            byProfessional,
            byPaymentMethod,
        };
    }
}
