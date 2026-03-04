import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PosService } from '../../application/pos.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { JwtPayload, PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
    OpenRegisterDto,
    CloseRegisterDto,
    CreateTicketDto,
    TicketFilterDto,
    AddTicketItemDto,
    ProcessPaymentsDto,
    CreateRefundDto,
} from '../../application/dto/pos.dto';

@ApiTags('pos')
@ApiBearerAuth('JWT')
@Controller({ path: 'pos', version: '1' })
export class PosController {
    constructor(private readonly posService: PosService) {}

    // ── Cash Register ─────────────────────────────────────────────────────────

    @Post('registers')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.POS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Open a new cash register' })
    openRegister(@CurrentUser() user: JwtPayload, @Body() dto: OpenRegisterDto) {
        return this.posService.openRegister(user.tenantId, user.sub, dto);
    }

    @Patch('registers/:id/close')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.POS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Close a cash register' })
    closeRegister(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: CloseRegisterDto,
    ) {
        return this.posService.closeRegister(user.tenantId, id, user.sub, dto);
    }

    @Get('registers/open')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get the current open cash register' })
    findOpenRegister(
        @CurrentUser() user: JwtPayload,
        @Query('branchId') branchId?: string,
    ) {
        return this.posService.findOpenRegister(user.tenantId, branchId);
    }

    @Get('registers')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List all cash registers' })
    findAllRegisters(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.posService.findAllRegisters(user.tenantId, query);
    }

    // ── Tickets ───────────────────────────────────────────────────────────────

    @Post('tickets')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new POS ticket' })
    createTicket(@CurrentUser() user: JwtPayload, @Body() dto: CreateTicketDto) {
        return this.posService.createTicket(user.tenantId, user.sub, dto);
    }

    @Get('tickets')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List POS tickets' })
    findAllTickets(
        @CurrentUser() user: JwtPayload,
        @Query() query: PaginationQueryDto,
        @Query() filter: TicketFilterDto,
    ) {
        return this.posService.findAllTickets(user.tenantId, query, filter);
    }

    @Get('tickets/:id')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get a POS ticket by ID' })
    findTicket(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.posService.findTicket(user.tenantId, id);
    }

    @Patch('tickets/:id/cancel')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.POS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Cancel an open ticket' })
    cancelTicket(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.posService.cancelTicket(user.tenantId, id);
    }

    // ── Items ─────────────────────────────────────────────────────────────────

    @Post('tickets/:id/items')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add an item to an open ticket' })
    addItem(
        @CurrentUser() user: JwtPayload,
        @Param('id') ticketId: string,
        @Body() dto: AddTicketItemDto,
    ) {
        return this.posService.addItem(user.tenantId, ticketId, dto);
    }

    @Delete('tickets/:id/items/:itemId')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.DELETE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remove an item from an open ticket' })
    removeItem(
        @CurrentUser() user: JwtPayload,
        @Param('id') ticketId: string,
        @Param('itemId') itemId: string,
    ) {
        return this.posService.removeItem(user.tenantId, ticketId, itemId);
    }

    // ── Payments ──────────────────────────────────────────────────────────────

    @Post('tickets/:id/payments')
    @Permissions(`${PermissionModule.POS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Process payments and complete the ticket' })
    processPayments(
        @CurrentUser() user: JwtPayload,
        @Param('id') ticketId: string,
        @Body() dto: ProcessPaymentsDto,
    ) {
        return this.posService.processPayments(user.tenantId, ticketId, dto);
    }

    // ── Refunds ───────────────────────────────────────────────────────────────

    @Post('tickets/:id/refund')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.POS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a refund for a completed ticket' })
    createRefund(
        @CurrentUser() user: JwtPayload,
        @Param('id') ticketId: string,
        @Body() dto: CreateRefundDto,
    ) {
        return this.posService.createRefund(user.tenantId, ticketId, user.sub, dto);
    }
}
