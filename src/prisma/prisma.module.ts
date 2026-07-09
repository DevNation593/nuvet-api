import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PassportPrismaService } from './passport-prisma.service';

/**
 * PrismaModule expone dos clientes:
 *
 *  - `PrismaService`         → con tenant scope (default, multi-tenant estricto).
 *  - `PassportPrismaService` → sin tenant scope (solo para pasaporte y consentimiento).
 *
 * Ambos son globales; cualquier módulo puede inyectarlos sin necesidad de
 * declararlos en `imports`.
 */
@Global()
@Module({
    providers: [PrismaService, PassportPrismaService],
    exports: [PrismaService, PassportPrismaService],
})
export class PrismaModule { }
