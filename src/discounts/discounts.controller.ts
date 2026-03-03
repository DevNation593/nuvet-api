import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Param,
    Body,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, UpdateDiscountDto, ApplyDiscountDto } from './dto/discount.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@ApiTags('discounts')
@ApiBearerAuth('JWT')
@Controller({ path: 'discounts', version: '1' })
export class DiscountsController {
    constructor(private service: DiscountsService) {}

    // ── CRUD ──────────────────────────────────────────────────────────────────────

    @Post()
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear un descuento' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDiscountDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Get()
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar todos los descuentos (con paginación)' })
    @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
    findAll(
        @CurrentUser() user: JwtPayload,
        @Query() query: PaginationQueryDto,
        @Query('onlyActive') onlyActive?: string,
    ) {
        const active = onlyActive !== undefined ? onlyActive === 'true' : undefined;
        return this.service.findAll(user.tenantId, query, active);
    }

    @Get('active')
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar descuentos activos y vigentes ahora' })
    findActive(@CurrentUser() user: JwtPayload) {
        return this.service.findAllActive(user.tenantId);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Obtener un descuento por ID' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Actualizar un descuento' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateDiscountDto,
    ) {
        return this.service.update(user.tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Desactivar un descuento (soft delete)' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.remove(user.tenantId, id);
    }

    // ── Consultas de aplicación ───────────────────────────────────────────────────

    @Post('preview')
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.READ}`)
    @ApiOperation({
        summary: 'Vista previa: cuánto se ahorra al aplicar un descuento sobre un monto',
    })
    preview(@CurrentUser() user: JwtPayload, @Body() dto: ApplyDiscountDto) {
        return this.service.previewDiscount(user.tenantId, dto.discountId, dto.amount);
    }

    @Get('service/:serviceType')
    @Permissions(`${PermissionModule.DISCOUNTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Descuentos activos para un tipo de servicio' })
    serviceDiscounts(
        @CurrentUser() user: JwtPayload,
        @Param('serviceType') serviceType: string,
    ) {
        return this.service.getActiveServiceDiscounts(user.tenantId, serviceType);
    }
}
