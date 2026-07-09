import { Module } from '@nestjs/common';
import { VaccinationsController } from './infrastructure/http/vaccinations.controller';
import { VaccinationCampaignsController } from './infrastructure/http/vaccination-campaigns.controller';
import { VaccinationsService } from './application/vaccinations.service';
import { VaccinationCampaignsService } from './application/vaccination-campaigns.service';
import { PrismaVaccinationRepository } from './infrastructure/persistence/prisma-vaccination.repository';
import { PrismaVaccinationCampaignRepository, PrismaVaccinationRegistrationRepository } from './infrastructure/persistence/prisma-vaccination-campaign.repository';
import { VACCINATION_REPOSITORY } from './domain/vaccination.repository';
import {
    VACCINATION_CAMPAIGN_REPOSITORY,
    VACCINATION_REGISTRATION_REPOSITORY,
} from './domain/vaccination-campaign.repository';

@Module({
    controllers: [VaccinationsController, VaccinationCampaignsController],
    providers: [
        { provide: VACCINATION_REPOSITORY, useClass: PrismaVaccinationRepository },
        {
            provide: VACCINATION_CAMPAIGN_REPOSITORY,
            useClass: PrismaVaccinationCampaignRepository,
        },
        {
            provide: VACCINATION_REGISTRATION_REPOSITORY,
            useClass: PrismaVaccinationRegistrationRepository,
        },
        VaccinationsService,
        VaccinationCampaignsService,
    ],
    exports: [VaccinationsService, VaccinationCampaignsService],
})
export class VaccinationsModule {}
