import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { BillingService } from '../../application/billing.service';
import { IssuePosTicketInvoiceDto, InvoiceListFilterDto } from '../../application/dto/billing.dto';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth('JWT')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
    constructor(private readonly billingService: BillingService) {}

    @Get('invoices')
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar facturas electrónicas emitidas desde tickets POS' })
    listInvoices(
        @CurrentUser() user: JwtPayload,
        @Query() filter: InvoiceListFilterDto,
    ) {
        return this.billingService.listInvoices(user.tenantId, filter, filter);
    }

    @Post('pos-tickets/:ticketId/issue')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.CREATE}`)
    @ApiOperation({ summary: 'Emitir factura electrónica desde un ticket POS completado' })
    issuePosTicketInvoice(
        @CurrentUser() user: JwtPayload,
        @Param('ticketId') ticketId: string,
        @Body() dto: IssuePosTicketInvoiceDto,
    ) {
        return this.billingService.issueFromPosTicket(user.tenantId, ticketId, dto);
    }

    @Get('external/:providerInvoiceId/status')
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Consultar estado en el proveedor externo de facturación' })
    getExternalInvoiceStatus(
        @CurrentUser() user: JwtPayload,
        @Param('providerInvoiceId') providerInvoiceId: string,
    ) {
        return this.billingService.getExternalInvoiceStatus(user.tenantId, providerInvoiceId);
    }

    @Get('external/:providerInvoiceId/pdf')
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Obtener URL de PDF de una factura externa' })
    getExternalInvoicePdfUrl(
        @CurrentUser() user: JwtPayload,
        @Param('providerInvoiceId') providerInvoiceId: string,
    ) {
        return this.billingService.getExternalInvoiceDocumentUrl(
            user.tenantId,
            providerInvoiceId,
            'pdf',
        );
    }

    @Get('external/:providerInvoiceId/xml')
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Obtener URL de XML de una factura externa' })
    getExternalInvoiceXmlUrl(
        @CurrentUser() user: JwtPayload,
        @Param('providerInvoiceId') providerInvoiceId: string,
    ) {
        return this.billingService.getExternalInvoiceDocumentUrl(
            user.tenantId,
            providerInvoiceId,
            'xml',
        );
    }

    @Get('pos-tickets/:ticketId/status')
    @Permissions(`${PermissionModule.BILLING}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Consultar estado de factura electrónica por ticket POS' })
    getPosTicketInvoiceStatus(
        @CurrentUser() user: JwtPayload,
        @Param('ticketId') ticketId: string,
    ) {
        return this.billingService.getTicketInvoiceStatus(user.tenantId, ticketId);
    }
}
