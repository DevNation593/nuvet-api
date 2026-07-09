import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client SIN la extensión de tenant scoping.
 *
 * ⚠️  ADVERTENCIA — este cliente BYPASSEA el tenant middleware.
 * Solo debe ser inyectado por:
 *   - `PassportService`   (lecturas cross-tenant con consentimiento)
 *   - `ConsentService`    (resolución de share tokens cross-tenant)
 *
 * Cualquier otro uso debe justificarse explícitamente en code review.
 * Toda operación con este cliente debe auditarse (PetConsentAudit o AuditLog).
 */

const globalForPassportPrisma = globalThis as unknown as {
    __nuvetPassportPrismaClient?: PrismaClient;
};

function resolvePassportDatabaseUrl(): string | undefined {
    // Mismo orden de prioridad que PrismaService, pero sin tocar el flag pgbouncer
    // porque aquí queremos prepared statements habilitados para queries rápidas
    // que cruzan tenants.
    const raw = process.env.VERCEL && process.env.DATABASE_POOL_URL
        ? process.env.DATABASE_POOL_URL
        : process.env.DATABASE_URL;
    return raw;
}

function getOrCreatePassportClient(): PrismaClient {
    if (!globalForPassportPrisma.__nuvetPassportPrismaClient) {
        const dbUrl = resolvePassportDatabaseUrl();
        globalForPassportPrisma.__nuvetPassportPrismaClient = new PrismaClient({
            log: [
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
            ...(dbUrl ? { datasources: { db: { url: dbUrl } } } : {}),
        });
    }
    return globalForPassportPrisma.__nuvetPassportPrismaClient;
}

@Injectable()
export class PassportPrismaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PassportPrismaService.name);

    /**
     * Acceso directo al PrismaClient sin tenant scope.
     * Uso típico: `passportPrisma.client.pet.findFirst({ where: { id } })`.
     */
    public readonly client: PrismaClient;

    constructor() {
        this.client = getOrCreatePassportClient();
    }

    async onModuleInit(): Promise<void> {
        await this.client.$connect();
        this.logger.warn(
            'PassportPrismaService connected — tenant middleware BYPASSED. ' +
                'Solo PassportService y ConsentService deben inyectarlo.',
        );
    }

    async onModuleDestroy(): Promise<void> {
        if (process.env.VERCEL) return;
        await this.client.$disconnect();
        this.logger.log('PassportPrismaService disconnected');
    }
}
