import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { VaccinationsService } from './vaccinations.service';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto/vaccination.dto';

@ApiTags('vaccinations')
@ApiBearerAuth('JWT')
@Controller({ path: 'vaccinations', version: '1' })
export class VaccinationsController {
    constructor(private service: VaccinationsService) { }

    @Get()
    @Permissions(`${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List vaccination records for a pet' })
    findAll(@CurrentUser() user: JwtPayload, @Query('petId') petId: string, @Query() query: PaginationQueryDto) {
        return this.service.findAll(user.tenantId, petId, query);
    }

    @Get('upcoming')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get upcoming vaccinations due in next N days' })
    @ApiQuery({ name: 'days', required: false, example: 30 })
    upcoming(@CurrentUser() user: JwtPayload, @Query('days') days?: number) {
        return this.service.findUpcoming(user.tenantId, days ? Number(days) : 30);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(`${PermissionModule.VACCINATIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Record a vaccination' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateVaccinationDto) {
        return this.service.create(user.tenantId, user.sub, dto);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get vaccination record by ID' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(`${PermissionModule.VACCINATIONS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update a vaccination record' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateVaccinationDto) {
        return this.service.update(user.tenantId, id, dto);
    }
}

