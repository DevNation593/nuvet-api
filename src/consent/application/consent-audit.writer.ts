import { Injectable } from '@nestjs/common';
import { ConsentAuditAction, Prisma } from '@prisma/client';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';

/**
 * Writer centralizado para entradas de auditoría de consent/pasaporte.
 *
 * Implementación: usa SIEMPRE el `PassportPrismaService` (cliente unscoped)
 * porque:
 *  - En llamadas cross-tenant desde `PassportService` no podemos depender
 *    del tenant middleware (no queremos que sobreescriba el `tenantId`).
 *  - En llamadas same-tenant (consent.service grant/revoke) el `tenantId`
 *    que se pasa es explícitamente el de la clínica fuente, que coincide
 *    con el del request actual, así que el resultado es equivalente.
 *
 * Esto simplifica el código a un solo path y elimina la posibilidad de
 * "olvidar" el `tenantId` confiando en la inyección del middleware.
 */
@Injectable()
export class ConsentAuditWriter {
    constructor(private readonly passportPrisma: PassportPrismaService) {}

    async write(input: {
        tenantId: string;
        consentId?: string;
        shareId?: string;
        action: ConsentAuditAction;
        actorUserId?: string;
        actorTenantId?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        await this.passportPrisma.client.petConsentAudit.create({
            data: {
                tenantId: input.tenantId,
                consentId: input.consentId ?? null,
                shareId: input.shareId ?? null,
                action: input.action,
                actorUserId: input.actorUserId ?? null,
                actorTenantId: input.actorTenantId ?? null,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
                metadata: input.metadata
                    ? (input.metadata as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
            },
        });
    }
}
