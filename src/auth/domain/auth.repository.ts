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

export interface TenantSummary {
    id: string;
    name: string;
    slug: string;
    plan: string;
    isActive: boolean;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
}

export interface CreateUserData {
    tenantId: string;
    email: string;
    passwordHash: string;
    role: string;
    firstName: string;
    lastName: string;
    phone?: string;
    isActive?: boolean;
}

export interface PasswordResetTokenRecord {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
    user: UserWithTenant;
}

export interface EmailVerificationTokenRecord {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    usedAt: Date | null;
    user: UserWithTenant;
}

export interface IAuthRepository {
    findUsersByEmailActive(email: string, tenantSlug?: string): Promise<UserWithTenant[]>;

    findUserById(userId: string): Promise<UserWithTenant | null>;

    findUserByIdWithTenant(userId: string): Promise<UserWithTenant | null>;

    findUserByEmail(email: string): Promise<UserWithTenant | null>;

    updateUser(userId: string, data: Record<string, unknown>): Promise<UserWithTenant>;

    createRefreshToken(data: CreateRefreshTokenData): Promise<void>;

    findRefreshToken(token: string): Promise<RefreshTokenWithUser | null>;

    deleteRefreshToken(id: string): Promise<void>;

    deleteUserRefreshTokens(userId: string, token?: string): Promise<void>;

    countUserRefreshTokens(userId: string): Promise<number>;

    changePasswordAndInvalidateSessions(userId: string, passwordHash: string): Promise<void>;

    createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;

    findPasswordResetToken(token: string): Promise<PasswordResetTokenRecord | null>;

    markPasswordResetTokenUsed(id: string): Promise<void>;

    createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void>;

    findEmailVerificationToken(token: string): Promise<EmailVerificationTokenRecord | null>;

    markEmailVerificationTokenUsed(id: string): Promise<void>;

    markEmailVerified(userId: string): Promise<void>;

    /**
     * Devuelve el tenant activo cuyo slug coincide. null si no existe o
     * está inactivo.
     */
    findActiveTenantBySlug(slug: string): Promise<TenantSummary | null>;

    /**
     * Primer tenant activo del sistema, ordenado por `createdAt`.
     * Sirve como destino por defecto cuando el cliente omite
     * `tenantSlug` en el registro.
     */
    findFirstActiveTenant(): Promise<TenantSummary | null>;

    /**
     * Cuenta usuarios con ese email dentro de un tenant (case-insensitive).
     * Para detectar colisiones antes de crear.
     */
    countUsersByEmailInTenant(email: string, tenantId: string): Promise<number>;

    /**
     * Crea un nuevo usuario (sin disparar middleware de tenant scope:
     * el caller ya pasó `tenantId` explícito).
     */
    createUser(data: CreateUserData): Promise<UserWithTenant>;
}

export const AUTH_REPOSITORY = Symbol('IAuthRepository');
