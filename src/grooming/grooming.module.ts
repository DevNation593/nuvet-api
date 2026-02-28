import { Module } from '@nestjs/common';
import { AestheticsModule } from '../aesthetics/aesthetics.module';
import { GroomingController } from './grooming.controller';

@Module({
    imports: [AestheticsModule],
    controllers: [GroomingController],
})
export class GroomingModule { }
