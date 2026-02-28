import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.USERS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List all clinic staff users (paginated)' })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.usersService.findAll(user.tenantId, query);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.USERS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a new staff user (CLINIC_ADMIN only)' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUserDto) {
        return this.usersService.create(user.tenantId, dto);
    }

    @Get(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.USERS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get a single user by ID' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.usersService.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.USERS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update user details (CLINIC_ADMIN only)' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateUserDto,
    ) {
        return this.usersService.update(user.tenantId, id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.USERS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Deactivate a user (CLINIC_ADMIN only, soft-delete)' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.usersService.remove(user.tenantId, id, user.sub);
    }
}


