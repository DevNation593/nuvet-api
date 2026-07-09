import { ConsentAccessAction, ConsentTokenScope, ConsentTokenStatus } from '@prisma/client';

/**
 * ConsentToken — Fase 2.
 *
 * Token emitido por el dueño (o staff) de un expediente para autorizar a un
 * tercero (identificado por email) a acceder a una o varias mascotas
 * específicas de su tenant. Cada validación/lectura genera una entrada en
 * ConsentAccessLog.
 */

export interface ConsentTokenRecord {
    id: string;
    tenantId: string;
    ownerUserId: string;
    granteeEmail: string;
    granteeTenantId: string | null;
    scope: ConsentTokenScope;
    petIds: string[];
    status: ConsentTokenStatus;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
    auditReason: string | null;
}

export interface ConsentAccessLogRecord {
    id: string;
    tenantId: string;
    consentTokenId: string;
    accessedByUserId: string;
    accessedByTenantId: string | null;
    action: ConsentAccessAction;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}

export interface CreateConsentTokenInput {
    tenantId: string;
    ownerUserId: string;
    granteeEmail: string;
    granteeTenantId?: string | null;
    scope: ConsentTokenScope;
    petIds: string[];
    expiresAt: Date;
    auditReason?: string | null;
    now: Date;
}

export interface UpdateConsentTokenInput {
    scope?: ConsentTokenScope;
    expiresAt?: Date;
    auditReason?: string | null;
    revokedAt?: Date;
}

export interface ConsentAccessLogWriteInput {
    tenantId: string;
    consentTokenId: string;
    accessedByUserId: string;
    accessedByTenantId?: string | null;
    action: ConsentAccessAction;
    ipAddress?: string | null;
    userAgent?: string | null;
}

export interface ConsentAccessLogListFilter {
    tokenId?: string;
    action?: ConsentAccessAction;
    from?: Date;
    to?: Date;
}

export interface IConsentRepository {
    /**
     * Busca un token por id dentro del tenant del caller (middleware ya inyecta
     * tenantId en queries). Devuelve null si no existe o pertenece a otro tenant.
     */
    findTokenById(tenantId: string, tokenId: string): Promise<ConsentTokenRecord | null>;

    /**
     * Crea un nuevo token. La unicidad no se enforza aquí — si el dueño quiere
     * reemplazar un token vigente para el mismo (granteeEmail, petIds) debe
     * revocarlo explícitamente.
     */
    createToken(input: CreateConsentTokenInput): Promise<ConsentTokenRecord>;

    /**
     * Actualiza campos parciales de un token (típicamente para revocación).
     */
    updateToken(
        tenantId: string,
        tokenId: string,
        input: UpdateConsentTokenInput,
    ): Promise<ConsentTokenRecord>;

    /**
     * Verifica que cada `petId` pertenezca al tenant emisor y que el pet esté
     * activo. Devuelve la lista de pets que NO cumplen — vacía si todo OK.
     */
    findPetsNotInTenant(
        tenantId: string,
        petIds: string[],
    ): Promise<Array<{ id: string }>>;

    /**
     * Inserta una entrada de auditoría. tenantId se inyecta por el middleware.
     */
    createAccessLog(input: ConsentAccessLogWriteInput): Promise<ConsentAccessLogRecord>;

    /**
     * Lista entradas de auditoría con paginación y filtros.
     */
    listAccessLogs(
        tenantId: string,
        filter: ConsentAccessLogListFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentAccessLogRecord[]; total: number }>;
}

/**
 * Resultado de la validación de un token. No se mezcla con `ConsentTokenRecord`
 * para que el controller pueda serializar un shape distinto al del modelo Prisma
 * (p.ej. añadir un `now` server-side para comparar).
 */
export interface ConsentValidationResult {
    valid: boolean;
    reason?: 'NOT_FOUND' | 'REVOKED' | 'EXPIRED';
    token: ConsentTokenRecord | null;
}

export const CONSENT_REPOSITORY = Symbol('IConsentRepository');