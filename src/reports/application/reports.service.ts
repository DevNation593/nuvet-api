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
}
