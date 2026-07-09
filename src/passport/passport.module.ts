import { Module } from '@nestjs/common';
import { ConsentModule } from '../consent/consent.module';
import { PassportController } from './infrastructure/http/passport.controller';
import { PassportShareController } from './infrastructure/http/passport-share.controller';
import { PassportService } from './application/passport.service';

/**
 * Módulo de pasaporte médico (Fase 1).
 *
 * Re-exporta servicios/controladores que ya existen y agrega:
 *   - PassportService          : agregación cross-tenant + share tokens
 *   - PassportController       : rutas autenticadas
 *   - PassportShareController  : ruta pública por token
 *
 * Requiere `ConsentModule` porque comparte `ConsentService` y
 * `ConsentAuditWriter` para resolver grants y auditar accesos.
 */
@Module({
    imports: [ConsentModule],
    controllers: [PassportController, PassportShareController],
    providers: [PassportService],
    exports: [PassportService],
})
export class PassportModule {}
