import { CashRegisterStatus, PosItemType, PosTicketStatus, PaymentMethod } from '@nuvet/types';

// ── Cash Register ─────────────────────────────────────────────────────────────

export interface CreateRegisterData {
    tenantId: string;
    branchId?: string;
    openedById: string;
    openingBalance: number;
    notes?: string;
}

export interface CloseRegisterData {
    closingBalance: number;
    notes?: string;
    closedAt: Date;
    closedById: string;
    status: CashRegisterStatus;
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export interface CreateTicketData {
    tenantId: string;
    branchId?: string;
    registerId?: string;
    clientId?: string;
    notes?: string;
    createdById: string;
}

export interface TicketFilterParams {
    status?: PosTicketStatus;
    clientId?: string;
    registerId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface TicketTotals {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
}

// ── Items ─────────────────────────────────────────────────────────────────────

export interface AddItemData {
    ticketId: string;
    type: PosItemType;
    productId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    total: number;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface AddPaymentData {
    ticketId: string;
    method: PaymentMethod;
    amount: number;
    reference?: string;
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export interface CreateRefundData {
    ticketId: string;
    tenantId: string;
    amount: number;
    reason?: string;
    refundedById: string;
}

// ── Repository interface ──────────────────────────────────────────────────────

export interface IPosRepository {
    // Register
    createRegister(data: CreateRegisterData): Promise<unknown>;
    findRegisterById(tenantId: string, id: string): Promise<unknown | null>;
    findOpenRegister(tenantId: string, branchId?: string): Promise<unknown | null>;
    findAllRegisters(
        tenantId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }>;
    closeRegister(id: string, data: CloseRegisterData): Promise<unknown>;

    // Tickets
    createTicket(data: CreateTicketData): Promise<unknown>;
    findTicketById(tenantId: string, id: string): Promise<unknown | null>;
    findAllTickets(
        tenantId: string,
        filter: TicketFilterParams,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }>;
    updateTicketStatus(id: string, status: PosTicketStatus): Promise<unknown>;
    updateTicketTotals(id: string, totals: TicketTotals): Promise<unknown>;

    // Items
    addItem(data: AddItemData): Promise<unknown>;
    removeItem(ticketId: string, itemId: string): Promise<void>;
    findTicketItems(ticketId: string): Promise<unknown[]>;

    // Payments
    addPayment(data: AddPaymentData): Promise<unknown>;
    findTicketPayments(ticketId: string): Promise<Array<{ amount: number; method: string }>>;

    // Refunds
    createRefund(data: CreateRefundData): Promise<unknown>;
    findTicketRefunds(ticketId: string): Promise<unknown[]>;

    // Helpers
    findProductById(tenantId: string, id: string): Promise<{
        id: string;
        name: string;
        price: number;
        stock: number;
    } | null>;
}

export const POS_REPOSITORY = Symbol('IPosRepository');
