import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PassportPrismaService } from '../../../prisma/passport-prisma.service';
import {
    ConsentWithRelations,
    GrantConsentInput,
    IConsentRepository,
} from '../../domain/consent.repository';
import { ConsentScope, ConsentStatus, Prisma } from '@prisma/client';

@Injectable()
export class PrismaConsentRepository implements IConsentRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passportPrisma: PassportPrismaService,
    ) {}

    async findOne(tenantId: string, id: string): Promise<ConsentWithRelations | null> {
        return this.prisma.petConsent.findFirst({
            where: { id, tenantId },
        }) as Promise<ConsentWithRelations | null>;
    }

    async findOneGlobal(id: string): Promise<ConsentWithRelations | null> {
        return this.passportPrisma.client.petConsent.findUnique({ where: { id } }) as Promise<
            ConsentWithRelations | null
        >;
    }

    async findByOwner(
        ownerId: string,
        filter: {
            petId?: string;
            targetTenantId?: string;
            status?: ConsentStatus;
        },
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentWithRelations[]; total: number }> {
        const where: Prisma.PetConsentWhereInput = { ownerId };
        if (filter.petId) where.petId = filter.petId;
        if (filter.targetTenantId) where.targetTenantId = filter.targetTenantId;
        if (filter.status) where.status = filter.status;

        const [data, total] = await this.prisma.$transaction([
            this.prisma.petConsent.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.petConsent.count({ where }),
        ]);

        return { data: data as ConsentWithRelations[], total };
    }

    async findByPet(
        tenantId: string,
        petId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentWithRelations[]; total: number }> {
        const where: Prisma.PetConsentWhereInput = { tenantId, petId };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.petConsent.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.petConsent.count({ where }),
        ]);

        return { data: data as ConsentWithRelations[], total };
    }

    async findActiveGrant(
        petId: string,
        targetTenantId: string,
        scopes: ConsentScope[],
    ): Promise<ConsentWithRelations | null> {
        // Usamos el cliente cross-tenant porque el consentimiento puede estar en
        // cualquier tenant fuente. Unicamente lo lee el `PassportService` para
        // verificar la vigencia del grant.
        const grants = await this.passportPrisma.client.petConsent.findMany({
            where: {
                petId,
                targetTenantId,
                status: ConsentStatus.GRANTED,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
                scopes: { hasEvery: scopes },
            },
        });

        return (grants[0] as ConsentWithRelations) ?? null;
    }

    async countActiveGrantsForPetTarget(petId: string, targetTenantId: string): Promise<number> {
        return this.passportPrisma.client.petConsent.count({
            where: {
                petId,
                targetTenantId,
                status: ConsentStatus.GRANTED,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
        });
    }

    async upsertGrant(input: GrantConsentInput): Promise<ConsentWithRelations> {
        // Si ya existe un GRANTED activo para el mismo (pet, targetTenantId), lo revoca
        // lógicamente (revokedAt) y crea uno nuevo. Conservamos historial.
        await this.passportPrisma.client.petConsent.updateMany({
            where: {
                petId: input.petId,
                targetTenantId: input.targetTenantId,
                status: ConsentStatus.GRANTED,
                OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
            },
            data: {
                status: ConsentStatus.REVOKED,
                revokedAt: input.now,
                revokeReason: 'Reemplazado por nuevo grant',
            },
        });

        return this.passportPrisma.client.petConsent.create({
            data: {
                tenantId: input.tenantId,
                sourceTenantId: input.sourceTenantId,
                petId: input.petId,
                ownerId: input.ownerId,
                targetTenantId: input.targetTenantId,
                targetClinicName: input.targetClinicName,
                scopes: input.scopes,
                message: input.message,
                expiresAt: input.expiresAt ?? null,
                grantedAt: input.now,
            },
        }) as Promise<ConsentWithRelations>;
    }

    async revoke(
        id: string,
        input: { reason?: string; now: Date },
    ): Promise<ConsentWithRelations> {
        return this.passportPrisma.client.petConsent.update({
            where: { id },
            data: {
                status: ConsentStatus.REVOKED,
                revokedAt: input.now,
                revokeReason: input.reason ?? null,
            },
        }) as Promise<ConsentWithRelations>;
    }
}
