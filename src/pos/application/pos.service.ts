import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PosTicketStatus, CashRegisterStatus, PosItemType } from '@nuvet/types';
import { IPosRepository, POS_REPOSITORY } from '../domain/pos.repository';
import {
    OpenRegisterDto,
    CloseRegisterDto,
    CreateTicketDto,
    TicketFilterDto,
    AddTicketItemDto,
    ProcessPaymentsDto,
    CreateRefundDto,
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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
