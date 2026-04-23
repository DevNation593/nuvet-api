import { PetSpecies, PetSex } from '@nuvet/types';

export interface AdoptionAnimalData {
    id: string;
    tenantId: string;
    name: string;
    species: PetSpecies;
    breed?: string | null;
    sex: PetSex;
    birthDate?: Date | null;
    color?: string | null;
    weight?: number | null;
    photoUrl?: string | null;
    description?: string | null;
    isNeutered: boolean;
    notes?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateAdoptionAnimalData {
    tenantId: string;
    name: string;
    species: PetSpecies;
    breed?: string;
    sex: PetSex;
    birthDate?: Date;
    color?: string;
    weight?: number;
    photoUrl?: string;
    description?: string;
    isNeutered?: boolean;
    notes?: string;
}

export interface UpdateAdoptionAnimalData {
    name?: string;
    species?: PetSpecies;
    breed?: string;
    sex?: PetSex;
    birthDate?: Date;
    color?: string;
    weight?: number;
    photoUrl?: string;
    description?: string;
    isNeutered?: boolean;
    notes?: string;
    isActive?: boolean;
}

export const ADOPTION_ANIMAL_REPOSITORY = 'ADOPTION_ANIMAL_REPOSITORY';

export interface IAdoptionAnimalRepository {
    findAll(tenantId: string, opts: { skip: number; take: number }): Promise<{ data: AdoptionAnimalData[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<AdoptionAnimalData | null>;
    create(data: CreateAdoptionAnimalData): Promise<AdoptionAnimalData>;
    update(tenantId: string, id: string, data: UpdateAdoptionAnimalData): Promise<AdoptionAnimalData>;
    delete(tenantId: string, id: string): Promise<void>;
}
