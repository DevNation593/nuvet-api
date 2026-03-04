import { Controller, Get } from '@nestjs/common';
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

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private prismaHealth: PrismaHealthIndicator,
        private memory: MemoryHealthIndicator,
        private prisma: PrismaService,
        private healthService: HealthService,
    ) { }

    @Get()
    @Public()
    @HealthCheck()
    @ApiOperation({ summary: 'Check API health status' })
    async check() {
        return this.health.check([
            () => this.prismaHealth.pingCheck('database', this.prisma),
            () => this.healthService.checkRedis(),
            () => this.healthService.checkS3(),
            () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
        ]);
    }
}
