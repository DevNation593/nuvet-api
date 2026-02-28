import { Module, Global } from '@nestjs/common';
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
                const client = new Redis({
                    host: configService.get<string>('redis.host', 'localhost'),
                    port: configService.get<number>('redis.port', 6379),
                    password: configService.get<string>('redis.password'),
                    retryStrategy(times) {
                        const delay = Math.min(times * 50, 2000);
                        return delay;
                    },
                });
                client.on('connect', () => console.log('✅ Redis connected'));
                client.on('error', (err) => console.error('❌ Redis error:', err));
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT],
})
export class RedisModule { }
