import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { ConsentScope, ConsentStatus, UserRole, ConsentAuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';
import {
    ConsentWithRelations,
    CONSENT_REPOSITORY,
    IConsentRepository,
} from '../domain/consent.repository';
import { ConsentResponseDto, GrantConsentDto, RevokeConsentDto } from './dto/consent.dto';
import { ConsentAuditWriter } from './consent-audit.writer';

interface JwtPayloadLike {
    sub: string;
    tenantId: string;
    role: UserRole;
}

@Injectable()
export class ConsentService {
    constructor(
        @Inject(CONSENT_REPOSITORY) private readonly repo: IConsentRepository,
        private readonly prisma: PrismaService,
        private readonly passportPrisma: PassportPrismaService,
        private readonly auditWriter: ConsentAuditWriter,
    ) {}

    /**
     * El dueño de la mascota concede acceso al expediente a otra clínica.
     * Permitido al dueño (CLIENT) o a staff interno del source tenant.
     */
    async grant(
        actor: JwtPayloadLike,
        dto: GrantConsentDto,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<ConsentResponseDto> {
        const pet = await this.prisma.pet.findFirst({
            where: { id: dto.petId, tenantId: actor.tenantId, isActive: true },
        });
        if (!pet) throw new NotFoundException('Pet not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === pet.ownerId;
        const isInternalStaff =
            actor.role !== UserRole.CLIENT && actor.tenantId === pet.tenantId;
        if (!isOwner && !isInternalStaff) {
            throw new ForbiddenException(
                'Only the pet owner or clinic staff can grant consents',
            );
        }

        if (actor.tenantId === dto.targetTenantId) {
            throw new BadRequestException('Cannot grant consent to the same tenant');
        }

        const targetTenant = await this.passportPrisma.client.tenant.findUnique({
            where: { id: dto.targetTenantId },
            select: { id: true, name: true, isActive: true },
        });
        if (!targetTenant || !targetTenant.isActive) {
            throw new BadRequestException('Target tenant not found or inactive');
        }

        const scopes =
            dto.scopes && dto.scopes.length > 0
                ? dto.scopes
                : [ConsentScope.PASSPORT_READ];

        const now = new Date();
        const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
        if (expiresAt && expiresAt.getTime() <= now.getTime()) {
            throw new BadRequestException('expiresAt must be in the future');
        }

        const consent = await this.repo.upsertGrant({
            tenantId: actor.tenantId,
            sourceTenantId: pet.tenantId,
            petId: pet.id,
            ownerId: pet.ownerId,
            targetTenantId: dto.targetTenantId,
            targetClinicName: dto.targetClinicName ?? targetTenant.name,
            scopes,
            message: dto.message,
            expiresAt,
            now,
        });

        await this.auditWriter.write({
            tenantId: pet.tenantId,
            consentId: consent.id,
            action: ConsentAuditAction.GRANTED,
            actorUserId: actor.sub,
            actorTenantId: actor.tenantId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { scopes, expiresAt: expiresAt?.toISOString() ?? null },
        });

        return ConsentResponseDto.from(consent);
    }

    async revoke(
        actor: JwtPayloadLike,
        consentId: string,
        dto: RevokeConsentDto,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<ConsentResponseDto> {
        const consent = await this.repo.findOneGlobal(consentId);
        if (!consent) throw new NotFoundException('Consent not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === consent.ownerId;
        const isInternalStaff =
            actor.role !== UserRole.CLIENT && actor.tenantId === consent.tenantId;
        if (!isOwner && !isInternalStaff) {
            throw new ForbiddenException(
                'Only the pet owner or clinic staff can revoke consents',
            );
        }

        if (consent.status === ConsentStatus.REVOKED) {
            return ConsentResponseDto.from(consent);
        }

        const revoked = await this.repo.revoke(consentId, {
            reason: dto.reason,
            now: new Date(),
        });

        await this.auditWriter.write({
            tenantId: revoked.tenantId,
            consentId: revoked.id,
            action: ConsentAuditAction.REVOKED,
            actorUserId: actor.sub,
            actorTenantId: actor.tenantId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { reason: dto.reason ?? null },
        });

        return ConsentResponseDto.from(revoked);
    }

    async listMine(
        actor: JwtPayloadLike,
        filter: { petId?: string; targetTenantId?: string; status?: ConsentStatus },
        pagination: { skip: number; take: number },
    ): Promise<{ data: ConsentResponseDto[]; total: number }> {
        if (actor.role === UserRole.CLIENT) {
            const result = await this.repo.findByOwner(actor.sub, filter, pagination);
            return {
                data: result.data.map(ConsentResponseDto.from),
                total: result.total,
            };
        }

        // Staff: requiere petId (los consentimientos son por mascota).
        if (!filter.petId) {
            return { data: [], total: 0 };
        }
        const result = await this.repo.findByPet(actor.tenantId, filter.petId, pagination);
        return {
            data: result.data.map(ConsentResponseDto.from),
            total: result.total,
        };
    }

    async findActiveGrantForPetAndTenant(
        petId: string,
        targetTenantId: string,
        scopes: ConsentScope[],
    ): Promise<ConsentWithRelations | null> {
        return this.repo.findActiveGrant(petId, targetTenantId, scopes);
    }

    async recordAccess(input: {
        tenantId: string;
        consentId?: string;
        shareId?: string;
        actorUserId?: string;
        actorTenantId?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void> {
        await this.auditWriter.write({
            ...input,
            action: ConsentAuditAction.ACCESSED,
        });
    }
}
