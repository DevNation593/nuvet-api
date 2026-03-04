import { Module } from '@nestjs/common';
import { ReportsController } from './infrastructure/http/reports.controller';
import { ReportsService } from './application/reports.service';
import { REPORT_REPOSITORY } from './domain/report.repository';
import { PrismaReportRepository } from './infrastructure/persistence/prisma-report.repository';

@Module({
    controllers: [ReportsController],
    providers: [
        { provide: REPORT_REPOSITORY, useClass: PrismaReportRepository },
        ReportsService,
    ],
})
export class ReportsModule { }
