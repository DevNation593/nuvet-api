import { Controller, Get, Patch, Delete, Param, Query, HttpCode, HttpStatus, Body, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from '../../application/notifications.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload, UserRole, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
    CreateNotificationTemplateDto,
    TriggerNotificationDto,
    UpdateNotificationTemplateDto,
} from '../../application/dto/notifications.dto';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
    constructor(private service: NotificationsService) { }

    @Get()
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get user notification inbox' })
    @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
    findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto, @Query('unreadOnly') unreadOnly?: boolean) {
        return this.service.findAll(user.tenantId, user.sub, query, Boolean(unreadOnly));
    }

    @Patch(':id/read')
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark a notification as read' })
    markAsRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.markAsRead(user.sub, id);
    }

    @Patch('read-all')
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark all notifications as read' })
    markAllAsRead(@CurrentUser() user: JwtPayload) {
        return this.service.markAllAsRead(user.tenantId, user.sub);
    }

    @Delete(':id')
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Delete a notification' })
    remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.remove(user.sub, id);
    }

    @Get('templates')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List notification templates (tenant + system)' })
    findTemplates(@CurrentUser() user: JwtPayload) {
        return this.service.findTemplates(user.tenantId);
    }

    @Post('templates')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create notification template' })
    createTemplate(@CurrentUser() user: JwtPayload, @Body() dto: CreateNotificationTemplateDto) {
        return this.service.createTemplate(user.tenantId, dto);
    }

    @Patch('templates/:id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update tenant notification template' })
    updateTemplate(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
        return this.service.updateTemplate(user.tenantId, id, dto);
    }

    @Delete('templates/:id')
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Delete tenant notification template' })
    deleteTemplate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.deleteTemplate(user.tenantId, id);
    }

    @Post('triggers')
    @Roles(
        UserRole.CLINIC_ADMIN,
        UserRole.RECEPTIONIST,
        UserRole.VET,
        UserRole.GROOMER,
        UserRole.ADOPTION_MANAGER,
    )
    @Permissions(`${PermissionModule.NOTIFICATIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Trigger a notification template for a user' })
    trigger(@CurrentUser() user: JwtPayload, @Body() dto: TriggerNotificationDto) {
        return this.service.triggerTemplate(user.tenantId, dto);
    }
}
