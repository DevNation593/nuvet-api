import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PosTicketStatus, CashRegisterStatus, PosItemType, PaymentMethod } from '@nuvet/types';
import { IPosRepository, POS_REPOSITORY } from '../domain/pos.repository';
import {
    OpenRegisterDto,
    CloseRegisterDto,
    CreateTicketDto,
    TicketFilterDto,
    AddTicketItemDto,
    ProcessPaymentsDto,
    CreateRefundDto,
    CreateLegacyTransactionDto,
} from './dto/pos.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../../common/dto/pagination.dto';

@Injectable()
export class PosService {
    constructor(
        @Inject(POS_REPOSITORY)
        private readonly posRepo: IPosRepository,
    ) {}

    // ── Cash Register ─────────────────────────────────────────────────────────

    async openRegister(tenantId: string, userId: string, dto: OpenRegisterDto) {
        const existing = await this.posRepo.findOpenRegister(tenantId, dto.branchId);
        if (existing) {
            throw new ConflictException('There is already an open cash register for this branch');
        }
        return this.posRepo.createRegister({
            tenantId,
            branchId: dto.branchId,
            openedById: userId,
            openingBalance: dto.openingBalance ?? 0,
            notes: dto.notes,
        });
    }

    async closeRegister(tenantId: string, registerId: string, userId: string, dto: CloseRegisterDto) {
        const register = await this.posRepo.findRegisterById(tenantId, registerId) as any;
        if (!register) throw new NotFoundException('Cash register not found');
        if (register.status === CashRegisterStatus.CLOSED) {
            throw new BadRequestException('Cash register is already closed');
        }
        return this.posRepo.closeRegister(registerId, {
            closingBalance: dto.closingBalance,
            notes: dto.notes,
            closedAt: new Date(),
            closedById: userId,
            status: CashRegisterStatus.CLOSED,
        });
    }

    async findOpenRegister(tenantId: string, branchId?: string) {
        const register = await this.posRepo.findOpenRegister(tenantId, branchId);
        if (!register) throw new NotFoundException('No open cash register found');
        return register;
    }

    async findAllRegisters(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.posRepo.findAllRegisters(tenantId, skip, take);
        return buildPaginatedResponse(data, total, page, limit);
    }

    // ── Tickets ───────────────────────────────────────────────────────────────

    async createTicket(tenantId: string, userId: string, dto: CreateTicketDto) {
        return this.posRepo.createTicket({
            tenantId,
            branchId: dto.branchId,
            registerId: dto.registerId,
            clientId: dto.clientId,
            notes: dto.notes,
            createdById: userId,
        });
    }

    async findTicket(tenantId: string, id: string) {
        const ticket = await this.posRepo.findTicketById(tenantId, id);
        if (!ticket) throw new NotFoundException('Ticket not found');
        return ticket;
    }

    async findAllTickets(tenantId: string, query: PaginationQueryDto, filter: TicketFilterDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.posRepo.findAllTickets(tenantId, filter, skip, take);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async cancelTicket(tenantId: string, ticketId: string) {
        const ticket = await this.findTicket(tenantId, ticketId) as any;
        if (ticket.status === PosTicketStatus.COMPLETED) {
            throw new BadRequestException('Cannot cancel a completed ticket — use refund instead');
        }
        if (ticket.status === PosTicketStatus.CANCELLED) {
            throw new BadRequestException('Ticket is already cancelled');
        }
        return this.posRepo.updateTicketStatus(ticketId, PosTicketStatus.CANCELLED);
    }

    // ── Items ─────────────────────────────────────────────────────────────────

    async addItem(tenantId: string, ticketId: string, dto: AddTicketItemDto) {
        const ticket = await this.findTicket(tenantId, ticketId) as any;
        if (ticket.status !== PosTicketStatus.OPEN) {
            throw new BadRequestException('Can only add items to open tickets');
        }

        let description = dto.description;
        let unitPrice = dto.unitPrice;

        if (dto.type === PosItemType.PRODUCT && dto.productId) {
            const product = await this.posRepo.findProductById(tenantId, dto.productId);
            if (!product) throw new NotFoundException('Product not found');
            description = product.name;
            unitPrice = dto.unitPrice ?? product.price;
        }

        const qty = dto.quantity ?? 1;
        const disc = dto.discountAmount ?? 0;
        const total = Math.max(0, qty * unitPrice - disc);

        const item = await this.posRepo.addItem({
            ticketId,
            type: dto.type,
            productId: dto.productId,
            description,
            quantity: qty,
            unitPrice,
            discountAmount: disc,
            total,
        });

        await this.recalculateTotals(ticketId);
        return item;
    }

    async removeItem(tenantId: string, ticketId: string, itemId: string) {
        const ticket = await this.findTicket(tenantId, ticketId) as any;
        if (ticket.status !== PosTicketStatus.OPEN) {
            throw new BadRequestException('Can only remove items from open tickets');
        }
        await this.posRepo.removeItem(ticketId, itemId);
        await this.recalculateTotals(ticketId);
        return { message: 'Item removed' };
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    async processPayments(tenantId: string, ticketId: string, dto: ProcessPaymentsDto) {
        const ticket = await this.findTicket(tenantId, ticketId) as any;
        if (ticket.status !== PosTicketStatus.OPEN) {
            throw new BadRequestException('Can only process payments on open tickets');
        }
        if (ticket.total === 0 && ticket.items?.length === 0) {
            throw new BadRequestException('Ticket has no items');
        }

        const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0);

        if (totalPaid < ticket.total) {
            throw new BadRequestException(
                `Insufficient payment. Required: ${ticket.total}, received: ${totalPaid}`,
            );
        }

        // Register each payment
        for (const payment of dto.payments) {
            await this.posRepo.addPayment({
                ticketId,
                method: payment.method,
                amount: payment.amount,
                reference: payment.reference,
            });
        }

        // Complete ticket
        const change = +(totalPaid - ticket.total).toFixed(2);
        const updated = await this.posRepo.updateTicketStatus(ticketId, PosTicketStatus.COMPLETED);
        return { ...updated as object, change };
    }

    // ── Refunds ───────────────────────────────────────────────────────────────

    async createRefund(tenantId: string, ticketId: string, userId: string, dto: CreateRefundDto) {
        const ticket = await this.findTicket(tenantId, ticketId) as any;
        if (
            ticket.status !== PosTicketStatus.COMPLETED &&
            ticket.status !== PosTicketStatus.PARTIAL_REFUND
        ) {
            throw new BadRequestException('Can only refund completed tickets');
        }

        const existingRefunds = await this.posRepo.findTicketRefunds(ticketId);
        const totalRefunded = (existingRefunds as any[]).reduce((s, r) => s + r.amount, 0);

        if (dto.amount + totalRefunded > ticket.total) {
            throw new BadRequestException('Refund amount exceeds ticket total');
        }

        const refund = await this.posRepo.createRefund({
            ticketId,
            tenantId,
            amount: dto.amount,
            reason: dto.reason,
            refundedById: userId,
        });

        // Update ticket status
        const isFullRefund = dto.amount + totalRefunded >= ticket.total;
        await this.posRepo.updateTicketStatus(
            ticketId,
            isFullRefund ? PosTicketStatus.REFUNDED : PosTicketStatus.PARTIAL_REFUND,
        );

        return refund;
    }

    // ── Legacy compatibility (web POS) ──────────────────────────────────────

    async createLegacyTransaction(
        tenantId: string,
        userId: string,
        dto: CreateLegacyTransactionDto,
    ) {
        if (!dto.items?.length) {
            throw new BadRequestException('La transacción debe incluir al menos un item');
        }

        const openRegister = (await this.posRepo.findOpenRegister(tenantId)) as
            | { id: string }
            | null;

        const ticket = (await this.createTicket(tenantId, userId, {
            registerId: openRegister?.id,
            clientId: dto.clientId,
            notes: dto.notes,
        })) as { id: string };

        for (const item of dto.items) {
            await this.addItem(tenantId, ticket.id, {
                type: PosItemType.PRODUCT,
                productId: item.productId,
                description: 'PRODUCT',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: 0,
            });
        }

        const freshTicket = (await this.findTicket(tenantId, ticket.id)) as { total: number };
        const paymentAmount =
            dto.paymentMethod === PaymentMethod.CASH && typeof dto.cashReceived === 'number'
                ? dto.cashReceived
                : freshTicket.total;

        await this.processPayments(tenantId, ticket.id, {
            payments: [
                {
                    method: dto.paymentMethod,
                    amount: paymentAmount,
                },
            ],
        });

        const completedTicket = await this.findTicket(tenantId, ticket.id);
        return this.mapTicketToLegacyTransaction(completedTicket as any);
    }

    async findLegacyTransactions(tenantId: string, query: PaginationQueryDto, filter: TicketFilterDto) {
        const normalizedFilter: TicketFilterDto = {
            ...filter,
            dateFrom: filter.dateFrom,
            dateTo: filter.dateTo,
        };

        const response = await this.findAllTickets(tenantId, query, normalizedFilter);
        const data = ((response as { data?: unknown[] }).data ?? []).map((ticket) =>
            this.mapTicketToLegacyTransaction(ticket as any),
        );

        return {
            ...(response as object),
            data,
        };
    }

    async getLegacyDailySummary(tenantId: string, date?: string) {
        const base = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
        if (Number.isNaN(base.getTime())) {
            throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD');
        }

        const start = new Date(base);
        start.setUTCHours(0, 0, 0, 0);
        const end = new Date(base);
        end.setUTCHours(23, 59, 59, 999);

        const tickets = await this.posRepo.findAllTickets(
            tenantId,
            {
                status: PosTicketStatus.COMPLETED,
                dateFrom: start.toISOString(),
                dateTo: end.toISOString(),
            },
            0,
            1000,
        );

        const byPaymentMethod: Record<PaymentMethod, { count: number; total: number }> = {
            CASH: { count: 0, total: 0 },
            CARD: { count: 0, total: 0 },
            TRANSFER: { count: 0, total: 0 },
            OTHER: { count: 0, total: 0 },
        };

        for (const ticket of tickets.data as any[]) {
            for (const payment of ticket.payments ?? []) {
                const method = (payment.method as PaymentMethod) ?? PaymentMethod.OTHER;
                if (!byPaymentMethod[method]) continue;
                byPaymentMethod[method].count += 1;
                byPaymentMethod[method].total += Number(payment.amount ?? 0);
            }
        }

        return {
            date: start.toISOString().slice(0, 10),
            totalTransactions: tickets.total,
            totalRevenue: (tickets.data as any[]).reduce((acc, t) => acc + Number(t.total ?? 0), 0),
            totalDiscount: (tickets.data as any[]).reduce((acc, t) => acc + Number(t.discount ?? 0), 0),
            byPaymentMethod,
        };
    }

    async voidLegacyTransaction(tenantId: string, userId: string, ticketId: string, reason?: string) {
        const ticket = (await this.findTicket(tenantId, ticketId)) as {
            status: PosTicketStatus;
            total: number;
            refunds?: Array<{ amount: number }>;
        };

        if (ticket.status === PosTicketStatus.CANCELLED || ticket.status === PosTicketStatus.REFUNDED) {
            throw new BadRequestException('La transacción ya se encuentra anulada/reembolsada');
        }

        if (ticket.status === PosTicketStatus.OPEN) {
            await this.cancelTicket(tenantId, ticketId);
            const cancelled = await this.findTicket(tenantId, ticketId);
            return this.mapTicketToLegacyTransaction(cancelled as any);
        }

        const refundedSoFar = (ticket.refunds ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
        const pendingRefund = Math.max(0, Number(ticket.total ?? 0) - refundedSoFar);

        if (pendingRefund <= 0) {
            throw new BadRequestException('La transacción ya está completamente reembolsada');
        }

        await this.createRefund(tenantId, ticketId, userId, {
            amount: pendingRefund,
            reason: reason ?? 'Anulado por operador',
        });

        const updated = await this.findTicket(tenantId, ticketId);
        return this.mapTicketToLegacyTransaction(updated as any);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private mapTicketToLegacyTransaction(ticket: any) {
        const primaryPayment = Array.isArray(ticket.payments) && ticket.payments.length > 0
            ? ticket.payments[0]
            : undefined;

        return {
            id: ticket.id,
            status: ticket.status,
            items: (ticket.items ?? []).map((item: any) => ({
                productId: item.productId,
                quantity: Number(item.quantity ?? 0),
                unitPrice: Number(item.unitPrice ?? 0),
                discount: Number(item.discountAmount ?? 0),
                total: Number(item.total ?? 0),
            })),
            subtotal: Number(ticket.subtotal ?? 0),
            discountTotal: Number(ticket.discount ?? 0),
            tax: Number(ticket.tax ?? 0),
            total: Number(ticket.total ?? 0),
            paymentMethod: (primaryPayment?.method ?? PaymentMethod.OTHER) as PaymentMethod,
            notes: ticket.notes,
            clientId: ticket.clientId,
            client: ticket.client
                ? {
                    firstName: ticket.client.firstName,
                    lastName: ticket.client.lastName,
                    identification: ticket.client.identification,
                    email: ticket.client.email,
                }
                : undefined,
            providerInvoiceId: ticket.providerInvoiceId ?? undefined,
            invoice: ticket.providerInvoiceId
                ? {
                    providerInvoiceId: ticket.providerInvoiceId,
                }
                : undefined,
            createdAt: ticket.createdAt,
            receiptNumber: `R-${String(ticket.id).slice(0, 8).toUpperCase()}`,
        };
    }

    private async recalculateTotals(ticketId: string) {
        const items = (await this.posRepo.findTicketItems(ticketId)) as any[];
        const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
        const discount = items.reduce((s, i) => s + i.discountAmount, 0);
        const total = Math.max(0, subtotal - discount);
        await this.posRepo.updateTicketTotals(ticketId, {
            subtotal: +subtotal.toFixed(2),
            discount: +discount.toFixed(2),
            tax: 0,
            total: +total.toFixed(2),
        });
    }
}
