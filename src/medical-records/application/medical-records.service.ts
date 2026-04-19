// Medical Records Module
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { StorageService } from '../../storage/storage.service';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { IMedicalRecordRepository, MEDICAL_RECORD_REPOSITORY } from '../domain/medical-record.repository';
import { ClinicalDocumentType } from './dto/medical-record.dto';

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

    async registerClinicalDocument(
        tenantId: string,
        uploadedBy: string,
        medicalRecordId: string,
        dto: {
            key: string;
            filename: string;
            contentType: string;
            size: number;
            type: ClinicalDocumentType;
            version: number;
            signatureHash?: string;
            signedAt?: string;
        },
    ) {
        const record = await this.medicalRecordRepo.findRecord(tenantId, medicalRecordId);
        if (!record) throw new NotFoundException('Medical record not found');

        const signatureToken = (dto.signatureHash?.replace(/[^a-zA-Z0-9:_-]/g, '') ?? 'unsigned').slice(0, 48);
        const safeName = dto.filename.replace(/\s+/g, '_');
        const normalizedType = dto.type.toLowerCase();
        const signedAtToken = dto.signedAt ? `--signed-${dto.signedAt}` : '';
        const versionedFilename = `clinical-${normalizedType}-v${dto.version}--sig-${signatureToken}${signedAtToken}--${safeName}`;

        return this.medicalRecordRepo.createAttachment({
            tenantId,
            medicalRecordId,
            uploadedBy,
            key: dto.key,
            filename: versionedFilename,
            contentType: dto.contentType,
            size: dto.size,
        });
    }

    async getClinicalDocumentVersions(tenantId: string, medicalRecordId: string) {
        const record = await this.medicalRecordRepo.findRecord(tenantId, medicalRecordId);
        if (!record) throw new NotFoundException('Medical record not found');

        const attachments = await this.medicalRecordRepo.findAttachmentsByRecord(
            tenantId,
            medicalRecordId,
        );
        const clinicalDocs = attachments
            .map((attachment) => {
                const match = attachment.filename.match(/^clinical-(consent|prescription|report)-v(\d+)--sig-([^-]+)(?:--signed-([^-]+))?--(.+)$/i);
                if (!match) return null;

                return {
                    id: attachment.id,
                    key: attachment.key,
                    filename: attachment.filename,
                    originalFilename: match[5],
                    contentType: attachment.contentType,
                    size: attachment.size,
                    createdAt: attachment.createdAt,
                    type: match[1].toUpperCase(),
                    version: Number(match[2]),
                    signatureHash: match[3] === 'unsigned' ? null : match[3],
                    signedAt: match[4] ?? null,
                };
            })
            .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc));

        const grouped = clinicalDocs.reduce<Record<string, unknown[]>>((acc, doc) => {
            const key = doc.type;
            if (!acc[key]) acc[key] = [];
            acc[key].push(doc);
            return acc;
        }, {});

        for (const typeKey of Object.keys(grouped)) {
            (grouped[typeKey] as Array<{ version: number }>).sort((a, b) => b.version - a.version);
        }

        return {
            medicalRecordId,
            totalDocuments: clinicalDocs.length,
            grouped,
        };
    }
}