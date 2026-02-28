import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
    let guard: JwtAuthGuard;
    let jwtService: JwtService;
    let configService: ConfigService;
    let reflector: Reflector;

    const mockPayload = { sub: 'user-1', tenantId: 'tenant-1', role: 'CLINIC_ADMIN', email: 'o@c.com' };

    beforeEach(() => {
        jwtService = { verify: jest.fn().mockReturnValue(mockPayload) } as unknown as JwtService;
        configService = { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService;
        reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as Reflector;
        guard = new JwtAuthGuard(jwtService, configService, reflector);
    });

    function createContext(headers: Record<string, string>): ExecutionContext {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ headers }),
            }),
            getHandler: () => ({}),
            getClass: () => ({}),
        } as ExecutionContext;
    }

    it('allows request when token is valid and sets user and tenantId', async () => {
        const ctx = createContext({
            authorization: 'Bearer valid-token',
            'x-tenant-id': 'tenant-1',
        });
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        const req = ctx.switchToHttp().getRequest();
        expect(req.user).toEqual(mockPayload);
        expect(req.tenantId).toBe('tenant-1');
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'secret' });
    });

    it('throws when x-tenant-id does not match token tenantId', async () => {
        const ctx = createContext({
            authorization: 'Bearer valid-token',
            'x-tenant-id': 'other-tenant',
        });
        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('x-tenant-id does not match token');
    });

    it('throws when x-tenant-id header is missing', async () => {
        const ctx = createContext({
            authorization: 'Bearer valid-token',
        });
        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('x-tenant-id header is required');
    });

    it('allows when x-tenant-id matches token tenantId', async () => {
        const ctx = createContext({
            authorization: 'Bearer valid-token',
            'x-tenant-id': 'tenant-1',
        });
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        expect(ctx.switchToHttp().getRequest().tenantId).toBe('tenant-1');
    });

    it('throws when no authorization header', async () => {
        const ctx = createContext({});
        await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
        await expect(guard.canActivate(ctx)).rejects.toThrow('No authorization token provided');
    });

    it('returns true for public routes without validating token', async () => {
        reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
        const ctx = createContext({});
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        expect(jwtService.verify).not.toHaveBeenCalled();
    });
});
