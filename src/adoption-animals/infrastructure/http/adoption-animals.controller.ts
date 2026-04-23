import { Controller, Get, Post, Patch, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdoptionAnimalsService, CreateAdoptionAnimalDto, UpdateAdoptionAnimalDto } from '../../application/adoption-animals.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('adoption-animals')
@ApiBearerAuth('JWT')
@Controller({ path: 'adoption-animals', version: '1' })
export class AdoptionAnimalsController {
    constructor(private service: AdoptionAnimalsService) {}

    @Get()
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List adoption animals for the tenant' })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.service.findAll(user.tenantId, query);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER)
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create an adoption animal' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdoptionAnimalDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get an adoption animal by ID' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER)
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update an adoption animal' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAdoptionAnimalDto) {
        return this.service.update(user.tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER)
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.DELETE}`)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an adoption animal' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.delete(user.tenantId, id);
    }
}
