import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from '../../application/reports.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import {
    AppointmentsReportQueryDto,
    ExpiringStockReportQueryDto,
    RevenueReportQueryDto,
    VaccinationsReportQueryDto,
} from '../../application/dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
    constructor(private service: ReportsService) { }

    @Get('appointments')
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Appointments report by date range, vet, type' })
    appointments(
        @CurrentUser() user: JwtPayload,
        @Query() query: AppointmentsReportQueryDto,
    ) {
        return this.service.getAppointmentsReport(
            user.tenantId,
            query.from,
            query.to,
            query.vetId,
            query.type,
        );
    }

    @Get('revenue')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Revenue report by date range (CLINIC_ADMIN only)' })
    revenue(
        @CurrentUser() user: JwtPayload,
        @Query() query: RevenueReportQueryDto,
    ) {
        return this.service.getRevenueReport(user.tenantId, query.from, query.to);
    }

    @Get('inventory')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Inventory report with low-stock alerts (CLINIC_ADMIN only)' })
    inventory(@CurrentUser() user: JwtPayload) {
        return this.service.getInventoryReport(user.tenantId);
    }

    @Get('vaccinations')
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Upcoming vaccination due dates' })
    vaccinations(
        @CurrentUser() user: JwtPayload,
        @Query() query: VaccinationsReportQueryDto,
    ) {
        return this.service.getUpcomingVaccinations(user.tenantId, query.days ?? 30);
    }

    @Get('expiring-stock')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Product batches expiring in the next N days' })
    expiringStock(
        @CurrentUser() user: JwtPayload,
        @Query() query: ExpiringStockReportQueryDto,
    ) {
        return this.service.getExpiringStock(user.tenantId, query.days ?? 30);
    }
}


