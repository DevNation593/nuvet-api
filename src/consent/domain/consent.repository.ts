import { ConsentScope, ConsentStatus } from '@prisma/client';

export interface IConsentRepository {
    /**
     * Find a single consent by id, scoped to source tenant.
     */
    findOne(tenantId: string, id: string): Promise<ConsentWithRelations | null>;

    /**
     * Find a single consent by id globally (across tenants). Uses unscoped client.
     * Reserved for `PassportService` only.
     */
    findOneGlobal(id: string): Promise<ConsentWithRelations | null>;

    /**
     * List consents owned by a specific user, with optional filters.
     */
    findByOwner(
        ownerId: string,
        filter: {
            petId?: string;
            targetTenantId?: string;
            status?: ConsentStatus;
        },
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentWithRelations[]; total: number }>;

    /**
     * List consents for a pet, scoped to source tenant.
     */
    findByPet(
        tenantId: string,
        petId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentWithRelations[]; total: number }>;

    /**
     * Check whether an active GRANTED consent exists for (pet, targetTenant) and is not expired.
     */
    findActiveGrant(petId: string, targetTenantId: string, scopes: ConsentScope[]): Promise<ConsentWithRelations | null>;

    /**
     * Count active (GRANTED, not expired) consents a pet currently has — used
     * to enforce uniqueness when granting a new one.
     */
    countActiveGrantsForPetTarget(petId: string, targetTenantId: string): Promise<number>;

    /**
     * Create or update a consent. Implementation decides which (see service).
     */
    upsertGrant(input: GrantConsentInput): Promise<ConsentWithRelations>;

    /**
     * Mark a consent as REVOKED.
     */
    revoke(id: string, input: { reason?: string; now: Date }): Promise<ConsentWithRelations>;
}

export interface GrantConsentInput {
    tenantId: string;
    sourceTenantId: string;
    petId: string;
    ownerId: string;
    targetTenantId: string;
    targetClinicName?: string;
    scopes: ConsentScope[];
    message?: string;
    expiresAt?: Date | null;
    now: Date;
}

export type ConsentWithRelations = {
    id: string;
    tenantId: string;
    sourceTenantId: string;
    petId: string;
    ownerId: string;
    targetTenantId: string;
    targetClinicName: string | null;
    status: ConsentStatus;
    scopes: ConsentScope[];
    message: string | null;
    grantedAt: Date;
    expiresAt: Date | null;
    revokedAt: Date | null;
    revokeReason: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export const CONSENT_REPOSITORY = Symbol('IConsentRepository');
