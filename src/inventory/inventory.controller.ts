import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StoreService } from '../store/store.service';
import { StockAdjustmentDto } from '../store/dto/store.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('inventory')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
@Controller({ path: 'inventory', version: '1' })
export class InventoryController {
    constructor(private storeService: StoreService) { }

    @Post('adjust')
    @Permissions(`${PermissionModule.INVENTORY}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Adjust product stock (IN/OUT/ADJUSTMENT)' })
    adjust(@CurrentUser() user: JwtPayload, @Body() dto: StockAdjustmentDto) {
        return this.storeService.adjustStock(user.tenantId, user.sub, dto);
    }

    @Get('low-stock')
    @Permissions(`${PermissionModule.INVENTORY}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List products below their low stock threshold' })
    lowStock(@CurrentUser() user: JwtPayload) {
        return this.storeService.getLowStockProducts(user.tenantId);
    }
}

