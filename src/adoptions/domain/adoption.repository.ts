import { AdoptionStatus } from '@nuvet/types';

export interface CreateAdoptionData {
    tenantId: string;
    petId: string;
    status: AdoptionStatus;
    notes?: string;
}

export interface UpdateAdoptionApplicationData {
    status: AdoptionStatus;
    applicantId?: string;
    applicantName?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    notes?: string;
    rejectionReason?: string;
}

export interface IAdoptionRepository {
    findAll(
        tenantId: string,
        query: { skip: number; take: number },
        status?: AdoptionStatus,
    ): Promise<{ data: unknown[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    petExists(tenantId: string, petId: string): Promise<boolean>;
    create(data: CreateAdoptionData): Promise<unknown>;
    update(id: string, data: Partial<UpdateAdoptionApplicationData>): Promise<unknown>;
}

export const ADOPTION_REPOSITORY = Symbol('IAdoptionRepository');
