// Medical Records Module
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

@Injectable()
export class MedicalRecordsService {
    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
    ) { }

    async findAll(tenantId: string, petId: string, query: PaginationQueryDto) {
        const pet = await this.prisma.pet.findFirst({ where: { id: petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const [records, total] = await Promise.all([
            this.prisma.medicalRecord.findMany({
                where: { tenantId, petId },
                skip, take,
                orderBy: { createdAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.medicalRecord.count({ where: { tenantId, petId } }),
        ]);
        return buildPaginatedResponse(records, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const record = await this.prisma.medicalRecord.findFirst({
            where: { id, tenantId },
            include: {
                pet: { select: { id: true, name: true, species: true, owner: { select: { id: true, firstName: true, lastName: true } } } },
                vet: { select: { id: true, firstName: true, lastName: true } },
                appointment: { select: { id: true, scheduledAt: true, type: true } },
                fileAttachments: true,
            },
        });
        if (!record) throw new NotFoundException('Medical record not found');
        return record;
    }

    async create(tenantId: string, vetId: string, dto: {
        petId: string; appointmentId?: string; chiefComplaint: string;
        diagnosis: string; treatment: string; prescriptions?: string;
        notes?: string; weight?: number; temperature?: number; heartRate?: number;
    }) {
        const pet = await this.prisma.pet.findFirst({ where: { id: dto.petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');

        return this.prisma.medicalRecord.create({
            data: { ...dto, tenantId, vetId, attachments: [] },
            include: { vet: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    async update(tenantId: string, id: string, dto: Partial<{ chiefComplaint: string; diagnosis: string; treatment: string; prescriptions: string; notes: string }>) {
        const record = await this.prisma.medicalRecord.findFirst({ where: { id, tenantId } });
        if (!record) throw new NotFoundException('Medical record not found');
        return this.prisma.medicalRecord.update({ where: { id }, data: dto });
    }

    async registerAttachment(
        tenantId: string,
        uploadedBy: string,
        medicalRecordId: string,
        dto: { key: string; filename: string; contentType: string; size: number },
    ) {
        const record = await this.prisma.medicalRecord.findFirst({
            where: { id: medicalRecordId, tenantId },
        });
        if (!record) throw new NotFoundException('Medical record not found');

        return this.prisma.medicalRecordAttachment.create({
            data: {
                tenantId,
                medicalRecordId,
                key: dto.key,
                filename: dto.filename,
                contentType: dto.contentType,
                size: dto.size,
                uploadedBy,
            },
        });
    }
}
