import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
    AppPermission,
    getEffectivePermissions,
    TenantPlan,
} from '@nuvet/types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<AppPermission[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) return true;

        const { user } = context.switchToHttp().getRequest();

        if (!user?.role) {
            throw new ForbiddenException('No role assigned to this user');
        }

        const effectivePermissions: AppPermission[] =
            Array.isArray(user.permissions) && user.permissions.length > 0
                ? user.permissions
                : (typeof user.tenantPlan === 'string'
                    ? getEffectivePermissions(user.role, user.tenantPlan as TenantPlan)
                    : []);

        const missingPermissions = requiredPermissions.filter(
            (permission) => !effectivePermissions.includes(permission),
        );

        if (missingPermissions.length > 0) {
            throw new ForbiddenException(
                `Missing permissions: ${missingPermissions.join(', ')}`,
            );
        }

        return true;
    }
}
