import { Injectable } from '@nestjs/common';
import { ConsentAccessAction, ConsentTokenScope, ConsentTokenStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    ConsentAccessLogListFilter,
    ConsentAccessLogRecord,
    ConsentAccessLogWriteInput,
    ConsentTokenRecord,
    CreateConsentTokenInput,
    IConsentRepository,
    UpdateConsentTokenInput,
} from '../../domain/consent.repository';

/**
 * Implementación Prisma del repositorio de consent tokens.
 *
 * Notas de multi-tenancy:
 *  - El middleware `applyTenantScope` inyecta `tenantId` en TODAS las queries
 *    de modelos en `TENANT_SCOPED_MODELS` (incluye `ConsentToken` y
 *    `ConsentAccessLog`). Las búsquedas usan `findFirst({ where: { id } })`
 *    para que la inyección se aplique correctamente.
 *  - En `create`/`createAccessLog` el `tenantId` viene del caller y coincide
 *    con el del middleware (ambos = actor tenantId), por lo que es seguro
 *    pasarlo explícito.
 *  - `updateToken` siempre llama primero `findTokenById` para que un intento
 *    cross-tenant devuelva null en lugar de un P2025 (más fácil de mapear a
 *    NotFoundException en la capa de servicio).
 */
@Injectable()
export class PrismaConsentRepository implements IConsentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findTokenById(tenantId: string, tokenId: string): Promise<ConsentTokenRecord | null> {
        const found = await this.prisma.consentToken.findFirst({
            where: { id: tokenId, tenantId },
        });
        return found ? this.toTokenRecord(found) : null;
    }

    async createToken(input: CreateConsentTokenInput): Promise<ConsentTokenRecord> {
        const created = await this.prisma.consentToken.create({
            data: {
                tenantId: input.tenantId,
                ownerUserId: input.ownerUserId,
                granteeEmail: input.granteeEmail.toLowerCase(),
                granteeTenantId: input.granteeTenantId ?? null,
                scope: input.scope,
                petIds: input.petIds,
                expiresAt: input.expiresAt,
                auditReason: input.auditReason ?? null,
            },
        });
        return this.toTokenRecord(created);
    }

    async updateToken(
        tenantId: string,
        tokenId: string,
        input: UpdateConsentTokenInput,
    ): Promise<ConsentTokenRecord> {
        // Verificar ownership dentro del tenant antes de actualizar; esto evita
        // un P2025 ruidoso cuando el caller intenta actualizar un token de
        // otro tenant.
        const existing = await this.findTokenById(tenantId, tokenId);
        if (!existing) {
            throw new ConsentTokenNotFoundError(tokenId);
        }

        const data: Prisma.ConsentTokenUpdateInput = {};
        if (input.scope !== undefined) data.scope = input.scope;
        if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
        if (input.auditReason !== undefined) data.auditReason = input.auditReason;
        if (input.revokedAt !== undefined) {
            data.revokedAt = input.revokedAt;
            data.status = ConsentTokenStatus.REVOKED;
        }

        const updated = await this.prisma.consentToken.update({
            where: { id: tokenId },
            data,
        });
        return this.toTokenRecord(updated);
    }

    async findPetsNotInTenant(
        tenantId: string,
        petIds: string[],
    ): Promise<Array<{ id: string }>> {
        if (petIds.length === 0) return [];
        const found = await this.prisma.pet.findMany({
            where: {
                tenantId,
                id: { in: petIds },
            },
            select: { id: true },
        });
        const foundSet = new Set(found.map((p) => p.id));
        return petIds
            .filter((id) => !foundSet.has(id))
            .map((id) => ({ id }));
    }

    async createAccessLog(input: ConsentAccessLogWriteInput): Promise<ConsentAccessLogRecord> {
        const created = await this.prisma.consentAccessLog.create({
            data: {
                tenantId: input.tenantId,
                consentTokenId: input.consentTokenId,
                accessedByUserId: input.accessedByUserId,
                accessedByTenantId: input.accessedByTenantId ?? null,
                action: input.action,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
        return this.toAccessLogRecord(created);
    }

    async listAccessLogs(
        tenantId: string,
        filter: ConsentAccessLogListFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentAccessLogRecord[]; total: number }> {
        const where: Prisma.ConsentAccessLogWhereInput = { tenantId };
        if (filter.tokenId) where.consentTokenId = filter.tokenId;
        if (filter.action) where.action = filter.action;
        if (filter.from || filter.to) {
            where.createdAt = {};
            if (filter.from) (where.createdAt as Prisma.DateTimeFilter).gte = filter.from;
            if (filter.to) (where.createdAt as Prisma.DateTimeFilter).lte = filter.to;
        }

        const [data, total] = await Promise.all([
            this.prisma.consentAccessLog.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.consentAccessLog.count({ where }),
        ]);

        return { data: data.map((row) => this.toAccessLogRecord(row)), total };
    }

    // ─── Mappers ────────────────────────────────────────────────────────────

    private toTokenRecord(row: {
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
    }): ConsentTokenRecord {
        return {
            id: row.id,
            tenantId: row.tenantId,
            ownerUserId: row.ownerUserId,
            granteeEmail: row.granteeEmail,
            granteeTenantId: row.granteeTenantId,
            scope: row.scope,
            petIds: [...row.petIds],
            status: row.status,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            revokedAt: row.revokedAt,
            auditReason: row.auditReason,
        };
    }

    private toAccessLogRecord(row: {
        id: string;
        tenantId: string;
        consentTokenId: string;
        accessedByUserId: string;
        accessedByTenantId: string | null;
        action: ConsentAccessAction;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }): ConsentAccessLogRecord {
        return {
            id: row.id,
            tenantId: row.tenantId,
            consentTokenId: row.consentTokenId,
            accessedByUserId: row.accessedByUserId,
            accessedByTenantId: row.accessedByTenantId,
            action: row.action,
            ipAddress: row.ipAddress,
            userAgent: row.userAgent,
            createdAt: row.createdAt,
        };
    }
}

/**
 * Excepción de dominio: token no encontrado en el tenant del caller.
 * El servicio la traduce a `NotFoundException` para mantener el dominio
 * libre de tipos HTTP.
 */
export class ConsentTokenNotFoundError extends Error {
    constructor(public readonly tokenId: string) {
        super(`Consent token ${tokenId} not found`);
        this.name = 'ConsentTokenNotFoundError';
    }
}