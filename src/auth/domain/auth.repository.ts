export interface UserWithTenant {
    id: string;
    email: string;
    passwordHash: string;
    tenantId: string;
    role: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        isActive: boolean;
        logoUrl?: string | null;
    };
    [key: string]: unknown;
}

export interface RefreshTokenWithUser {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    user: UserWithTenant;
}

export interface CreateRefreshTokenData {
    userId: string;
    token: string;
    expiresAt: Date;
}

export interface UpdateUserProfileData {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface IAuthRepository {
    findUserByEmailActive(email: string): Promise<UserWithTenant | null>;

    findUserById(userId: string): Promise<UserWithTenant | null>;

    findUserByIdWithTenant(userId: string): Promise<UserWithTenant | null>;

    updateUser(userId: string, data: Record<string, unknown>): Promise<UserWithTenant>;

    createRefreshToken(data: CreateRefreshTokenData): Promise<void>;

    findRefreshToken(token: string): Promise<RefreshTokenWithUser | null>;

    deleteRefreshToken(id: string): Promise<void>;

    deleteUserRefreshTokens(userId: string, token?: string): Promise<void>;

    countUserRefreshTokens(userId: string): Promise<number>;

    changePasswordAndInvalidateSessions(userId: string, passwordHash: string): Promise<void>;
}

export const AUTH_REPOSITORY = Symbol('IAuthRepository');
