import { Module } from '@nestjs/common';
import { ConsentController } from './infrastructure/http/consent.controller';
import { ConsentService } from './application/consent.service';
import { ConsentAuditWriter } from './application/consent-audit.writer';
import { PrismaConsentRepository } from './infrastructure/persistence/prisma-consent.repository';
import { CONSENT_REPOSITORY } from './domain/consent.repository';

/**
 * Módulo de consent tokens (Fase 2).
 *
 * Componentes:
 *   - `ConsentService`        : issueToken / validateToken / revokeToken / listAccessLogs.
 *   - `ConsentAuditWriter`    : writer centralizado para `consent_access_logs`.
 *   - `PrismaConsentRepository`: implementación del repositorio con Prisma.
 *
 * Re-exporta `ConsentService`, `ConsentAuditWriter` y `CONSENT_REPOSITORY`
 * para mantener compatibilidad con `PassportModule` (Fase 1), que consume
 * los métodos legacy `recordAccess` y `findActiveGrantForPetAndTenant`.
 *
 * No importa `PrismaModule` porque es `@Global()`.
 */
@Module({
    controllers: [ConsentController],
    providers: [
        { provide: CONSENT_REPOSITORY, useClass: PrismaConsentRepository },
        ConsentService,
        ConsentAuditWriter,
    ],
    exports: [ConsentService, ConsentAuditWriter, CONSENT_REPOSITORY],
})
export class ConsentModule {}