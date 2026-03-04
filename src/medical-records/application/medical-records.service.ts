// Medical Records Module
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { IMedicalRecordRepository, MEDICAL_RECORD_REPOSITORY } from '../domain/medical-record.repository';

@Injectable()
export class MedicalRecordsService {
    constructor(
        @Inject(MEDICAL_RECORD_REPOSITORY) private readonly medicalRecordRepo: IMedicalRecordRepository,
        private storage: StorageService,
    ) { }

    async findAll(tenantId: string, petId: string, query: PaginationQueryDto) {
        const petExists = await this.medicalRecordRepo.petExists(tenantId, petId);
        if (!petExists) throw new NotFoundException('Pet not found');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.medicalRecordRepo.findAll(tenantId, petId, { skip, take });
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const record = await this.medicalRecordRepo.findOne(tenantId, id);
        if (!record) throw new NotFoundException('Medical record not found');
        return record;
    }

    async create(tenantId: string, vetId: string, dto: {
        petId: string; appointmentId?: string; chiefComplaint: string;
        diagnosis: string; treatment: string; prescriptions?: string;
        notes?: string; weight?: number; temperature?: number; heartRate?: number;
    }) {
        const petExists = await this.medicalRecordRepo.petExists(tenantId, dto.petId);
        if (!petExists) throw new NotFoundException('Pet not found');

        return this.medicalRecordRepo.create({ ...dto, tenantId, vetId });
    }

    async update(tenantId: string, id: string, dto: Partial<{ chiefComplaint: string; diagnosis: string; treatment: string; prescriptions: string; notes: string }>) {
        const record = await this.medicalRecordRepo.findRecord(tenantId, id);
        if (!record) throw new NotFoundException('Medical record not found');
        return this.medicalRecordRepo.update(tenantId, id, dto);
    }

    async registerAttachment(
        tenantId: string,
        uploadedBy: string,
        medicalRecordId: string,
        dto: { key: string; filename: string; contentType: string; size: number },
    ) {
        const record = await this.medicalRecordRepo.findRecord(tenantId, medicalRecordId);
        if (!record) throw new NotFoundException('Medical record not found');

        return this.medicalRecordRepo.createAttachment({
            tenantId,
            medicalRecordId,
            uploadedBy,
            key: dto.key,
            filename: dto.filename,
            contentType: dto.contentType,
            size: dto.size,
        });
    }
}