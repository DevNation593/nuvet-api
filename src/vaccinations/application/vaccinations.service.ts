import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto/vaccination.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { IVaccinationRepository, VACCINATION_REPOSITORY } from '../domain/vaccination.repository';
import { VaccinationStatus } from '@nuvet/types';

@Injectable()
export class VaccinationsService {
    constructor(
        @Inject(VACCINATION_REPOSITORY) private readonly vaccinationRepo: IVaccinationRepository,
    ) {}

    async findAll(tenantId: string, petId: string, query: PaginationQueryDto) {
        const petExists = await this.vaccinationRepo.petExists(tenantId, petId);
        if (!petExists) throw new NotFoundException('Pet not found');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.vaccinationRepo.findAll(tenantId, petId, { skip, take });
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findUpcoming(tenantId: string, daysAhead = 30) {
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);
        return this.vaccinationRepo.findUpcoming(tenantId, until);
    }

    async findOne(tenantId: string, id: string) {
        const v = await this.vaccinationRepo.findOne(tenantId, id);
        if (!v) throw new NotFoundException('Vaccination record not found');
        return v;
    }

    async create(tenantId: string, vetId: string, dto: CreateVaccinationDto) {
        const petExists = await this.vaccinationRepo.petExists(tenantId, dto.petId);
        if (!petExists) throw new NotFoundException('Pet not found');
        return this.vaccinationRepo.create({
            ...dto,
            tenantId,
            vetId,
            status: VaccinationStatus.ADMINISTERED,
            administeredAt: new Date(dto.administeredAt),
            nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
        });
    }

    async update(tenantId: string, id: string, dto: UpdateVaccinationDto) {
        await this.findOne(tenantId, id);
        return this.vaccinationRepo.update(id, {
            ...dto,
            administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
            nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
        });
    }
}
