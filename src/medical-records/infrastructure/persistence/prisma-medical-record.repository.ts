import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IMedicalRecordRepository,
    CreateMedicalRecordData,
    CreateAttachmentData,
} from '../../domain/medical-record.repository';

@Injectable()
export class PrismaMedicalRecordRepository implements IMedicalRecordRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        petId: string,
        query: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId, petId };
        const [data, total] = await Promise.all([
            this.prisma.medicalRecord.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createdAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.medicalRecord.count({ where }),
        ]);
        return { data, total };
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.medicalRecord.findFirst({
            where: { id, tenantId },
            include: {
                pet: {
                    select: {
                        id: true,
                        name: true,
                        species: true,
                        owner: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
                vet: { select: { id: true, firstName: true, lastName: true } },
                appointment: { select: { id: true, scheduledAt: true, type: true } },
                fileAttachments: true,
            },
        });
    }

    async petExists(tenantId: string, petId: string): Promise<boolean> {
        const count = await this.prisma.pet.count({ where: { id: petId, tenantId } });
        return count > 0;
    }

    async findRecord(tenantId: string, id: string): Promise<{ id: string } | null> {
        return this.prisma.medicalRecord.findFirst({ where: { id, tenantId }, select: { id: true } });
    }

    async create(data: CreateMedicalRecordData): Promise<unknown> {
        return this.prisma.medicalRecord.create({
            data: { ...data, attachments: [] },
            include: { vet: { select: { id: true, firstName: true, lastName: true } } },
        });
    }

    async update(
        tenantId: string,
        id: string,
        data: Partial<Pick<CreateMedicalRecordData, 'chiefComplaint' | 'diagnosis' | 'treatment' | 'prescriptions' | 'notes'>>,
    ): Promise<unknown> {
        return this.prisma.medicalRecord.update({ where: { id }, data });
    }

    async createAttachment(data: CreateAttachmentData): Promise<unknown> {
        return this.prisma.medicalRecordAttachment.create({ data });
    }
}
