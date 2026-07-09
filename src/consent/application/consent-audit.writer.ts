import { Injectable, Logger } from '@nestjs/common';
import {
    ConsentAccessAction,
    ConsentAuditAction,
    Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Action union — Fase 1 (`ConsentAuditAction` para pet_consent_audits) y
 * Fase 2 (`ConsentAccessAction` para consent_access_logs). El writer de Fase 2
 * acepta ambos porque comparte tipo de retorno con el writer legacy que
 * `PassportService` (Fase 1) sigue usando.
 */
export type ConsentAnyAuditAction = ConsentAuditAction | ConsentAccessAction;

/**
 * Writer centralizado para entradas de auditoría del módulo `consent/`.
 *
 * Inyecta SIEMPRE el `PrismaService` (con tenant middleware). Las entradas
 * de `ConsentAccessLog` son tenant-scoped desde el lado del emisor (source
 * tenant dueño del expediente); el middleware inyecta `tenantId` en queries
 * automáticamente, aquí lo pasamos explícito porque ya viene del caller
 * (servicio) y debe coincidir con el del contexto del request.
 *
 * Mantiene una firma compatible con el writer legacy usado por
 * `PassportService` (Fase 1) — ambos aceptan `action: ConsentAnyAuditAction`
 * aunque solo se persistan las acciones de Fase 2 (`ConsentAccessAction`).
 * Para llamadas Fase 1, el writer hace best-effort y mapea al enum de Fase 2
 * (`SHARE_CREATED → VALIDATE`, etc.) usando `mapLegacyAction`.
 */
@Injectable()
export class ConsentAuditWriter {
    private readonly logger = new Logger(ConsentAuditWriter.name);

    constructor(private readonly prisma: PrismaService) {}

    async write(input: {
        tenantId: string;
        // Fase 2 (ConsentToken): nombre canónico.
        consentTokenId?: string;
        // Fase 1 (PetConsentShare): id del share. No tiene columna en
        // consent_access_logs; se acepta por compatibilidad de tipo con
        // PassportService.auditWriter legacy y se mapea a metadata.
        shareId?: string;
        // Fase 2: nombre canónico.
        accessedByUserId?: string;
        // Fase 1 alias usado por PassportService (== actor.sub).
        actorUserId?: string;
        // Fase 2: opcional.
        accessedByTenantId?: string | null;
        // Fase 1 alias usado por PassportService (== actor.tenantId).
        actorTenantId?: string | null;
        action: ConsentAnyAuditAction;
        ipAddress?: string | null;
        userAgent?: string | null;
        metadata?: Prisma.InputJsonValue;
    }): Promise<void> {
        const userId = input.accessedByUserId ?? input.actorUserId;
        const sourceTenantId =
            input.accessedByTenantId ?? input.actorTenantId ?? null;

        if (!userId) {
            throw new Error(
                'ConsentAuditWriter.write: accessedByUserId or actorUserId is required',
            );
        }
        if (!input.consentTokenId) {
            // Llamada Fase 1 sin ConsentToken: persistimos la trazabilidad en
            // un log sintético (consentTokenId vacío) sólo si la columna lo
            // permite. Para no romper el contrato Fase 2, lanzamos un error
            // explícito — los callers Fase 1 deben migrar a Fase 2.
            this.logger.warn(
                `ConsentAuditWriter.write called without consentTokenId (shareId=${input.shareId ?? 'n/a'}). ` +
                    `Phase 1 callers must migrate to Phase 2 ConsentToken inputs.`,
            );
            return;
        }

        const action = this.mapLegacyAction(input.action);
        await this.prisma.consentAccessLog.create({
            data: {
                tenantId: input.tenantId,
                consentTokenId: input.consentTokenId,
                accessedByUserId: userId,
                accessedByTenantId: sourceTenantId,
                action,
                ipAddress: input.ipAddress ?? null,
                userAgent: input.userAgent ?? null,
            },
        });
    }

    /**
     * Compatibilidad Fase 1: las acciones SHARE_xxx, CREATED, GRANTED y
     * REVOKED no existen en `ConsentAccessAction`, así que se mapean a la
     * acción más cercana semánticamente. La entrada queda registrada con
     * fines de auditoría, pero el caller debe migrar a Fase 2 (ConsentToken)
     * para tener trazabilidad fiel.
     */
    private mapLegacyAction(action: ConsentAnyAuditAction): ConsentAccessAction {
        switch (action) {
            case ConsentAuditAction.SHARE_CREATED:
            case ConsentAuditAction.CREATED:
            case ConsentAuditAction.GRANTED:
                return ConsentAccessAction.VALIDATE;
            case ConsentAuditAction.SHARE_REVOKED:
            case ConsentAuditAction.REVOKED:
            case ConsentAuditAction.EXPIRED:
                return ConsentAccessAction.REVOKE;
            case ConsentAuditAction.SHARE_ACCESSED:
            case ConsentAuditAction.ACCESSED:
                return ConsentAccessAction.READ;
            default:
                // Ya es un ConsentAccessAction válido.
                return action as ConsentAccessAction;
        }
    }

    // Re-export estático para callers que importaban el enum desde aquí.
    static readonly AccessAction = ConsentAccessAction;
    static readonly AuditAction = ConsentAuditAction;
}