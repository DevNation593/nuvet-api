import { Module } from '@nestjs/common';
import { AestheticsModule } from '../aesthetics/aesthetics.module';
import { GroomingController } from './infrastructure/http/grooming.controller';

@Module({
    imports: [AestheticsModule],
    controllers: [GroomingController],
})
export class GroomingModule { }
