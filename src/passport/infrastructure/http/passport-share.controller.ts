import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { PassportService } from '../../application/passport.service';
import { PassportPublicPet } from '../../application/dto/passport.dto';

/**
 * Endpoints PÚBLICOS del pasaporte. La autenticación la da el token
 * (validado en el servicio). No llevan `@ApiBearerAuth('JWT')` ni
 * `@Roles()` — la marca `@Public()` exime del JwtAuthGuard global.
 */
@ApiTags('passport-public')
@Controller({ path: 'passport/shares', version: '1' })
export class PassportShareController {
    constructor(private readonly service: PassportService) {}

    @Public()
    @Get(':token')
    @ApiOperation({
        summary:
            'Read a pet passport using a share token. Public — token is the credential.',
    })
    @ApiResponse({ status: 200, type: PassportPublicPet })
    @ApiResponse({ status: 403, description: 'Token revoked or expired' })
    @ApiResponse({ status: 404, description: 'Token not found' })
    async getByToken(
        @Param('token') token: string,
        @Req() req: Request,
    ): Promise<PassportPublicPet> {
        const ip =
            (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
            req.ip ??
            req.socket?.remoteAddress ??
            undefined;
        const userAgent = (req.headers['user-agent'] as string | undefined) ?? undefined;
        return this.service.getByShareToken(token, { ipAddress: ip, userAgent });
    }
}
