import {
    CallHandler,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { HTTP_CACHE_TTL_KEY } from '../decorators/http-cache.decorator';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
    private readonly logger = new Logger(HttpCacheInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<unknown>> {
        const ttl = this.reflector.get<number | undefined>(
            HTTP_CACHE_TTL_KEY,
            context.getHandler(),
        );
        if (!ttl) return next.handle();

        const request = context.switchToHttp().getRequest();
        if (request.method !== 'GET') return next.handle();

        const tenantId = request.headers['x-tenant-id'] ?? 'global';
        const cacheKey = `hcache:${tenantId}:${request.originalUrl}`;

        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return of(JSON.parse(cached));
            }
        } catch (err) {
            this.logger.warn(`Cache read failed for ${cacheKey}`, err);
        }

        return next.handle().pipe(
            tap(async (response) => {
                try {
                    await this.redis.set(cacheKey, JSON.stringify(response), 'EX', ttl);
                } catch (err) {
                    this.logger.warn(`Cache write failed for ${cacheKey}`, err);
                }
            }),
        );
    }
}
