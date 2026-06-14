import { Module, Global, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('RedisModule');
                const url = configService.get<string>('redis.url');

                if (!url) {
                    logger.warn('REDIS_URL not configured — using in-memory noop client');
                    return createNoopRedis();
                }

                const client = new Redis(url, {
                    maxRetriesPerRequest: 3,
                    lazyConnect: false,
                    retryStrategy(times) {
                        if (times > 5) return null;
                        return Math.min(times * 200, 2000);
                    },
                });
                client.on('connect', () => logger.log('Redis connected'));
                client.on('error', (err) => logger.error('Redis error', err.message));
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async onModuleDestroy() {
        if (typeof this.redis.quit === 'function') {
            await this.redis.quit().catch(() => {});
        }
    }
}

function createNoopRedis(): Partial<Redis> {
    const store = new Map<string, string>();
    return {
        get: async (key: string) => store.get(key) ?? null,
        set: async (key: string, value: string) => { store.set(key, value); return 'OK'; },
        del: async (...keys: string[]) => { keys.forEach((k) => store.delete(k)); return keys.length; },
        expire: async () => 1,
        ttl: async () => -1,
        exists: async (...keys: string[]) => keys.filter((k) => store.has(k)).length,
        incr: async (key: string) => { const v = parseInt(store.get(key) ?? '0', 10) + 1; store.set(key, String(v)); return v; },
        quit: async () => 'OK',
        status: 'ready',
        on: () => ({} as any),
    } as unknown as Redis;
}
