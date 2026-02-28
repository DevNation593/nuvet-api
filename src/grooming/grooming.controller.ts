import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AestheticsService, CreateAestheticDto, UpdateAestheticDto } from '../aesthetics/aesthetics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { AestheticStatus, JwtPayload, UserRole, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('grooming')
@ApiBearerAuth('JWT')
@Controller({ path: 'grooming', version: '1' })
export class GroomingController {
    constructor(private readonly service: AestheticsService) { }

    @Get()
    @Permissions(`${PermissionModule.AESTHETICS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List grooming services with optional filters' })
    findAll(
        @CurrentUser() user: JwtPayload,
        @Query() query: PaginationQueryDto,
        @Query('groomerId') groomerId?: string,
        @Query('status') status?: AestheticStatus,
    ) {
        const resolvedGroomerId = user.role === UserRole.GROOMER ? user.sub : groomerId;
        return this.service.findAll(user.tenantId, query, resolvedGroomerId, status);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.GROOMER, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.AESTHETICS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Schedule grooming service' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAestheticDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.GROOMER)
    @Permissions(`${PermissionModule.AESTHETICS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update grooming service status or details' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAestheticDto) {
        return this.service.update(user.tenantId, id, dto);
    }
}
