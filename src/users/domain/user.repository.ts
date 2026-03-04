import { UserRole } from '@nuvet/types';

export interface CreateUserData {
    tenantId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone?: string;
}

export interface IUserRepository {
    findAll(
        tenantId: string,
        query: { skip: number; take: number; sortBy?: string; sortOrder?: string },
    ): Promise<{ data: unknown[]; total: number }>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    findByEmail(tenantId: string, email: string): Promise<unknown | null>;
    create(data: CreateUserData): Promise<unknown>;
    update(id: string, data: Partial<CreateUserData & { isActive: boolean; avatarUrl: string }>): Promise<unknown>;
    softDelete(id: string): Promise<void>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
