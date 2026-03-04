import { ClientEntity } from './client.entity';

export interface CreateClientData {
    tenantId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
}

export interface IClientRepository {
    findAll(tenantId: string, query: { skip: number; take: number }): Promise<{ data: ClientEntity[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<(ClientEntity & { pets?: unknown[] }) | null>;
    findByEmail(tenantId: string, email: string): Promise<ClientEntity | null>;
    create(data: CreateClientData): Promise<ClientEntity>;
    update(id: string, data: Partial<CreateClientData & { isActive: boolean }>): Promise<ClientEntity>;
    remove(id: string): Promise<void>;
}

export const CLIENT_REPOSITORY = Symbol('IClientRepository');
