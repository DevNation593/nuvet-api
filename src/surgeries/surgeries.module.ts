import { Module } from '@nestjs/common';
import { SurgeriesController } from './infrastructure/http/surgeries.controller';
import { SurgeriesService } from './application/surgeries.service';
import { PrismaSurgeryRepository } from './infrastructure/persistence/prisma-surgery.repository';
import { SURGERY_REPOSITORY } from './domain/surgery.repository';

@Module({
    controllers: [SurgeriesController],
    providers: [
        { provide: SURGERY_REPOSITORY, useClass: PrismaSurgeryRepository },
        SurgeriesService,
    ],
})
export class SurgeriesModule { }