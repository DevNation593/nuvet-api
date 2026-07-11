import type { HomeVetBookingStatus } from '@prisma/client';

/**
 * Domain layer del módulo `home-vet` (Fase 3 · Slice 2).
 *
 * Veterinario a domicilio: un cliente pide una visita, la clínica
 * asigna un vet, el vet asiste en la dirección del cliente.
 */

export interface HomeVetBookingEntity {
    id: string;
    tenantId: string;
    ownerId: string;
    petId: string;
    vetId: string | null;
    scheduledAt: Date;
    address: string;
    addressNotes: string | null;
    reason: string;
    status: HomeVetBookingStatus;
    visitFeeCents: number;
    travelFeeCents: number;
    totalCents: number;
    currency: string;
    visitNotes: string | null;
    diagnosis: string | null;
    internalNotes: string | null;
    cancelReason: string | null;
    cancelledAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    /** JOIN opcional para UI. */
    pet?: { id: string; name: string; species: string };
    owner?: { id: string; firstName: string; lastName: string; email: string };
    vet?: { id: string; firstName: string; lastName: string } | null;
}

export interface CreateHomeVetBookingData {
    tenantId: string;
    ownerId: string;
    petId: string;
    scheduledAt: Date;
    address: string;
    addressNotes?: string;
    reason: string;
    visitFeeCents?: number;
    travelFeeCents?: number;
    totalCents?: number;
    currency?: string;
}

export interface UpdateHomeVetBookingData {
    scheduledAt?: Date;
    address?: string;
    addressNotes?: string | null;
    reason?: string;
    visitFeeCents?: number;
    travelFeeCents?: number;
    totalCents?: number;
    currency?: string;
    visitNotes?: string | null;
    diagnosis?: string | null;
    internalNotes?: string | null;
}

export interface ListHomeVetBookingsFilter {
    status?: HomeVetBookingStatus;
    fromDate?: Date;
    toDate?: Date;
    ownerId?: string;
    vetId?: string;
    petId?: string;
}

export interface IHomeVetBookingRepository {
    create(data: CreateHomeVetBookingData): Promise<HomeVetBookingEntity>;
    findOne(
        tenantId: string,
        id: string,
    ): Promise<HomeVetBookingEntity | null>;
    findByTenant(
        tenantId: string,
        filter: ListHomeVetBookingsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: HomeVetBookingEntity[]; total: number }>;
    findByOwner(
        ownerId: string,
        filter: ListHomeVetBookingsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: HomeVetBookingEntity[]; total: number }>;
    update(
        tenantId: string,
        id: string,
        data: UpdateHomeVetBookingData,
    ): Promise<HomeVetBookingEntity>;
    assignVet(
        tenantId: string,
        id: string,
        vetId: string,
    ): Promise<HomeVetBookingEntity>;
    markStatus(
        tenantId: string,
        id: string,
        status: HomeVetBookingStatus,
        extra: { cancelReason?: string; visitNotes?: string; diagnosis?: string },
    ): Promise<HomeVetBookingEntity>;
}

export const HOME_VET_BOOKING_REPOSITORY = Symbol('IHomeVetBookingRepository');
