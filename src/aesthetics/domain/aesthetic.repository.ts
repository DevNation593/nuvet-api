import { AestheticStatus } from '@nuvet/types';

export interface CreateAestheticData {
    tenantId: string;
    petId: string;
    groomerId: string;
    appointmentId?: string;
    serviceName: string;
    scheduledAt: Date;
    price?: number;
    notes?: string;
}

export interface IAestheticRepository {
    findAll(
        tenantId: string,
        query: { skip: number; take: number },
        groomerId?: string,
        status?: AestheticStatus,
    ): Promise<{ data: unknown[]; total: number }>;
    create(data: CreateAestheticData): Promise<unknown>;
    update(tenantId: string, id: string, data: Partial<Omit<CreateAestheticData, 'tenantId'>>): Promise<unknown>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
}

export const AESTHETIC_REPOSITORY = Symbol('IAestheticRepository');
