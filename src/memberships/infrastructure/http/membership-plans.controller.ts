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
    ApiResponse,
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
import { Public } from '../../../common/decorators/public.decorator';
import { MembershipPlansService } from '../../application/membership-plans.service';
import {
    CreateMembershipPlanDto,
    UpdateMembershipPlanDto,
} from '../../application/dto/membership-plan.dto';

@ApiTags('memberships')
@Controller({ path: 'memberships/plans', version: '1' })
export class MembershipPlansController {
    constructor(private readonly service: MembershipPlansService) {}

    /**
     * Catálogo público por tenant. Sin auth — la landing page y la
     * app mobile lo consumen sin requerir login.
     *
     * Para Fase 1.5 / cuando se necesite, `tenantId` se resuelve por
     * subdominio. Esta vuelta lo recibe como query param.
     */
    @Public()
    @Get()
    @ApiOperation({ summary: 'Listar planes activos del tenant (público)' })
    listPublic(
        @Query('tenantId') tenantId: string,
        @Query('onlyActive') onlyActive: string,
    ) {
        return this.service.listCatalog(
            tenantId,
            onlyActive !== 'false', // default true
        );
    }

    @Get('me')
    @ApiBearerAuth('JWT')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.READ}`,
    )
    @ApiOperation({ summary: 'Listar planes del propio tenant (incluye inactivos)' })
    listAllForTenant(@CurrentUser() user: JwtPayload) {
        return this.service.listCatalog(user.tenantId, false);
    }

    @Post()
    @ApiBearerAuth('JWT')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.CREATE}`,
    )
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear un plan (CLINIC_ADMIN)' })
    create(
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateMembershipPlanDto,
    ) {
        return this.service.create(user.tenantId, dto);
    }

    @Patch(':id')
    @ApiBearerAuth('JWT')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Modificar un plan' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateMembershipPlanDto,
    ) {
        return this.service.update(user.tenantId, id, dto);
    }

    @Delete(':id')
    @ApiBearerAuth('JWT')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.DELETE}`,
    )
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Soft-delete (isActive=false) un plan' })
    async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        await this.service.remove(user.tenantId, id);
    }
}
