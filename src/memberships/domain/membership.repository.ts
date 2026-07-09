import {
    BillingProviderKind,
    MembershipBillingPeriod,
    MembershipSubscriptionStatus,
} from '@prisma/client';

// ── MembershipPlan ──────────────────────────────────────────────────────────

export interface CreatePlanData {
    tenantId: string;
    slug: string;
    name: string;
    description?: string;
    priceCents: number;
    currency?: string;
    billingPeriod?: MembershipBillingPeriod;
    includedBenefits?: string[];
    applicableSpecies?: string[];
    isActive?: boolean;
    displayOrder?: number;
}

export interface UpdatePlanData {
    name?: string;
    description?: string;
    priceCents?: number;
    currency?: string;
    billingPeriod?: MembershipBillingPeriod;
    includedBenefits?: string[];
    applicableSpecies?: string[];
    isActive?: boolean;
    displayOrder?: number;
}

export interface IMembershipPlanRepository {
    create(data: CreatePlanData): Promise<unknown>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    findBySlug(tenantId: string, slug: string): Promise<unknown | null>;
    findCatalog(tenantId: string, options: { onlyActive?: boolean }): Promise<unknown[]>;
    update(tenantId: string, id: string, data: UpdatePlanData): Promise<unknown>;
    delete(tenantId: string, id: string): Promise<void>;
}

export const MEMBERSHIP_PLAN_REPOSITORY = Symbol('IMembershipPlanRepository');

// ── MembershipSubscription ─────────────────────────────────────────────────

export interface CreateSubscriptionData {
    tenantId: string;
    sourceTenantId: string;
    petId: string;
    ownerId: string;
    planId: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    nextBillingAt: Date;
    autoRenew?: boolean;
    paymentMethodToken: string;
    providerKind: BillingProviderKind;
}

export interface IMembershipSubscriptionRepository {
    create(data: CreateSubscriptionData): Promise<unknown>;
    findOneGlobal(id: string): Promise<unknown | null>;
    findByOwner(
        ownerId: string,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }>;
    findByTenant(
        tenantId: string,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }>;
    findActiveForPetAndPlan(petId: string, planId: string): Promise<unknown | null>;
    updateStatus(
        id: string,
        status: MembershipSubscriptionStatus,
        extra: { canceledAt?: Date; cancelReason?: string; lastChargedAt?: Date; lastChargeTxId?: string; autoRenew?: boolean },
    ): Promise<unknown>;
    advancePeriod(
        id: string,
        data: { currentPeriodStart: Date; currentPeriodEnd: Date; nextBillingAt: Date },
    ): Promise<unknown>;
}

export const MEMBERSHIP_SUBSCRIPTION_REPOSITORY = Symbol('IMembershipSubscriptionRepository');

// ── BillingAttempt ─────────────────────────────────────────────────────────

export interface IBillingAttemptRepository {
    /** Próximos cobros a ejecutar, según ventana de tiempo dada. */
    findDueAttempts(windowStart: Date, windowEnd: Date, limit: number): Promise<unknown[]>;
    recordSuccess(input: {
        tenantId: string;
        subscriptionId: string;
        amountCents: number;
        currency: string;
        transactionId: string;
    }): Promise<unknown>;
    recordFailure(input: {
        tenantId: string;
        subscriptionId: string;
        amountCents: number;
        currency: string;
        failureCode: string;
        failureMessage: string;
    }): Promise<unknown>;
}

export const BILLING_ATTEMPT_REPOSITORY = Symbol('IBillingAttemptRepository');

/**
 * Sub-interfaz de solo lectura para alimentar el dashboard
 * `/clinic/billing-attempts`. Separada de la IBillingAttemptRepository
 * (escritura vía `BillingProvider`) para mantener SRP: la fuente de
 * verdad de la persistencia es el provider (que cruza tenants vía
 * `PassportPrismaService`); el dashboard sólo consulta scoped.
 *
 * Fase 2 · Slice 2.
 */
export interface IBillingAttemptQueryRepository {
    /**
     * Lista paginada de intentos de cobro fallidos del tenant, con
     * JOIN opcional de suscripción + dueño + plan + mascota.
     */
    listFailures(
        tenantId: string,
        options: { since: Date; skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }>;

    /**
     * Conteos agregados para los últimos 1d/7d/30d, top 5 failureCodes
     * y cantidad de suscripciones actualmente en `PAST_DUE` en el tenant.
     */
    summarizeFailures(tenantId: string, since: Date): Promise<{
        failuresLast24Hours: number;
        failuresLast7Days: number;
        failuresLast30Days: number;
        pastDueSubscriptions: number;
        topFailureCodes: { failureCode: string; failureMessage: string | null; count: number }[];
        totalRecoveredAfterFailure: number;
    }>;
}

export const BILLING_ATTEMPT_QUERY_REPOSITORY = Symbol(
    'IBillingAttemptQueryRepository',
);
