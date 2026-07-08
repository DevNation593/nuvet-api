import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
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
import { PaginationQueryDto, buildPaginationArgs } from '../../../common/dto/pagination.dto';
import { ConsentService } from '../../application/consent.service';
import {
    ConsentResponseDto,
    GrantConsentDto,
    ListConsentsQueryDto,
    RevokeConsentDto,
} from '../../application/dto/consent.dto';

@ApiTags('consent')
@ApiBearerAuth('JWT')
@Controller({ path: 'consent', version: '1' })
@Roles(UserRole.CLIENT, UserRole.CLINIC_ADMIN, UserRole.VET)
export class ConsentController {
    constructor(private readonly service: ConsentService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Permissions(
        `${PermissionModule.PASSPORT}:${PermissionAction.CREATE}`,
    )
    @ApiOperation({
        summary: 'Grant a cross-clinic consent for a pet',
    })
    @ApiResponse({ status: 201, type: ConsentResponseDto })
    @ApiResponse({ status: 400, description: 'Invalid input' })
    @ApiResponse({ status: 403, description: 'Not the pet owner' })
    @ApiResponse({ status: 404, description: 'Pet or target tenant not found' })
    grant(
        @CurrentUser() user: JwtPayload,
        @Body() dto: GrantConsentDto,
        @Req() req: Request,
    ): Promise<ConsentResponseDto> {
        return this.service.grant(user, dto, this.ctxFromReq(req));
    }

    @Patch(':id/revoke')
    @HttpCode(HttpStatus.OK)
    @Permissions(
        `${PermissionModule.PASSPORT}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Revoke an active consent' })
    @ApiResponse({ status: 200, type: ConsentResponseDto })
    @ApiResponse({ status: 403, description: 'Not the owner' })
    @ApiResponse({ status: 404, description: 'Consent not found' })
    revoke(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: RevokeConsentDto,
        @Req() req: Request,
    ): Promise<ConsentResponseDto> {
        return this.service.revoke(user, id, dto, this.ctxFromReq(req));
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions(
        `${PermissionModule.PASSPORT}:${PermissionAction.DELETE}`,
    )
    @ApiOperation({ summary: 'Hard-revoke alias (same effect as PATCH /:id/revoke)' })
    async deleteAlias(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Req() req: Request,
    ): Promise<void> {
        await this.service.revoke(
            user,
            id,
            { reason: 'Deleted via DELETE endpoint' },
            this.ctxFromReq(req),
        );
    }

    @Get()
    @Permissions(
        `${PermissionModule.PASSPORT}:${PermissionAction.READ}`,
    )
    @ApiOperation({
        summary:
            'List consents visible to the caller (owners see their own, staff sees their tenant)',
    })
    list(
        @CurrentUser() user: JwtPayload,
        @Query() query: ListConsentsQueryDto & PaginationQueryDto,
    ): Promise<{ data: ConsentResponseDto[]; total: number }> {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        return this.service
            .listMine(user, query, { skip, take })
            .then((result) => ({
                ...result,
                page,
                limit,
                total: result.total,
            }));
    }

    private ctxFromReq(req: Request): { ipAddress?: string; userAgent?: string } {
        const ip =
            (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
            req.ip ??
            req.socket?.remoteAddress ??
            undefined;
        const userAgent =
            (req.headers['user-agent'] as string | undefined) ?? undefined;
        return { ipAddress: ip, userAgent };
    }
}
