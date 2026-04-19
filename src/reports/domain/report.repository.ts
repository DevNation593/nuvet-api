import { AppointmentType } from '@nuvet/types';

export interface AppointmentsReportResult {
    total: number;
    byStatus: Array<{ status: string; _count: number }>;
    byType: Array<{ type: string; _count: number }>;
    from: string;
    to: string;
}

export interface RevenueReportResult {
    totalRevenue: number;
    orderCount: number;
    from: string;
    to: string;
    orders: Array<{ total: number; createdAt: Date }>;
}

export interface InventoryReportResult {
    totalProducts: number;
    lowStockAlerts: Array<{
        id: string;
        name: string;
        sku: string;
        stock: number;
        lowStockThreshold: number;
    }>;
    recentMovements: unknown[];
}

export interface UpcomingVaccinationsResult {
    count: number;
    daysAhead: number;
    upcoming: unknown[];
}

export interface ExpiringStockResult {
    count: number;
    daysAhead: number;
    batches: unknown[];
}

export interface TransactionsEvidenceResult {
    from: string;
    to: string;
    total: number;
    items: unknown[];
}

export interface PosDiscountUsageReportResult {
    from: string;
    to: string;
    branchId?: string;
    discountId?: string;
    totalUsages: number;
    totalSavedAmount: number;
    byDiscount: Array<{
        discountId: string;
        discountName: string;
        usageCount: number;
        savedAmount: number;
    }>;
    items: unknown[];
}

export interface InventoryKardexResult {
    productId?: string;
    totalMovements: number;
    entries: unknown[];
}

export interface RestockSuggestionsResult {
    lookbackDays: number;
    generatedAt: string;
    suggestions: unknown[];
}

export interface ClientSegmentationResult {
    generatedAt: string;
    minFrequentPurchases: number;
    inactiveDays: number;
    frequent: unknown[];
    inactive: unknown[];
}

export interface ExecutiveKpisResult {
    from: string;
    to: string;
    sales: {
        total: number;
        averageTicket: number;
        totalTickets: number;
        repurchaseRate: number;
    };
    topClients: unknown[];
    byBranch: unknown[];
    byProfessional: unknown[];
}

export interface IReportRepository {
    getAppointmentsReport(
        tenantId: string,
        from: string,
        to: string,
        vetId?: string,
        type?: AppointmentType,
    ): Promise<AppointmentsReportResult>;

    getRevenueReport(
        tenantId: string,
        from: string,
        to: string,
    ): Promise<RevenueReportResult>;

    getInventoryReport(tenantId: string): Promise<InventoryReportResult>;

    getUpcomingVaccinations(
        tenantId: string,
        daysAhead: number,
    ): Promise<UpcomingVaccinationsResult>;

    getExpiringStock(
        tenantId: string,
        daysAhead: number,
    ): Promise<ExpiringStockResult>;

    getTransactionsEvidence(
        tenantId: string,
        from: string,
        to: string,
        status?: string,
    ): Promise<TransactionsEvidenceResult>;

    getPosDiscountUsageReport(
        tenantId: string,
        from: string,
        to: string,
        branchId?: string,
        discountId?: string,
    ): Promise<PosDiscountUsageReportResult>;

    getInventoryKardex(
        tenantId: string,
        filters: { productId?: string; from?: string; to?: string },
    ): Promise<InventoryKardexResult>;

    getRestockSuggestions(
        tenantId: string,
        lookbackDays: number,
    ): Promise<RestockSuggestionsResult>;

    getClientSegmentation(
        tenantId: string,
        minFrequentPurchases: number,
        inactiveDays: number,
    ): Promise<ClientSegmentationResult>;

    getExecutiveKpis(
        tenantId: string,
        from: string,
        to: string,
    ): Promise<ExecutiveKpisResult>;
}

export const REPORT_REPOSITORY = Symbol('IReportRepository');
