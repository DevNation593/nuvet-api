import type { VaccinationCampaignStatus, VaccinationRegistrationStatus } from '@prisma/client';

/**
 * Domain layer del módulo `vaccination-campaigns` (Fase 3 · Slice 1).
 *
 * Sigue el patrón del resto del repo: `registerX` + token DI +
 * implementación Prisma en `infrastructure/persistence`.
 */

// ── VaccinationCampaign ───────────────────────────────────────────────────

export interface VaccinationCampaignEntity {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    vaccineName: string;
    startsAt: Date;
    endsAt: Date;
    location: string | null;
    capacity: number | null;
    priceCents: number;
    currency: string;
    status: VaccinationCampaignStatus;
    notes: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    /** JOIN opcional: total de registros. */
    registrationCount?: number;
}

export interface CreateCampaignData {
    tenantId: string;
    name: string;
    description?: string;
    vaccineName: string;
    startsAt: Date;
    endsAt: Date;
    location?: string;
    capacity?: number;
    priceCents?: number;
    currency?: string;
    notes?: string;
    createdById: string;
}

export interface UpdateCampaignData {
    name?: string;
    description?: string;
    vaccineName?: string;
    startsAt?: Date;
    endsAt?: Date;
    location?: string;
    capacity?: number;
    priceCents?: number;
    currency?: string;
    notes?: string;
    status?: VaccinationCampaignStatus;
}

export interface ListCampaignsFilter {
    status?: VaccinationCampaignStatus;
    fromDate?: Date;
    toDate?: Date;
}

export interface IVaccinationCampaignRepository {
    create(data: CreateCampaignData): Promise<VaccinationCampaignEntity>;
    findOne(tenantId: string, id: string): Promise<VaccinationCampaignEntity | null>;
    findByTenant(
        tenantId: string,
        filter: ListCampaignsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationCampaignEntity[]; total: number }>;
    update(
        tenantId: string,
        id: string,
        data: UpdateCampaignData,
    ): Promise<VaccinationCampaignEntity>;
    delete(tenantId: string, id: string): Promise<void>;
}

export const VACCINATION_CAMPAIGN_REPOSITORY = Symbol(
    'IVaccinationCampaignRepository',
);

// ── VaccinationRegistration ───────────────────────────────────────────────

export interface VaccinationRegistrationEntity {
    id: string;
    tenantId: string;
    campaignId: string;
    petId: string;
    ownerId: string;
    status: VaccinationRegistrationStatus;
    attendedAt: Date | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    /** JOIN opcional: info del pet y del owner para mostrar en la UI. */
    pet?: { id: string; name: string; species: string };
    owner?: { id: string; firstName: string; lastName: string; email: string };
}

export interface CreateRegistrationData {
    tenantId: string;
    campaignId: string;
    petId: string;
    ownerId: string;
    notes?: string;
}

export interface UpdateRegistrationData {
    status?: VaccinationRegistrationStatus;
    attendedAt?: Date;
    notes?: string;
}

export interface IVaccinationRegistrationRepository {
    create(data: CreateRegistrationData): Promise<VaccinationRegistrationEntity>;
    findOneGlobal(id: string): Promise<VaccinationRegistrationEntity | null>;
    findOneByCampaignAndPet(
        campaignId: string,
        petId: string,
    ): Promise<VaccinationRegistrationEntity | null>;
    findByCampaign(
        campaignId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationRegistrationEntity[]; total: number }>;
    findByOwner(
        ownerId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationRegistrationEntity[]; total: number }>;
    update(
        id: string,
        data: UpdateRegistrationData,
    ): Promise<VaccinationRegistrationEntity>;
    delete(id: string): Promise<void>;
}

export const VACCINATION_REGISTRATION_REPOSITORY = Symbol(
    'IVaccinationRegistrationRepository',
);
