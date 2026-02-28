import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { runWithTenant } from '../tenant-context';

/**
 * Runs the request pipeline inside tenant context so Prisma tenant middleware
 * can inject tenantId. Runs after guards (JWT sets request.tenantId).
 * Public routes may have no tenantId; Prisma middleware then does not inject.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const tenantId = request.tenantId as string | undefined;

        if (tenantId) {
            return new Observable((subscriber) => {
                let innerSubscription: { unsubscribe: () => void } | undefined;

                runWithTenant(tenantId, () => {
                    innerSubscription = next.handle().subscribe({
                        next: (value) => subscriber.next(value),
                        error: (error) => subscriber.error(error),
                        complete: () => subscriber.complete(),
                    });
                });

                return () => innerSubscription?.unsubscribe();
            });
        }

        return next.handle();
    }
}
