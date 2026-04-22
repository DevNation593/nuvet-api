import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './prisma-tenant.middleware';

const globalForPrisma = globalThis as unknown as {
    __nuvetPrismaClient?: PrismaClient;
};

/**
 * When running behind a transaction-mode connection pooler (PgBouncer, Supabase
 * pooler on port 6543, etc.), Prisma must disable prepared statements to avoid
 * `prepared statement "s1" already exists` errors. This helper ensures the
 * `pgbouncer=true` query flag is present on serverless deployments.
 * It never hardcodes the URL itself — only toggles the compatibility flag.
 */
function ensurePgBouncerFlag(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        if (!url.searchParams.has('pgbouncer')) {
            url.searchParams.set('pgbouncer', 'true');
        }
        return url.toString();
    } catch {
        return rawUrl;
    }
}

function resolveDatabaseUrl(): string | undefined {
    const raw = process.env.VERCEL && process.env.DATABASE_POOL_URL
        ? process.env.DATABASE_POOL_URL
        : process.env.DATABASE_URL;

    if (!raw) return undefined;

    // On serverless deployments, force pgbouncer compatibility mode so Prisma
    // disables prepared-statement caching (required when connections are
    // recycled between transactions by the pooler).
    if (process.env.VERCEL) {
        return ensurePgBouncerFlag(raw);
    }

    return raw;
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
export class PrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
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
        if (process.env.VERCEL) {
            return;
        }

        const client = getOrCreatePrismaClient();
        await client.$disconnect();
        this.logger.log('Database disconnected');
    }
}

export interface PrismaService extends PrismaClient {}
