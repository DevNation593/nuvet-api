import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '@nuvet/types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private reflector: Reflector,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Allow public routes
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No authorization token provided');
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token, {
                secret: this.configService.get<string>('jwt.accessSecret'),
            });
            const headerTenantId = request.headers['x-tenant-id'] as string | undefined;
            if (!headerTenantId) {
                throw new UnauthorizedException('x-tenant-id header is required');
            }
            if (headerTenantId !== payload.tenantId) {
                throw new UnauthorizedException('x-tenant-id does not match token');
            }
            request.user = payload;
            request.tenantId = payload.tenantId;
        } catch (err) {
            if (err instanceof UnauthorizedException) throw err;
            throw new UnauthorizedException('Invalid or expired token');
        }

        return true;
    }

    private extractTokenFromHeader(request: {
        headers: Record<string, string>;
    }): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
