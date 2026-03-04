import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('branches')
@ApiBearerAuth('JWT')
@Controller({ path: 'branches', version: '1' })
export class BranchesController {
    constructor(private branchesService: BranchesService) { }

    @Get()
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar sucursales del tenant' })
    @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
    findAll(
        @CurrentUser() user: JwtPayload,
        @Query('onlyActive') onlyActive?: string,
    ) {
        return this.branchesService.findAll(user.tenantId, onlyActive === 'true');
    }

    @Get(':id')
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Obtener detalle de una sucursal' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.branchesService.findOne(user.tenantId, id);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear una nueva sucursal' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBranchDto) {
        return this.branchesService.create(user.tenantId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Actualizar información de una sucursal' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateBranchDto,
    ) {
        return this.branchesService.update(user.tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.DELETE}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Eliminar una sucursal (solo si no tiene citas)' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.branchesService.remove(user.tenantId, id);
    }

    @Post(':id/transfer-users/:targetId')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.BRANCHES}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Reasignar todos los usuarios de una sucursal a otra' })
    transferUsers(
        @CurrentUser() user: JwtPayload,
        @Param('id') fromBranchId: string,
        @Param('targetId') toBranchId: string,
    ) {
        return this.branchesService.transferUsers(user.tenantId, fromBranchId, toBranchId);
    }
}
