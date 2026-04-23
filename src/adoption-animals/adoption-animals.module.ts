import { Module } from '@nestjs/common';
import { AdoptionAnimalsController } from './infrastructure/http/adoption-animals.controller';
import { AdoptionAnimalsService } from './application/adoption-animals.service';
import { PrismaAdoptionAnimalRepository } from './infrastructure/persistence/prisma-adoption-animal.repository';
import { ADOPTION_ANIMAL_REPOSITORY } from './domain/adoption-animal.repository';

@Module({
    controllers: [AdoptionAnimalsController],
    providers: [
        { provide: ADOPTION_ANIMAL_REPOSITORY, useClass: PrismaAdoptionAnimalRepository },
        AdoptionAnimalsService,
    ],
})
export class AdoptionAnimalsModule {}
