import { Module } from '@nestjs/common';
import { AestheticsController } from './aesthetics.controller';
import { AestheticsService } from './aesthetics.service';

@Module({ controllers: [AestheticsController], providers: [AestheticsService], exports: [AestheticsService] })
export class AestheticsModule { }
