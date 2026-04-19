export interface UpdateTenantData {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    website?: string;
}

export interface BillingConfigData {
    billingApiKey?: string;
    billingApiSecret?: string;
    billingEstablishmentCode?: string;
    billingEmissionPointCode?: string;
}

export interface BillingConfigResult {
    billingApiKey?: string | null;
    billingApiSecret?: string | null;
    billingEstablishmentCode?: string | null;
    billingEmissionPointCode?: string | null;
}

export interface ITenantRepository {
    findOne(id: string): Promise<unknown | null>;
    findBillingConfig(id: string): Promise<BillingConfigResult | null>;
    upsertBillingConfig(tenantId: string, data: BillingConfigData): Promise<unknown>;
    update(id: string, data: UpdateTenantData): Promise<unknown>;
}

export const TENANT_REPOSITORY = Symbol('ITenantRepository');
