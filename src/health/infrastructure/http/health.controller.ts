import { Controller, Get, Res } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    PrismaHealthIndicator,
    MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { HealthService } from '../../application/health.service';
import { MetricsService } from '../../../observability/metrics.service';
import { Response } from 'express';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prismaHealth: PrismaHealthIndicator,
        private memory: MemoryHealthIndicator,
        private prisma: PrismaService,
        private healthService: HealthService,
        private metricsService: MetricsService,
    ) { }

    @Get('live')
    @Public()
    @ApiOperation({ summary: 'Liveness probe (process up)' })
    live() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    @Get(['ready', ''])
    @Public()
    @HealthCheck()
    @ApiOperation({ summary: 'Readiness probe (dependencies health)' })
    async ready() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma),
            () => this.healthService.checkRedis(),
            () => this.healthService.checkS3(),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
        ]);
    }

    @Get('metrics')
    @Public()
    @ApiOperation({ summary: 'Prometheus metrics endpoint' })
    async metrics(@Res() response: Response) {
        response.setHeader('Content-Type', this.metricsService.getContentType());
        response.send(await this.metricsService.getMetrics());
    }
}
