import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuditService } from '../../application/audit.service';
import { AuditLogQueryDto } from '../../application/dto/audit-log-query.dto';

@ApiTags('audit')
@ApiBearerAuth('JWT')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditController {
    constructor(private readonly auditService: AuditService) {}

    @Get()
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(`${PermissionModule.REPORTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar eventos de auditoria del tenant' })
    listLogs(@CurrentUser() user: JwtPayload, @Query() query: AuditLogQueryDto) {
        return this.auditService.listLogs(user.tenantId, query);
    }
}
