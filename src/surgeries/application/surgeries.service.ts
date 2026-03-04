import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { SurgeryStatus } from '@nuvet/types';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { CreateSurgeryDto, UpdateSurgeryDto } from './dto/surgery.dto';
import { ISurgeryRepository, SURGERY_REPOSITORY } from '../domain/surgery.repository';

export { CreateSurgeryDto, UpdateSurgeryDto };

@Injectable()
export class SurgeriesService {
    constructor(
        @Inject(SURGERY_REPOSITORY) private readonly surgeryRepo: ISurgeryRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto, vetId?: string, status?: SurgeryStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.surgeryRepo.findAll(tenantId, { skip, take }, vetId, status);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const s = await this.surgeryRepo.findOne(tenantId, id);
        if (!s) throw new NotFoundException('Surgery not found');
        return s;
    }

    async create(tenantId: string, dto: CreateSurgeryDto) {
        const petExists = await this.surgeryRepo.petExists(tenantId, dto.petId);
        if (!petExists) throw new NotFoundException('Pet not found');
        return this.surgeryRepo.create({
            tenantId,
            petId: dto.petId,
            vetId: dto.vetId,
            type: dto.type,
            scheduledAt: new Date(dto.scheduledAt),
            appointmentId: dto.appointmentId,
            consentSignedAt: dto.consentSignedAt ? new Date(dto.consentSignedAt) : undefined,
            consentSignedBy: dto.consentSignedBy,
            preInstructions: dto.preInstructions,
            postInstructions: dto.postInstructions,
            postOpNotes: dto.postOpNotes,
            anesthesiaType: dto.anesthesiaType,
            durationMinutes: dto.durationMinutes,
            notes: dto.notes,
        });
    }

    async update(tenantId: string, id: string, dto: UpdateSurgeryDto) {
        await this.findOne(tenantId, id);
        return this.surgeryRepo.update(id, {
            ...dto,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            consentSignedAt: dto.consentSignedAt ? new Date(dto.consentSignedAt) : undefined,
        });
    }
}
