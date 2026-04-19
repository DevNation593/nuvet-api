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
                const client = new Redis({
                    host: configService.get<string>('redis.host', 'localhost'),
                    port: configService.get<number>('redis.port', 6379),
                    password: configService.get<string>('redis.password'),
                    maxRetriesPerRequest: 3,
                    lazyConnect: false,
                    retryStrategy(times) {
                        return Math.min(times * 50, 2000);
                    },
                });
                client.on('connect', () => logger.log('Redis connected'));
                client.on('error', (err) => logger.error('Redis error', err));
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async onModuleDestroy() {
        await this.redis.quit();
    }
}
