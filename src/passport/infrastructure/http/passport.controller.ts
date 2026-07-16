import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Query,
    Req,
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
import { PassportService } from '../../application/passport.service';
import {
    CreateShareDto,
    LookupResultDto,
    PassportPublicPet,
    PassportLookupQueryDto,
    ShareResponseDto,
} from '../../application/dto/passport.dto';

@ApiTags('passport')
@ApiBearerAuth('JWT')
@Controller({ path: 'passport', version: '1' })
@Roles(
    UserRole.CLINIC_ADMIN,
    UserRole.VET,
    UserRole.RECEPTIONIST,
    UserRole.CLIENT,
)
export class PassportController {
    constructor(private readonly service: PassportService) {}

    @Get('pets/:petId')
    @Permissions(`${PermissionModule.PASSPORT}:${PermissionAction.READ}`)
    @ApiOperation({
        summary:
            'Get aggregated passport of a pet (same tenant or cross-tenant with active consent)',
    })
    @ApiResponse({ status: 200, type: PassportPublicPet })
    async getPetPassport(
        @CurrentUser() user: JwtPayload,
        @Param('petId') petId: string,
        @Req() req: Request,
    ): Promise<PassportPublicPet> {
        return this.service.getPetPassport(user, petId, this.ctx(req));
    }

    @Get('lookup')
    @Permissions(`${PermissionModule.PASSPORT}:${PermissionAction.READ}`)
    @ApiOperation({
        summary:
            'Cross-tenant lookup by microchip. Staff only. Returns minimal identity, no medical data.',
    })
    @ApiResponse({ status: 200, type: [LookupResultDto] })
    async lookup(
        @CurrentUser() user: JwtPayload,
        @Query() query: PassportLookupQueryDto,
    ): Promise<LookupResultDto[]> {
        return this.service.lookupByMicrochip(user, query.microchip);
    }

    @Post('shares')
    @HttpCode(HttpStatus.CREATED)
    @Permissions(`${PermissionModule.PASSPORT}:${PermissionAction.CREATE}`)
    @ApiOperation({ summary: 'Create a public share token for a pet passport' })
    @ApiResponse({ status: 201, type: ShareResponseDto })
    async createShare(
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateShareDto,
        @Req() req: Request,
    ): Promise<ShareResponseDto> {
        return this.service.createShare(user, dto.petId, dto.ttlDays, this.ctx(req));
    }

    @Get('shares/mine')
    @Permissions(`${PermissionModule.PASSPORT}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List share tokens created by the caller' })
    async listMyShares(
        @CurrentUser() user: JwtPayload,
    ): Promise<ShareResponseDto[]> {
        return this.service.listMyShares(user);
    }

    @Delete('shares/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Permissions(`${PermissionModule.PASSPORT}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Revoke an outstanding share token' })
    async revokeShare(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Req() req: Request,
    ): Promise<void> {
        await this.service.revokeShare(user, id, this.ctx(req));
    }

    private ctx(req: Request): { ipAddress?: string; userAgent?: string } {
        const ip =
            (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
            req.ip ??
            req.socket?.remoteAddress ??
            undefined;
        const userAgent = (req.headers['user-agent'] as string | undefined) ?? undefined;
        return { ipAddress: ip, userAgent };
    }
}
