import { Module } from '@nestjs/common';
import { AdoptionsController } from './infrastructure/http/adoptions.controller';
import { AdoptionsService } from './application/adoptions.service';
import { PrismaAdoptionRepository } from './infrastructure/persistence/prisma-adoption.repository';
import { ADOPTION_REPOSITORY } from './domain/adoption.repository';

@Module({
    controllers: [AdoptionsController],
    providers: [
        { provide: ADOPTION_REPOSITORY, useClass: PrismaAdoptionRepository },
        AdoptionsService,
    ],
})
export class AdoptionsModule { }