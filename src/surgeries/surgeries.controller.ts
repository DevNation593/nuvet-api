import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SurgeriesService, CreateSurgeryDto, UpdateSurgeryDto } from './surgeries.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, SurgeryStatus, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';

@ApiTags('surgeries')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
@Controller({ path: 'surgeries', version: '1' })
export class SurgeriesController {
    constructor(private service: SurgeriesService) { }

    @Get()
    @Permissions(`${PermissionModule.SURGERIES}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List surgeries, filtered by vet or status' })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto, @Query('vetId') vetId?: string, @Query('status') status?: SurgeryStatus) {
        return this.service.findAll(user.tenantId, query, vetId, status);
    }

    @Post()
    @Permissions(`${PermissionModule.SURGERIES}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Schedule a surgery' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSurgeryDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.SURGERIES}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get surgery details' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Permissions(`${PermissionModule.SURGERIES}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update surgery details or status' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSurgeryDto) {
        return this.service.update(user.tenantId, id, dto);
    }
}

