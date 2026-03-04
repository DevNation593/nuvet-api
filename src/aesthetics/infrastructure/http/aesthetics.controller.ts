import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AestheticsService, CreateAestheticDto, UpdateAestheticDto } from '../../application/aesthetics.service';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, AestheticStatus, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

@ApiTags('aesthetics')
@ApiBearerAuth('JWT')
@Controller({ path: 'aesthetics', version: '1' })
export class AestheticsController {
    constructor(private service: AestheticsService) { }

    @Get()
    @Permissions(`${PermissionModule.AESTHETICS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List aesthetic services with optional filters' })
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
    @ApiOperation({ summary: 'Schedule an aesthetic service' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAestheticDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.GROOMER)
    @Permissions(`${PermissionModule.AESTHETICS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update aesthetic service status or details' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAestheticDto) {
        return this.service.update(user.tenantId, id, dto);
    }
}

