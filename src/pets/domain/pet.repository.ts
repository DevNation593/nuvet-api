import { PetEntity } from './pet.entity';

export interface CreatePetData {
    tenantId: string;
    ownerId: string;
    name: string;
    species: string;
    breed?: string;
    sex: string;
    birthDate?: Date;
    weight?: number;
    photoUrl?: string;
    microchip?: string;
    color?: string;
    isNeutered?: boolean;
    allergies?: string;
    notes?: string;
}

export interface PetWithDetails extends PetEntity {
    owner: { id: string; firstName: string; lastName: string; email: string; phone?: string | null };
    vaccinations?: unknown[];
    medicalRecords?: unknown[];
}

export interface IPetRepository {
    findAll(tenantId: string, query: { skip: number; take: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }, ownerId?: string): Promise<{ data: PetWithDetails[]; total: number }>;
    findOne(tenantId: string, id: string, ownerId?: string): Promise<PetWithDetails | null>;
    findOwner(tenantId: string, ownerId: string): Promise<{ id: string } | null>;
    create(data: CreatePetData): Promise<PetEntity>;
    update(id: string, data: Partial<CreatePetData>): Promise<PetEntity>;
    softDelete(id: string): Promise<void>;
}

export const PET_REPOSITORY = Symbol('IPetRepository');
