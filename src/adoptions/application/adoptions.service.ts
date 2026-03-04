import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { AdoptionStatus } from '@nuvet/types';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { CreateAdoptionDto, ApplyAdoptionDto, UpdateAdoptionStatusDto } from './dto/adoption.dto';
import { IAdoptionRepository, ADOPTION_REPOSITORY } from '../domain/adoption.repository';

export { CreateAdoptionDto, ApplyAdoptionDto, UpdateAdoptionStatusDto };

@Injectable()
export class AdoptionsService {
    constructor(
        @Inject(ADOPTION_REPOSITORY) private readonly adoptionRepo: IAdoptionRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto, status?: AdoptionStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.adoptionRepo.findAll(tenantId, { skip, take }, status);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const a = await this.adoptionRepo.findOne(tenantId, id);
        if (!a) throw new NotFoundException('Adoption record not found');
        return a;
    }

    async createListing(tenantId: string, dto: CreateAdoptionDto) {
        const petExists = await this.adoptionRepo.petExists(tenantId, dto.petId);
        if (!petExists) throw new NotFoundException('Pet not found');
        return this.adoptionRepo.create({
            tenantId,
            petId: dto.petId,
            status: AdoptionStatus.AVAILABLE,
            notes: dto.notes,
        });
    }

    async submitApplication(tenantId: string, id: string, dto: ApplyAdoptionDto, applicantId?: string) {
        await this.findOne(tenantId, id);
        return this.adoptionRepo.update(id, {
            status: AdoptionStatus.PENDING,
            applicantId,
            applicantName: dto.applicantName,
            applicantEmail: dto.applicantEmail,
            applicantPhone: dto.applicantPhone,
            notes: dto.notes,
        });
    }

    async updateStatus(tenantId: string, id: string, dto: UpdateAdoptionStatusDto) {
        await this.findOne(tenantId, id);
        return this.adoptionRepo.update(id, {
            status: dto.status,
            rejectionReason: dto.rejectionReason,
        });
    }
}
