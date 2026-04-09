import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { BillingService } from '../../application/billing.service';
import { IssuePosTicketInvoiceDto } from '../../application/dto/billing.dto';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('billing')
@ApiBearerAuth('JWT')
@Controller({ path: 'billing', version: '1' })
export class BillingController {
    constructor(private readonly billingService: BillingService) {}

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
}
