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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import {
    JwtPayload,
    PermissionAction,
    PermissionModule,
    UserRole,
} from '@nuvet/types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import {
    PaginationQueryDto,
    buildPaginationArgs,
} from '../../../common/dto/pagination.dto';
import { MembershipSubscriptionsService } from '../../application/membership-subscriptions.service';
import {
    CancelSubscriptionDto,
    SubscribeToPlanDto,
} from '../../application/dto/membership-subscription.dto';
import { MembershipSubscriptionStatus } from '@prisma/client';

@ApiTags('memberships')
@ApiBearerAuth('JWT')
@Controller({ path: 'memberships/subscriptions', version: '1' })
export class MembershipSubscriptionsController {
    constructor(
        private readonly service: MembershipSubscriptionsService,
    ) {}

    @Get('mine')
    @Roles(UserRole.CLIENT, UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.READ}`,
    )
    @ApiOperation({ summary: 'Mis suscripciones (cliente) o las del tenant (staff)' })
    listMine(
        @CurrentUser() user: JwtPayload,
        @Query() query: PaginationQueryDto & { status?: MembershipSubscriptionStatus },
    ) {
        const { skip, take } = buildPaginationArgs(query);
        if (user.role === UserRole.CLIENT) {
            return this.service.listMine(user, { status: query.status }, { skip, take });
        }
        return this.service.listForTenantAdmin(user.tenantId, { status: query.status }, { skip, take });
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Roles(UserRole.CLIENT, UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.CREATE}`,
    )
    @ApiOperation({ summary: 'Suscribir una mascota a un plan' })
    subscribe(
        @CurrentUser() user: JwtPayload,
        @Body() dto: SubscribeToPlanDto,
    ) {
        return this.service.subscribe(user, dto);
    }

    @Patch(':id/cancel')
    @Roles(UserRole.CLIENT, UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Cancelar una suscripción' })
    cancel(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: CancelSubscriptionDto,
    ) {
        return this.service.cancel(user, id, dto);
    }

    @Patch(':id/pause')
    @Roles(UserRole.CLIENT)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Pausar la auto-renovación' })
    pause(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.pause(user, id);
    }

    @Patch(':id/resume')
    @Roles(UserRole.CLIENT)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Reanudar la auto-renovación' })
    resume(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.resume(user, id);
    }

    /** Endpoint utilitario administrativo (no en UI). */
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.DELETE}`,
    )
    @ApiOperation({ summary: 'Cancelar y marcar como CANCELLED (alias)' })
    async hardCancel(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
    ) {
        await this.service.cancel(user, id, { reason: 'Hard cancel from admin' });
    }

    /**
     * Reporte de intentos de cobro fallidos del tenant.
     * Alimenta el dashboard `/clinic/billing-attempts` (Fase 2 · Slice 2).
     */
    @Get('billing-failures/report')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.READ}`,
    )
    @ApiOperation({
        summary: 'Reporte de intentos de cobro fallidos (últimos 30 días por defecto)',
    })
    async billingFailureReport(
        @CurrentUser() user: JwtPayload,
        @Query() query: { since?: string; page?: string; pageSize?: string },
    ) {
        const since = query.since ? new Date(query.since) : undefined;
        const page = query.page ? Number(query.page) : undefined;
        const pageSize = query.pageSize ? Number(query.pageSize) : undefined;
        return this.service.getBillingFailureReport(user.tenantId, {
            since,
            page,
            pageSize,
        });
    }
}
