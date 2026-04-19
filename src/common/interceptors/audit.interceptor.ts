import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY, type AuditableOptions } from '../decorators/auditable.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const meta = this.reflector.get<AuditableOptions | undefined>(
            AUDIT_ACTION_KEY,
            context.getHandler(),
        );
        if (!meta) return next.handle();

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    const entityId =
                        request.params?.id ??
                        (response as { id?: string })?.id ??
                        null;

                    await this.prisma.auditLog.create({
                        data: {
                            tenantId: user?.tenantId ?? request.headers?.['x-tenant-id'] ?? 'unknown',
                            action: meta.action,
                            entity: meta.entity,
                            entityId: entityId ? String(entityId) : null,
                            userId: user?.sub ?? null,
                            ipAddress:
                                request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ??
                                request.ip ??
                                null,
                            userAgent: request.headers?.['user-agent'] ?? null,
                            newData: request.body ? JSON.parse(JSON.stringify(request.body)) : null,
                        },
                    });
                } catch (err) {
                    this.logger.warn(`Audit log write failed: ${meta.action} ${meta.entity}`, err);
                }
            }),
        );
    }
}
