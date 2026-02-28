import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { ClientsService } from './clients.service';

@ApiTags('clients')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
@Controller({ path: 'clients', version: '1' })
export class ClientsController {
    constructor(private readonly service: ClientsService) { }

    @Get()
    @Permissions(`${PermissionModule.CLIENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List tenant clients (role CLIENT)' })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.service.findAll(user.tenantId, query);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.CLIENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get one client by id' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Post()
    @Permissions(`${PermissionModule.CLIENTS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create client user' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateClientDto) {
        return this.service.create(user.tenantId, dto);
    }

    @Patch(':id')
    @Permissions(`${PermissionModule.CLIENTS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update client user' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateClientDto) {
        return this.service.update(user.tenantId, id, dto);
    }
}
