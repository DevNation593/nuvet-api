import { VaccinationStatus } from '@nuvet/types';

export interface CreateVaccinationData {
    tenantId: string;
    petId: string;
    vetId: string;
    vaccineName: string;
    manufacturer?: string;
    lotNumber?: string;
    administeredAt: Date;
    nextDueAt?: Date;
    status: VaccinationStatus;
    notes?: string;
}

export interface IVaccinationRepository {
    findAll(
        tenantId: string,
        petId: string,
        query: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }>;
    findUpcoming(tenantId: string, until: Date): Promise<unknown[]>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    petExists(tenantId: string, petId: string): Promise<boolean>;
    create(data: CreateVaccinationData): Promise<unknown>;
    update(id: string, data: Partial<Omit<CreateVaccinationData, 'tenantId' | 'petId' | 'vetId'>>): Promise<unknown>;
}

export const VACCINATION_REPOSITORY = Symbol('IVaccinationRepository');
