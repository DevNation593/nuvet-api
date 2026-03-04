export interface UpdateTenantData {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    website?: string;
}

export interface ITenantRepository {
    findOne(id: string): Promise<unknown | null>;
    update(id: string, data: UpdateTenantData): Promise<unknown>;
}

export const TENANT_REPOSITORY = Symbol('ITenantRepository');
