import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@nuvet/types';

/**
 * Extracts the current authenticated user from the request.
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
    (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user: JwtPayload = request.user;
        return data ? user?.[data] : user;
    },
);
