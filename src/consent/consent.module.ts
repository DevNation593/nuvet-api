import { Module } from '@nestjs/common';
import { ConsentController } from './infrastructure/http/consent.controller';
import { ConsentService } from './application/consent.service';
import { ConsentAuditWriter } from './application/consent-audit.writer';
import { PrismaConsentRepository } from './infrastructure/persistence/prisma-consent.repository';
import { CONSENT_REPOSITORY } from './domain/consent.repository';

/**
 * Módulo de consentimientos (Fase 1 · pasaporte médico).
 *
 * Servicios:
 *   - ConsentService    : grant / revoke / listMine (lógica de negocio)
 *   - ConsentAuditWriter: helper compartido con PassportService
 *
 * Repositorio:
 *   - PrismaConsentRepository : operaciones CRUD con bypass selectivo a
 *     `PassportPrismaService` para lecturas cross-tenant.
 *
 * El módulo NO necesita import del PrismaModule porque ambos servicios Prisma
 * son globales.
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
