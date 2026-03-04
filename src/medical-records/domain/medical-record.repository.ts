export interface CreateMedicalRecordData {
    tenantId: string;
    petId: string;
    vetId: string;
    appointmentId?: string;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    prescriptions?: string;
    notes?: string;
    weight?: number;
    temperature?: number;
    heartRate?: number;
}

export interface CreateAttachmentData {
    tenantId: string;
    medicalRecordId: string;
    uploadedBy: string;
    key: string;
    filename: string;
    contentType: string;
    size: number;
}

export interface IMedicalRecordRepository {
    findAll(
        tenantId: string,
        petId: string,
        query: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    petExists(tenantId: string, petId: string): Promise<boolean>;
    create(data: CreateMedicalRecordData): Promise<unknown>;
    update(
        tenantId: string,
        id: string,
        data: Partial<Pick<CreateMedicalRecordData, 'chiefComplaint' | 'diagnosis' | 'treatment' | 'prescriptions' | 'notes'>>,
    ): Promise<unknown>;
    createAttachment(data: CreateAttachmentData): Promise<unknown>;
    findRecord(tenantId: string, id: string): Promise<{ id: string } | null>;
}

export const MEDICAL_RECORD_REPOSITORY = Symbol('IMedicalRecordRepository');
