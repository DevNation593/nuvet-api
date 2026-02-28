import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicatorResult } from '@nestjs/terminus';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

@Injectable()
export class HealthService {
    constructor(
        @Inject(REDIS_CLIENT) private redis: Redis,
        private configService: ConfigService,
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
        try {
            const bucket = this.configService.get<string>('s3.bucket', 'nuvet-files');
            const client = new S3Client({
                endpoint: this.configService.get<string>('s3.endpoint'),
                region: this.configService.get<string>('s3.region', 'us-east-1'),
                credentials: {
                    accessKeyId: this.configService.get<string>('s3.accessKey', ''),
                    secretAccessKey: this.configService.get<string>('s3.secretKey', ''),
                },
                forcePathStyle: true,
            });
            await client.send(new HeadBucketCommand({ Bucket: bucket }));
            return { s3: { status: 'up' } };
        } catch {
            return { s3: { status: 'down' } };
        }
    }
}
