import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from '../../application/reports.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import {
    AppointmentsReportQueryDto,
    ClientSegmentationQueryDto,
    InventoryKardexQueryDto,
    ExpiringStockReportQueryDto,
    PosDiscountUsageReportQueryDto,
    RestockSuggestionsQueryDto,
    RevenueReportQueryDto,
    TransactionsEvidenceQueryDto,
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

    @Get('transactions-evidence')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Transaction status and evidence trail (POS)' })
    transactionsEvidence(
        @CurrentUser() user: JwtPayload,
        @Query() query: TransactionsEvidenceQueryDto,
    ) {
        return this.service.getTransactionsEvidence(
            user.tenantId,
            query.from,
            query.to,
            query.status,
        );
    }

    @Get('pos-discount-usage')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'POS discount usage report by date range and branch' })
    posDiscountUsage(
        @CurrentUser() user: JwtPayload,
        @Query() query: PosDiscountUsageReportQueryDto,
    ) {
        return this.service.getPosDiscountUsageReport(
            user.tenantId,
            query.from,
            query.to,
            query.branchId,
            query.discountId,
        );
    }

    @Get('inventory-kardex')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Inventory kardex with movement history and running balance' })
    inventoryKardex(
        @CurrentUser() user: JwtPayload,
        @Query() query: InventoryKardexQueryDto,
    ) {
        return this.service.getInventoryKardex(user.tenantId, {
            productId: query.productId,
            from: query.from,
            to: query.to,
        });
    }

    @Get('restock-suggestions')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Low-stock alerts with suggested replenishment quantities' })
    restockSuggestions(
        @CurrentUser() user: JwtPayload,
        @Query() query: RestockSuggestionsQueryDto,
    ) {
        return this.service.getRestockSuggestions(user.tenantId, query.lookbackDays ?? 30);
    }

    @Get('client-segmentation')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Segment frequent and inactive clients' })
    clientSegmentation(
        @CurrentUser() user: JwtPayload,
        @Query() query: ClientSegmentationQueryDto,
    ) {
        return this.service.getClientSegmentation(
            user.tenantId,
            query.minFrequentPurchases ?? 3,
            query.inactiveDays ?? 60,
        );
    }

    @Get('executive-kpis')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Executive KPIs by branch and professional' })
    executiveKpis(
        @CurrentUser() user: JwtPayload,
        @Query() query: RevenueReportQueryDto,
    ) {
        return this.service.getExecutiveKpis(user.tenantId, query.from, query.to);
    }
}


