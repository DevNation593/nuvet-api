import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StoreService } from '../../application/store.service';
import { CreateProductDto, UpdateProductDto, CreateOrderDto, UpdateOrderStatusDto } from '../../application/dto/store.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('store')
@ApiBearerAuth('JWT')
@Controller({ path: 'store', version: '1' })
export class StoreController {
    constructor(private service: StoreService) { }

    // ── Products ────────────────────────────────────────────────────────────────
    @Get('products')
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List products catalog' })
    findAllProducts(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto, @Query('category') category?: string) {
        return this.service.findAllProducts(user.tenantId, query, category);
    }

    @Post('products')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a product' })
    createProduct(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
        return this.service.createProduct(user.tenantId, dto);
    }

    @Get('products/:id')
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.READ}`)
    findOneProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOneProduct(user.tenantId, id);
    }

    @Patch('products/:id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.UPDATE}`)
    updateProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.service.updateProduct(user.tenantId, id, dto);
    }

    @Delete('products/:id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.DELETE}`)
    deleteProduct(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.deleteProduct(user.tenantId, id);
    }

    // ── Orders ──────────────────────────────────────────────────────────────────
    @Get('orders')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List all orders' })
    findAllOrders(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.service.findAllOrders(user.tenantId, query);
    }

    @Post('orders')
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Place a new order' })
    createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
        return this.service.createOrder(user.tenantId, user.sub, dto);
    }

    @Patch('orders/:id/status')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST, UserRole.INVENTORY)
    @Permissions(`${PermissionModule.STORE}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update order status' })
    updateOrderStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
        return this.service.updateOrderStatus(user.tenantId, id, dto.status);
    }
}

