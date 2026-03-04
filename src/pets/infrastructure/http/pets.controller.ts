import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PetsService } from '../../application/pets.service';
import { CreatePetDto, UpdatePetDto } from '../../application/dto/pet.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('pets')
@ApiBearerAuth('JWT')
@Controller({ path: 'pets', version: '1' })
export class PetsController {
    constructor(private petsService: PetsService) { }

    @Get()
    @Permissions(`${PermissionModule.PETS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List pets. Clients see only their own pets.' })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.petsService.findAll(user.tenantId, query, ownerId);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST, UserRole.CLIENT)
    @Permissions(`${PermissionModule.PETS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new pet' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePetDto) {
        const payload = user.role === UserRole.CLIENT ? { ...dto, ownerId: user.sub } : dto;
        return this.petsService.create(user.tenantId, payload);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.PETS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get pet details with recent records' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.petsService.findOne(user.tenantId, id, ownerId);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST, UserRole.CLIENT)
    @Permissions(`${PermissionModule.PETS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update pet information' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdatePetDto,
    ) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.petsService.update(user.tenantId, id, dto, ownerId);
    }

    @Delete(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.PETS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Deactivate pet (CLINIC_ADMIN only, soft-delete)' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.petsService.remove(user.tenantId, id);
    }
}


