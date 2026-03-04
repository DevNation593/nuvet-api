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
}

export const REPORT_REPOSITORY = Symbol('IReportRepository');
