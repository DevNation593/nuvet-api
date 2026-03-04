import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './infrastructure/http/health.controller';
import { HealthService } from './application/health.service';

@Module({
    imports: [TerminusModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule { }
