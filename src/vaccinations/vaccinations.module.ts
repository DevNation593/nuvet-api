import { Module } from '@nestjs/common';
import { VaccinationsController } from './infrastructure/http/vaccinations.controller';
import { VaccinationsService } from './application/vaccinations.service';
import { PrismaVaccinationRepository } from './infrastructure/persistence/prisma-vaccination.repository';
import { VACCINATION_REPOSITORY } from './domain/vaccination.repository';

@Module({
    controllers: [VaccinationsController],
    providers: [
        { provide: VACCINATION_REPOSITORY, useClass: PrismaVaccinationRepository },
        VaccinationsService,
    ],
    exports: [VaccinationsService],
})
export class VaccinationsModule { }