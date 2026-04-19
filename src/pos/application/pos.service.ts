import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PosTicketStatus, CashRegisterStatus, PosItemType, PaymentMethod, StockMovementType } from '@nuvet/types';
import { IPosRepository, POS_REPOSITORY } from '../domain/pos.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { BillingService } from '../../billing/application/billing.service';
import { StoreService } from '../../store/application/store.service';
import { IssuePosTicketInvoiceDto } from '../../billing/application/dto/billing.dto';
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

type TicketState = {
    id: string;
    status: PosTicketStatus;
    total: number;
    itemsCount: number;
};

@Injectable()
export class PosService {
    private readonly logger = new Logger(PosService.name);

    constructor(
        @Inject(POS_REPOSITORY)
        private readonly posRepo: IPosRepository,
        private readonly prisma: PrismaService,
        private readonly billingService: BillingService,
        private readonly storeService: StoreService,
    ) {}

    // ── Cash Register ─────────────────────────────────────────────────────────

    async openRegister(tenantId: string, userId: string, dto: OpenRegisterDto) {
        const existing = await this.posRepo.findOpenRegister(tenantId, dto.branchId);
        if (existing) {
            throw new ConflictException('There is already an open cash register for this branch');
        }
        const register = await this.posRepo.createRegister({
            tenantId,
            branchId: dto.branchId,
            openedById: userId,
            openingBalance: dto.openingBalance ?? 0,
            notes: dto.notes,
        });

        await this.createAuditLog(tenantId, userId, {
            action: 'POS_REGISTER_OPENED',
            entity: 'CashRegister',
            entityId: (register as any)?.id,
            newData: register,
        });

        return register;
    }

    async closeRegister(tenantId: string, registerId: string, userId: string, dto: CloseRegisterDto) {
        const register = await this.posRepo.findRegisterById(tenantId, registerId) as any;
        if (!register) throw new NotFoundException('Cash register not found');
        if (register.status === CashRegisterStatus.CLOSED) {
            throw new BadRequestException('Cash register is already closed');
        }
        const now = new Date();
        const summary = await this.posRepo.getRegisterFinancialSummary(
            tenantId,
            registerId,
            register.openedAt,
            now,
        );
        const expectedClosingBalance = +(Number(register.openingBalance ?? 0) + summary.expectedCashBalance).toFixed(2);
        const discrepancy = +(dto.closingBalance - expectedClosingBalance).toFixed(2);

        const closed = await this.posRepo.closeRegister(registerId, {
            closingBalance: dto.closingBalance,
            notes: dto.notes,
            closedAt: now,
            closedById: userId,
            status: CashRegisterStatus.CLOSED,
        });

        await this.createAuditLog(tenantId, userId, {
            action: 'POS_REGISTER_CLOSED',
            entity: 'CashRegister',
            entityId: registerId,
            oldData: {
                status: register.status,
                openingBalance: register.openingBalance,
            },
            newData: {
                status: CashRegisterStatus.CLOSED,
                closingBalance: dto.closingBalance,
                expectedClosingBalance,
                discrepancy,
                summary,
            },
        });

        if (Math.abs(discrepancy) >= 5) {
            await this.notifyTenantAdmins(
                tenantId,
                'Diferencia de caja detectada',
                `Caja ${registerId} cerrada con diferencia de ${discrepancy.toFixed(2)}.`,
                {
                    registerId,
                    discrepancy,
                    expectedClosingBalance,
                    closingBalance: dto.closingBalance,
                },
            );
        }

        return {
            register: closed,
            closureReport: {
                expectedClosingBalance,
                discrepancy,
                summary,
            },
        };
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

    async getRegisterClosureReport(tenantId: string, registerId: string) {
        const register = (await this.posRepo.findRegisterById(tenantId, registerId)) as any;
        if (!register) {
            throw new NotFoundException('Cash register not found');
        }

        if (!register.closedAt || register.status !== CashRegisterStatus.CLOSED) {
            throw new BadRequestException('Cash register is still open; closure report is not available yet');
        }

        const summary = await this.posRepo.getRegisterFinancialSummary(
            tenantId,
            registerId,
            register.openedAt,
            register.closedAt,
        );

        const expectedClosingBalance = +(Number(register.openingBalance ?? 0) + summary.expectedCashBalance).toFixed(2);
        const discrepancy = +(Number(register.closingBalance ?? 0) - expectedClosingBalance).toFixed(2);

        return {
            registerId,
            openedAt: register.openedAt,
            closedAt: register.closedAt,
            openingBalance: register.openingBalance,
            closingBalance: register.closingBalance,
            expectedClosingBalance,
            discrepancy,
            summary,
        };
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

    async findAvailableDiscounts(tenantId: string) {
        const now = new Date();
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                description: true,
                type: true,
                value: true,
                buyQuantity: true,
                getQuantity: true,
                minAmount: true,
                maxUses: true,
                usedCount: true,
                startAt: true,
                endAt: true,
                targetType: true,
                targetId: true,
                category: true,
            },
            take: 100,
        });
    }

    async cancelTicket(tenantId: string, ticketId: string) {
        const ticket = await this.getTicketState(tenantId, ticketId);
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
        const ticket = await this.getTicketState(tenantId, ticketId);
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
        const ticket = await this.getTicketState(tenantId, ticketId);
        if (ticket.status !== PosTicketStatus.OPEN) {
            throw new BadRequestException('Can only remove items from open tickets');
        }
        await this.posRepo.removeItem(ticketId, itemId);
        await this.recalculateTotals(ticketId);
        return { message: 'Item removed' };
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    async processPayments(
        tenantId: string,
        ticketId: string,
        dto: ProcessPaymentsDto,
        invoiceInput?: IssuePosTicketInvoiceDto,
    ) {
        const ticket = await this.getTicketState(tenantId, ticketId);
        if (ticket.status !== PosTicketStatus.OPEN) {
            throw new BadRequestException('Can only process payments on open tickets');
        }
        if (ticket.total === 0 && ticket.itemsCount === 0) {
            throw new BadRequestException('Ticket has no items');
        }

        const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0);

        if (totalPaid < ticket.total) {
            throw new BadRequestException(
                `Insufficient payment. Required: ${ticket.total}, received: ${totalPaid}`,
            );
        }

        await this.posRepo.addPayments(
            dto.payments.map((payment) => ({
                ticketId,
                method: payment.method,
                amount: payment.amount,
                reference: payment.reference,
            })),
        );

        // Complete ticket
        const change = +(totalPaid - ticket.total).toFixed(2);
        const updated = await this.posRepo.updateTicketStatus(ticketId, PosTicketStatus.COMPLETED);

        await this.deductInventoryForTicket(tenantId, ticketId);

        const invoiceResult = await this.issueInvoiceSafely(tenantId, ticketId, invoiceInput);

        return {
            ...(updated as object),
            change,
            invoice: invoiceResult?.invoice,
            invoiceIssueError: invoiceResult?.error,
        };
    }

    // ── Refunds ───────────────────────────────────────────────────────────────

    async createRefund(tenantId: string, ticketId: string, userId: string, dto: CreateRefundDto) {
        const reason = dto.reason?.trim();
        if (!reason || reason.length < 8) {
            throw new BadRequestException('Debe enviar un motivo de al menos 8 caracteres para el reembolso');
        }

        const ticket = await this.getTicketState(tenantId, ticketId);
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
            reason,
            refundedById: userId,
        });

        // Update ticket status
        const isFullRefund = dto.amount + totalRefunded >= ticket.total;
        await this.posRepo.updateTicketStatus(
            ticketId,
            isFullRefund ? PosTicketStatus.REFUNDED : PosTicketStatus.PARTIAL_REFUND,
        );

        await this.createAuditLog(tenantId, userId, {
            action: 'POS_TICKET_REFUNDED',
            entity: 'PosTicket',
            entityId: ticketId,
            oldData: {
                status: ticket.status,
            },
            newData: {
                status: isFullRefund ? PosTicketStatus.REFUNDED : PosTicketStatus.PARTIAL_REFUND,
                amount: dto.amount,
                reason,
            },
        });

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

        const openRegister = (await this.posRepo.findOpenRegister(tenantId, dto.branchId)) as
            | { id: string }
            | null;

        const ticket = (await this.createTicket(tenantId, userId, {
            registerId: openRegister?.id,
            branchId: dto.branchId,
            clientId: dto.clientId,
            notes: dto.notes,
        })) as { id: string };

        await this.posRepo.addItems(
            dto.items.map((item) => ({
                ticketId: ticket.id,
                type: PosItemType.PRODUCT,
                productId: item.productId,
                description: 'PRODUCT',
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountAmount: 0,
                total: Math.max(0, item.quantity * item.unitPrice),
            })),
        );

        const baseTotals = await this.recalculateTotals(ticket.id);
        const finalTotal = dto.promotionCode
            ? await this.applyLegacyDiscountById(tenantId, ticket.id, dto.promotionCode)
            : baseTotals.total;

        const paymentAmount =
            dto.paymentMethod === PaymentMethod.CASH && typeof dto.cashReceived === 'number'
                ? dto.cashReceived
                : finalTotal;

        const paymentResult = await this.processPayments(tenantId, ticket.id, {
            payments: [
                {
                    method: dto.paymentMethod,
                    amount: paymentAmount,
                },
            ],
        }, dto.invoice);

        const completedTicket = await this.findTicket(tenantId, ticket.id);
        const mapped = this.mapTicketToLegacyTransaction(completedTicket as any);

        return {
            ...mapped,
            invoiceIssueError: (paymentResult as any)?.invoiceIssueError ?? undefined,
        };
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

        const summary = await this.posRepo.getDailyTicketSummary(tenantId, start, end);

        const byPaymentMethod: Record<PaymentMethod, { count: number; total: number }> = {
            CASH: { count: 0, total: 0 },
            CARD: { count: 0, total: 0 },
            TRANSFER: { count: 0, total: 0 },
            OTHER: { count: 0, total: 0 },
        };

        for (const payment of summary.byPaymentMethod) {
            const method = payment.method ?? PaymentMethod.OTHER;
            if (!byPaymentMethod[method]) continue;
            byPaymentMethod[method].count = payment.count;
            byPaymentMethod[method].total = payment.total;
        }

        return {
            date: start.toISOString().slice(0, 10),
            totalTransactions: summary.totalTransactions,
            totalRevenue: summary.totalRevenue,
            totalDiscount: summary.totalDiscount,
            byPaymentMethod,
        };
    }

    async voidLegacyTransaction(tenantId: string, userId: string, ticketId: string, reason?: string) {
        const normalizedReason = reason?.trim();
        const ticket = await this.getTicketState(tenantId, ticketId);

        if (ticket.status === PosTicketStatus.CANCELLED || ticket.status === PosTicketStatus.REFUNDED) {
            throw new BadRequestException('La transacción ya se encuentra anulada/reembolsada');
        }

        if (ticket.status === PosTicketStatus.OPEN) {
            await this.posRepo.updateTicketStatus(ticketId, PosTicketStatus.CANCELLED);
            const cancelled = await this.findTicket(tenantId, ticketId);

            await this.createAuditLog(tenantId, userId, {
                action: 'POS_TICKET_VOIDED',
                entity: 'PosTicket',
                entityId: ticketId,
                oldData: { status: PosTicketStatus.OPEN },
                newData: { status: PosTicketStatus.CANCELLED, reason: normalizedReason ?? 'Anulacion en estado OPEN' },
            });

            return this.mapTicketToLegacyTransaction(cancelled as any);
        }

        if (!normalizedReason || normalizedReason.length < 8) {
            throw new BadRequestException('Debe enviar un motivo de al menos 8 caracteres para anular la transacción');
        }

        const refunds = (await this.posRepo.findTicketRefunds(ticketId)) as Array<{ amount: number }>;
        const refundedSoFar = refunds.reduce((sum, r) => sum + Number(r.amount ?? 0), 0);
        const pendingRefund = Math.max(0, Number(ticket.total ?? 0) - refundedSoFar);

        if (pendingRefund <= 0) {
            throw new BadRequestException('La transacción ya está completamente reembolsada');
        }

        await this.createRefund(tenantId, ticketId, userId, {
            amount: pendingRefund,
            reason: normalizedReason,
        });

        const updated = await this.findTicket(tenantId, ticketId);
        return this.mapTicketToLegacyTransaction(updated as any);
    }

    private async createAuditLog(
        tenantId: string,
        userId: string | null,
        payload: {
            action: string;
            entity: string;
            entityId?: string;
            oldData?: unknown;
            newData?: unknown;
        },
    ) {
        await this.prisma.auditLog.create({
            data: {
                tenantId,
                userId: userId ?? undefined,
                action: payload.action,
                entity: payload.entity,
                entityId: payload.entityId,
                oldData: payload.oldData as any,
                newData: payload.newData as any,
            },
        });
    }

    private async notifyTenantAdmins(
        tenantId: string,
        title: string,
        body: string,
        data?: Record<string, unknown>,
    ) {
        const admins = await this.prisma.user.findMany({
            where: { tenantId, role: 'CLINIC_ADMIN', isActive: true },
            select: { id: true },
            take: 10,
        });

        if (!admins.length) return;

        await this.prisma.notification.createMany({
            data: admins.map((admin) => ({
                tenantId,
                userId: admin.id,
                title,
                body,
                channel: 'IN_APP',
                data: data as any,
            })),
        });
    }

    private async getTicketState(tenantId: string, ticketId: string): Promise<TicketState> {
        const ticket = await this.posRepo.findTicketSnapshot(tenantId, ticketId);
        if (!ticket) {
            throw new NotFoundException('Ticket not found');
        }
        return ticket;
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
                    status: ticket.invoiceStatus ?? undefined,
                    documentNumber: ticket.invoiceNumber ?? undefined,
                    accessKey: ticket.invoiceAccessKey ?? undefined,
                    authorizedAt: ticket.invoiceAuthorizedAt ?? undefined,
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
        const normalizedTotals = {
            subtotal: +subtotal.toFixed(2),
            discount: +discount.toFixed(2),
            tax: 0,
            total: +total.toFixed(2),
        };
        await this.posRepo.updateTicketTotals(ticketId, normalizedTotals);
        return normalizedTotals;
    }

    private async applyLegacyDiscountById(tenantId: string, ticketId: string, discountId: string) {
        const discount = await this.prisma.discount.findFirst({
            where: { id: discountId, tenantId },
            select: {
                id: true,
                name: true,
                type: true,
                value: true,
                buyQuantity: true,
                getQuantity: true,
                targetType: true,
                targetId: true,
                category: true,
                minAmount: true,
                maxUses: true,
                usedCount: true,
                startAt: true,
                endAt: true,
                isActive: true,
            },
        });

        if (!discount) {
            throw new NotFoundException('Descuento no encontrado');
        }

        const now = Date.now();
        if (!discount.isActive || discount.startAt.getTime() > now || (discount.endAt && discount.endAt.getTime() < now)) {
            throw new BadRequestException('El descuento no está vigente');
        }

        if (discount.maxUses !== null && discount.maxUses !== undefined && (discount.usedCount ?? 0) >= discount.maxUses) {
            throw new BadRequestException('El descuento alcanzó el máximo de usos');
        }

        const ticket = (await this.findTicket(tenantId, ticketId)) as any;
        const items = (ticket.items ?? []) as Array<{
            productId?: string | null;
            quantity: number;
            unitPrice: number;
        }>;
        const subtotal = Number(ticket.subtotal ?? 0);

        if (subtotal <= 0) {
            throw new BadRequestException('No se puede aplicar descuento a un ticket vacío');
        }

        if (discount.minAmount !== null && discount.minAmount !== undefined && subtotal < discount.minAmount) {
            throw new BadRequestException('El ticket no alcanza el monto mínimo para este descuento');
        }

        let applies = false;
        if (discount.targetType === 'ALL_PRODUCTS') {
            applies = true;
        } else if (discount.targetType === 'PRODUCT') {
            applies = items.some((item) => item.productId === discount.targetId);
        } else if (discount.targetType === 'PRODUCT_CATEGORY') {
            const productIds = Array.from(new Set(items.map((item) => item.productId).filter(Boolean))) as string[];
            if (productIds.length > 0 && discount.category) {
                const products = await this.prisma.product.findMany({
                    where: { tenantId, id: { in: productIds } },
                    select: { id: true, category: true },
                });
                const categorySet = new Set(products.map((product) => product.category));
                applies = categorySet.has(discount.category);
            }
        }

        if (!applies) {
            throw new BadRequestException('El descuento no aplica para los items del ticket');
        }

        let discountAmount = 0;
        if (discount.type === 'PERCENTAGE') {
            discountAmount = (subtotal * Number(discount.value ?? 0)) / 100;
        } else if (discount.type === 'FIXED') {
            discountAmount = Number(discount.value ?? 0);
        } else if (discount.type === 'BUY_X_GET_Y') {
            const buy = Math.max(1, Number(discount.buyQuantity ?? 0));
            const get = Math.max(1, Number(discount.getQuantity ?? 0));

            const targetItems = discount.targetId
                ? items.filter((item) => item.productId === discount.targetId)
                : items;

            const totalQty = targetItems.reduce((acc, item) => acc + Number(item.quantity ?? 0), 0);
            const unitPrice = targetItems.length > 0 ? Number(targetItems[0].unitPrice ?? 0) : 0;
            const groups = Math.floor(totalQty / (buy + get));
            const freeUnits = groups * get;
            discountAmount = freeUnits * unitPrice;
        }

        discountAmount = Math.max(0, Math.min(subtotal, Number(discountAmount.toFixed(2))));
        const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

        await this.posRepo.updateTicketTotals(ticketId, {
            subtotal: Number(subtotal.toFixed(2)),
            discount: discountAmount,
            tax: Number(ticket.tax ?? 0),
            total,
        });

        await this.prisma.discount.update({
            where: { id: discount.id },
            data: { usedCount: (discount.usedCount ?? 0) + 1 },
        });

        await this.prisma.discountUsage.create({
            data: {
                tenantId,
                discountId: discount.id,
                posTicketId: ticketId,
                savedAmount: discountAmount,
            },
        });

        await this.createAuditLog(tenantId, null, {
            action: 'POS_DISCOUNT_APPLIED',
            entity: 'PosTicket',
            entityId: ticketId,
            newData: {
                discountId: discount.id,
                discountName: discount.name,
                discountType: discount.type,
                savedAmount: discountAmount,
                subtotal: Number(subtotal.toFixed(2)),
                total,
            },
        });

        return total;
    }

    private async deductInventoryForTicket(tenantId: string, ticketId: string) {
        try {
            const items = await this.prisma.posTicketItem.findMany({
                where: { ticketId, productId: { not: null } },
                select: { productId: true, quantity: true },
            });

            for (const item of items) {
                if (!item.productId) continue;
                try {
                    await this.storeService.adjustStock(tenantId, 'SYSTEM', {
                        productId: item.productId,
                        type: StockMovementType.OUT,
                        quantity: item.quantity,
                        reason: `Venta POS - Ticket ${ticketId.slice(0, 8)}`,
                    } as any);
                } catch (err) {
                    this.logger.warn(
                        `No se pudo descontar stock del producto ${item.productId} (qty: ${item.quantity}): ${err instanceof Error ? err.message : err}`,
                    );
                }
            }
        } catch (err) {
            this.logger.error(
                `Error al descontar inventario para ticket ${ticketId}: ${err instanceof Error ? err.message : err}`,
            );
        }
    }

    private async issueInvoiceSafely(
        tenantId: string,
        ticketId: string,
        invoiceInput?: IssuePosTicketInvoiceDto,
    ) {
        try {
            const issued = await this.billingService.issueFromPosTicket(tenantId, ticketId, invoiceInput ?? {});
            return {
                invoice: issued.invoice,
                error: undefined as string | undefined,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'No se pudo emitir factura';
            this.logger.warn(`No se pudo emitir factura para ticket ${ticketId}: ${message}`);

            await this.createAuditLog(tenantId, null, {
                action: 'POS_INVOICE_ISSUE_FAILED',
                entity: 'PosTicket',
                entityId: ticketId,
                newData: {
                    error: message,
                },
            });

            return {
                invoice: undefined,
                error: message,
            };
        }
    }
}
