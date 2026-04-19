import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantsService, UpdateTenantDto, UpdateBillingConfigDto } from '../../application/tenants.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { HttpCache } from '../../../common/decorators/http-cache.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('tenants')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN)
@Controller({ path: 'tenants', version: '1' })
export class TenantsController {
    constructor(private service: TenantsService) { }

    @Get('me')
    @HttpCache(120)
    @Permissions(`${PermissionModule.TENANT_SETTINGS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get current tenant info (CLINIC_ADMIN only)' })
    findMine(@CurrentUser() user: JwtPayload) {
        return this.service.findOne(user.tenantId);
    }

    @Patch('me')
    @Permissions(`${PermissionModule.TENANT_SETTINGS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update clinic settings (CLINIC_ADMIN only)' })
    update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateTenantDto) {
        return this.service.update(user.tenantId, dto);
    }

    @Get('me/billing-config')
    @Permissions(`${PermissionModule.TENANT_SETTINGS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get billing configuration for the tenant' })
    getBillingConfig(@CurrentUser() user: JwtPayload) {
        return this.service.getBillingConfig(user.tenantId);
    }

    @Patch('me/billing-config')
    @Permissions(`${PermissionModule.TENANT_SETTINGS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update billing configuration for the tenant' })
    updateBillingConfig(@CurrentUser() user: JwtPayload, @Body() dto: UpdateBillingConfigDto) {
        return this.service.updateBillingConfig(user.tenantId, dto);
    }
}
