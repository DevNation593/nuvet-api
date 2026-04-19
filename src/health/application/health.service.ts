import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
    constructor(
        @Inject(REDIS_CLIENT) private redis: Redis,
    ) { }

    async checkRedis(): Promise<HealthIndicatorResult> {
        try {
            const pong = await this.redis.ping();
            return {
                redis: {
                    status: pong === 'PONG' ? 'up' : 'down',
                },
            };
        } catch {
            return { redis: { status: 'down' } };
        }
    }

    async checkS3(): Promise<HealthIndicatorResult> {
        return { s3: { status: 'up', message: 'S3 storage disabled' } };
    }
}
