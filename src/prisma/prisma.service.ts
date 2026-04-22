import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './prisma-tenant.middleware';

/**
 * In serverless environments (Vercel), each lambda invocation should reuse the
 * PrismaClient across warm starts. We cache the instance on `globalThis` so
 * multiple NestJS module initializations within the same Node process reuse
 * the same underlying connection pool instead of opening new sockets.
 */
const globalForPrisma = globalThis as unknown as {
    __nuvetPrismaClient?: PrismaClient;
};

/**
 * Resolves the database URL from environment variables. Supports an optional
 * pooled URL (`DATABASE_POOL_URL`) for serverless environments that need
 * transaction-mode pooling (e.g. PgBouncer). If not set, falls back to
 * `DATABASE_URL`. Never hardcodes connection strings.
 */
function resolveDatabaseUrl(): string | undefined {
    if (process.env.VERCEL && process.env.DATABASE_POOL_URL) {
        return process.env.DATABASE_POOL_URL;
    }
    return process.env.DATABASE_URL;
}

function getOrCreatePrismaClient(): PrismaClient {
    if (!globalForPrisma.__nuvetPrismaClient) {
        const dbUrl = resolveDatabaseUrl();
        globalForPrisma.__nuvetPrismaClient = new PrismaClient({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ],
            ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
        });
    }
    return globalForPrisma.__nuvetPrismaClient;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ],
        });

        const cachedClient = getOrCreatePrismaClient();
        const extendedClient = cachedClient.$extends(createTenantExtension());
        const serviceKeys = new Set<PropertyKey>(['logger', 'onModuleInit', 'onModuleDestroy']);

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (serviceKeys.has(prop)) {
                    return Reflect.get(target, prop, receiver);
                }

                const extendedValue = Reflect.get(extendedClient as object, prop, extendedClient);
                if (extendedValue !== undefined) {
                    return typeof extendedValue === 'function'
                        ? extendedValue.bind(extendedClient)
                        : extendedValue;
                }

                const baseValue = Reflect.get(cachedClient as object, prop, cachedClient);
                return typeof baseValue === 'function' ? baseValue.bind(cachedClient) : baseValue;
            },
            set(target, prop, value, receiver) {
                if (serviceKeys.has(prop)) {
                    return Reflect.set(target, prop, value, receiver);
                }

                if (Reflect.has(extendedClient as object, prop)) {
                    return Reflect.set(extendedClient as object, prop, value, extendedClient);
                }

                return Reflect.set(cachedClient as object, prop, value, cachedClient);
            },
        }) as unknown as PrismaService;
    }

    async onModuleInit() {
        const client = getOrCreatePrismaClient();
        await client.$connect();
        this.logger.log('Database connected');

        if (process.env.NODE_ENV === 'development') {
            const onFn = (client as unknown as { $on?: (evt: 'query', cb: (e: { duration: number; query: string }) => void) => void }).$on;
            if (typeof onFn === 'function') {
                onFn('query', (event) => {
                    if (event.duration > 500) {
                        this.logger.warn(`Slow query (${event.duration}ms): ${event.query}`);
                    }
                });
            }
        }
    }

    async onModuleDestroy() {
        // In serverless (Vercel), keep the client connected so warm invocations
        // can reuse the same connection pool. Disconnecting here would force
        // each warm invocation to re-establish sockets and exhaust Supabase
        // session-mode slots (EMAXCONNSESSION).
        if (process.env.VERCEL) {
            return;
        }

        const client = getOrCreatePrismaClient();
        await client.$disconnect();
        this.logger.log('Database disconnected');
    }
}
