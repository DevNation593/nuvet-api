import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
    JwtPayload,
    PermissionAction,
    PermissionModule,
    UserRole,
} from '@nuvet/types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { ConsentService, ConsentTokenView, RequestContext } from '../../application/consent.service';
import { CreateConsentTokenDto } from '../../application/dto/create-consent-token.dto';
import { UpdateConsentTokenDto } from '../../application/dto/update-consent-token.dto';
import { ValidateConsentTokenDto } from '../../application/dto/validate-consent-token.dto';
import { ConsentAccessLogQueryDto } from '../../application/dto/consent-access-log-query.dto';

/**
 * Controlador del módulo `consent/` (Fase 2 · tokens emitidos por email).
 *
 * Endpoints:
 *   POST /api/v1/consent/tokens              → emitir (issueToken)
 *   POST /api/v1/consent/tokens/validate     → validar/canjear (validateToken)
 *   POST /api/v1/consent/tokens/:id/revoke   → revocar (revokeToken)
 *   GET  /api/v1/consent/access-logs         → auditoría paginada
 *
 * Reglas de acceso:
 *   - CLINIC_ADMIN / VET / RECEPTIONIST / CLIENT pueden emitir tokens
 *     dentro de su propio tenant (CLIENT solo para sí mismo).
 *   - Cualquier usuario autenticado puede intentar validar; el middleware
 *     Prisma scopea la búsqueda al tenant del actor, así que tokens de
 *     otros tenants devuelven NotFound.
 *   - Listar access-logs requiere permisos `consent:read`.
 */
@ApiTags('Consent')
@ApiBearerAuth('JWT')
@UseGuards()
@Controller({ path: 'consent', version: '1' })
@Roles(
    UserRole.CLINIC_ADMIN,
    UserRole.VET,
    UserRole.RECEPTIONIST,
    UserRole.CLIENT,
)
export class ConsentController {
    constructor(private readonly service: ConsentService) {}

    @Post('tokens')
    @HttpCode(HttpStatus.CREATED)
    @Permissions(`${PermissionModule.CONSENT}:${PermissionAction.CREATE}`)
    @ApiOperation({
        summary: 'Emitir un token de consentimiento para un tercero (granteeEmail).',
    })
    @ApiResponse({ status: 201, description: 'Token emitido', type: Object })
    @ApiResponse({ status: 400, description: 'Validación fallida (petIds/expiresAt).' })
    @ApiResponse({ status: 403, description: 'Rol no autorizado o pets fuera del tenant.' })
    issueToken(
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateConsentTokenDto,
        @Req() req: Request,
    ): Promise<ConsentTokenView> {
        return this.service.issueToken(user, dto, this.ctxFromReq(req));
    }

    @Post('tokens/validate')
    @HttpCode(HttpStatus.OK)
    @Permissions(`${PermissionModule.CONSENT}:${PermissionAction.READ}`)
    @ApiOperation({
        summary:
            'Validar/canjear un token por id. Registra una entrada de auditoría ' +
            'con action=VALIDATE en cada intento (exitoso o no).',
    })
    @ApiResponse({ status: 200, description: 'Token vigente', type: Object })
    @ApiResponse({ status: 403, description: 'Token revocado o expirado.' })
    @ApiResponse({ status: 404, description: 'Token no encontrado (o de otro tenant).' })
    validateToken(
        @CurrentUser() user: JwtPayload,
        @Body() dto: ValidateConsentTokenDto,
        @Req() req: Request,
    ): Promise<ConsentTokenView> {
        return this.service.validateToken(user, dto, this.ctxFromReq(req));
    }

    @Post('tokens/:id/revoke')
    @HttpCode(HttpStatus.OK)
    @Permissions(`${PermissionModule.CONSENT}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Revocar un token (status → REVOKED).' })
    @ApiResponse({ status: 200, description: 'Token revocado', type: Object })
    @ApiResponse({ status: 403, description: 'No es el owner ni staff del tenant.' })
    @ApiResponse({ status: 404, description: 'Token no encontrado (o de otro tenant).' })
    revokeToken(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateConsentTokenDto,
        @Req() req: Request,
    ): Promise<ConsentTokenView> {
        return this.service.revokeToken(user, id, dto, this.ctxFromReq(req));
    }

    @Get('access-logs')
    @Permissions(`${PermissionModule.CONSENT}:${PermissionAction.READ}`)
    @ApiOperation({
        summary: 'Listar entradas de auditoría (paginado, filtros opcionales).',
    })
    listAccessLogs(
        @CurrentUser() user: JwtPayload,
        @Query() query: ConsentAccessLogQueryDto,
    ) {
        return this.service.listAccessLogs(user, query);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private ctxFromReq(req: Request): RequestContext {
        const xff = req.headers['x-forwarded-for'];
        const ipHeader = Array.isArray(xff)
            ? xff[0]
            : typeof xff === 'string'
                ? xff.split(',')[0]?.trim()
                : undefined;
        const ipAddress = ipHeader ?? req.ip ?? req.socket?.remoteAddress ?? undefined;
        const uaHeader = req.headers['user-agent'];
        const userAgent = Array.isArray(uaHeader)
            ? uaHeader[0]
            : typeof uaHeader === 'string'
                ? uaHeader
                : undefined;
        return { ipAddress, userAgent };
    }
}