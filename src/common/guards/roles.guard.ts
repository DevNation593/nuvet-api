import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@nuvet/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No roles required → allow all authenticated users
        if (!requiredRoles || requiredRoles.length === 0) return true;

        const { user } = context.switchToHttp().getRequest();

        if (!user?.role) {
            throw new ForbiddenException('No role assigned to this user');
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException(
                `This action requires one of: ${requiredRoles.join(', ')}`,
            );
        }

        return true;
    }
}
