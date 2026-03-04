import { Module } from '@nestjs/common';
import { PetsController } from './infrastructure/http/pets.controller';
import { PetsService } from './application/pets.service';
import { PrismaPetRepository } from './infrastructure/persistence/prisma-pet.repository';
import { PET_REPOSITORY } from './domain/pet.repository';

@Module({
    controllers: [PetsController],
    providers: [
        { provide: PET_REPOSITORY, useClass: PrismaPetRepository },
        PetsService,
    ],
    exports: [PetsService],
})
export class PetsModule { }
