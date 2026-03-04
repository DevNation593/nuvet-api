import { SurgeryStatus } from '@nuvet/types';

export interface CreateSurgeryData {
    tenantId: string;
    petId: string;
    vetId: string;
    type: string;
    scheduledAt: Date;
    status?: SurgeryStatus;
    appointmentId?: string;
    consentSignedAt?: Date;
    consentSignedBy?: string;
    preInstructions?: string;
    postInstructions?: string;
    postOpNotes?: string;
    anesthesiaType?: string;
    durationMinutes?: number;
    notes?: string;
}

export interface ISurgeryRepository {
    findAll(
        tenantId: string,
        query: { skip: number; take: number },
        vetId?: string,
        status?: SurgeryStatus,
    ): Promise<{ data: unknown[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    petExists(tenantId: string, petId: string): Promise<boolean>;
    create(data: CreateSurgeryData): Promise<unknown>;
    update(id: string, data: Partial<Omit<CreateSurgeryData, 'tenantId' | 'petId' | 'vetId' | 'type'>>): Promise<unknown>;
}

export const SURGERY_REPOSITORY = Symbol('ISurgeryRepository');
