import { Module } from '@nestjs/common';
import { SurgeriesController } from './surgeries.controller';
import { SurgeriesService } from './surgeries.service';

@Module({ controllers: [SurgeriesController], providers: [SurgeriesService] })
export class SurgeriesModule { }
