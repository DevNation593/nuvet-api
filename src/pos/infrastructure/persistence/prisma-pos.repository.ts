import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IPosRepository,
    CreateRegisterData,
    CloseRegisterData,
    CreateTicketData,
    TicketFilterParams,
    AddItemData,
    AddPaymentData,
    CreateRefundData,
    TicketTotals,
} from '../../domain/pos.repository';
import { CashRegisterStatus, PosTicketStatus } from '@nuvet/types';

@Injectable()
export class PrismaPosRepository implements IPosRepository {
    constructor(private readonly prisma: PrismaService) {}

    // ── Register ──────────────────────────────────────────────────────────────

    async createRegister(data: CreateRegisterData): Promise<unknown> {
        return this.prisma.cashRegister.create({
            data: {
                tenantId: data.tenantId,
                branchId: data.branchId,
                openedById: data.openedById,
                openingBalance: data.openingBalance,
                notes: data.notes,
                status: CashRegisterStatus.OPEN as any,
            },
            include: {
                openedBy: { select: { id: true, firstName: true, lastName: true } },
                branch: { select: { id: true, name: true } },
            },
        });
    }

    async findRegisterById(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.cashRegister.findFirst({
            where: { id, tenantId },
            include: {
                openedBy: { select: { id: true, firstName: true, lastName: true } },
                closedBy: { select: { id: true, firstName: true, lastName: true } },
                branch: { select: { id: true, name: true } },
            },
        });
    }

    async findOpenRegister(tenantId: string, branchId?: string): Promise<unknown | null> {
        return this.prisma.cashRegister.findFirst({
            where: {
                tenantId,
                status: CashRegisterStatus.OPEN as any,
                ...(branchId ? { branchId } : {}),
            },
            include: {
                openedBy: { select: { id: true, firstName: true, lastName: true } },
                branch: { select: { id: true, name: true } },
            },
        });
    }

    async findAllRegisters(
        tenantId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId };
        const [data, total] = await Promise.all([
            this.prisma.cashRegister.findMany({
                where,
                skip,
                take,
                orderBy: { openedAt: 'desc' },
                include: {
                    openedBy: { select: { id: true, firstName: true, lastName: true } },
                    closedBy: { select: { id: true, firstName: true, lastName: true } },
                    branch: { select: { id: true, name: true } },
                },
            }),
            this.prisma.cashRegister.count({ where }),
        ]);
        return { data, total };
    }

    async closeRegister(id: string, data: CloseRegisterData): Promise<unknown> {
        return this.prisma.cashRegister.update({
            where: { id },
            data: {
                status: data.status as any,
                closingBalance: data.closingBalance,
                closedAt: data.closedAt,
                closedById: data.closedById,
                notes: data.notes,
            },
        });
    }

    // ── Tickets ───────────────────────────────────────────────────────────────

    async createTicket(data: CreateTicketData): Promise<unknown> {
        return this.prisma.posTicket.create({
            data: {
                tenantId: data.tenantId,
                branchId: data.branchId,
                registerId: data.registerId,
                clientId: data.clientId,
                notes: data.notes,
                createdById: data.createdById,
                subtotal: 0,
                discount: 0,
                tax: 0,
                total: 0,
                status: PosTicketStatus.OPEN as any,
            },
            include: {
                client: { select: { id: true, firstName: true, lastName: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                register: { select: { id: true, openedAt: true } },
            },
        });
    }

    async findTicketById(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.posTicket.findFirst({
            where: { id, tenantId },
            include: {
                items: true,
                payments: true,
                refunds: true,
                client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                register: { select: { id: true, openedAt: true } },
                branch: { select: { id: true, name: true } },
            },
        });
    }

    async findAllTickets(
        tenantId: string,
        filter: TicketFilterParams,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }> {
        const where: Record<string, unknown> = { tenantId };
        if (filter.status) where.status = filter.status;
        if (filter.clientId) where.clientId = filter.clientId;
        if (filter.registerId) where.registerId = filter.registerId;
        if (filter.dateFrom || filter.dateTo) {
            where.createdAt = {
                ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
                ...(filter.dateTo ? { lte: new Date(filter.dateTo + 'T23:59:59.999Z') } : {}),
            };
        }

        const [data, total] = await Promise.all([
            this.prisma.posTicket.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { select: { id: true, type: true, description: true, quantity: true, total: true } },
                    payments: { select: { method: true, amount: true } },
                    client: { select: { id: true, firstName: true, lastName: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.posTicket.count({ where }),
        ]);
        return { data, total };
    }

    async updateTicketStatus(id: string, status: PosTicketStatus): Promise<unknown> {
        return this.prisma.posTicket.update({
            where: { id },
            data: { status: status as any },
        });
    }

    async updateTicketTotals(id: string, totals: TicketTotals): Promise<unknown> {
        return this.prisma.posTicket.update({
            where: { id },
            data: {
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                total: totals.total,
            },
        });
    }

    // ── Items ─────────────────────────────────────────────────────────────────

    async addItem(data: AddItemData): Promise<unknown> {
        return this.prisma.posTicketItem.create({
            data: {
                ticketId: data.ticketId,
                type: data.type as any,
                productId: data.productId,
                description: data.description,
                quantity: data.quantity,
                unitPrice: data.unitPrice,
                discountAmount: data.discountAmount,
                total: data.total,
            },
        });
    }

    async removeItem(ticketId: string, itemId: string): Promise<void> {
        await this.prisma.posTicketItem.delete({
            where: { id: itemId, ticketId },
        });
    }

    async findTicketItems(ticketId: string): Promise<unknown[]> {
        return this.prisma.posTicketItem.findMany({ where: { ticketId } });
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    async addPayment(data: AddPaymentData): Promise<unknown> {
        return this.prisma.posPayment.create({
            data: {
                ticketId: data.ticketId,
                method: data.method as any,
                amount: data.amount,
                reference: data.reference,
            },
        });
    }

    async findTicketPayments(
        ticketId: string,
    ): Promise<Array<{ amount: number; method: string }>> {
        return this.prisma.posPayment.findMany({
            where: { ticketId },
            select: { amount: true, method: true },
        }) as Promise<Array<{ amount: number; method: string }>>;
    }

    // ── Refunds ───────────────────────────────────────────────────────────────

    async createRefund(data: CreateRefundData): Promise<unknown> {
        return this.prisma.posRefund.create({
            data: {
                ticketId: data.ticketId,
                tenantId: data.tenantId,
                amount: data.amount,
                reason: data.reason,
                refundedById: data.refundedById,
            },
        });
    }

    async findTicketRefunds(ticketId: string): Promise<unknown[]> {
        return this.prisma.posRefund.findMany({ where: { ticketId } });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    async findProductById(
        tenantId: string,
        id: string,
    ): Promise<{ id: string; name: string; price: number; stock: number } | null> {
        return this.prisma.product.findFirst({
            where: { id, tenantId, isActive: true },
            select: { id: true, name: true, price: true, stock: true },
        });
    }
}
