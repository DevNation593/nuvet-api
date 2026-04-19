import { Injectable, Inject } from '@nestjs/common';
import { AppointmentType } from '@nuvet/types';
import { IReportRepository, REPORT_REPOSITORY } from '../domain/report.repository';

@Injectable()
export class ReportsService {
    constructor(
        @Inject(REPORT_REPOSITORY)
        private readonly reportRepo: IReportRepository,
    ) {}

    getAppointmentsReport(
        tenantId: string,
        from: string,
        to: string,
        vetId?: string,
        type?: AppointmentType,
    ) {
        return this.reportRepo.getAppointmentsReport(tenantId, from, to, vetId, type);
    }

    getRevenueReport(tenantId: string, from: string, to: string) {
        return this.reportRepo.getRevenueReport(tenantId, from, to);
    }

    getInventoryReport(tenantId: string) {
        return this.reportRepo.getInventoryReport(tenantId);
    }

    getUpcomingVaccinations(tenantId: string, daysAhead = 30) {
        return this.reportRepo.getUpcomingVaccinations(tenantId, daysAhead);
    }

    getExpiringStock(tenantId: string, daysAhead = 30) {
        return this.reportRepo.getExpiringStock(tenantId, daysAhead);
    }

    getTransactionsEvidence(tenantId: string, from: string, to: string, status?: string) {
        return this.reportRepo.getTransactionsEvidence(tenantId, from, to, status);
    }

    getPosDiscountUsageReport(
        tenantId: string,
        from: string,
        to: string,
        branchId?: string,
        discountId?: string,
    ) {
        return this.reportRepo.getPosDiscountUsageReport(tenantId, from, to, branchId, discountId);
    }

    getInventoryKardex(
        tenantId: string,
        filters: { productId?: string; from?: string; to?: string },
    ) {
        return this.reportRepo.getInventoryKardex(tenantId, filters);
    }

    getRestockSuggestions(tenantId: string, lookbackDays = 30) {
        return this.reportRepo.getRestockSuggestions(tenantId, lookbackDays);
    }

    getClientSegmentation(
        tenantId: string,
        minFrequentPurchases = 3,
        inactiveDays = 60,
    ) {
        return this.reportRepo.getClientSegmentation(tenantId, minFrequentPurchases, inactiveDays);
    }

    getExecutiveKpis(tenantId: string, from: string, to: string) {
        return this.reportRepo.getExecutiveKpis(tenantId, from, to);
    }
}
