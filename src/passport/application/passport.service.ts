import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ConsentScope, PetSex, PetSpecies, UserRole, ConsentAuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';
import { ConsentService } from '../../consent/application/consent.service';
import { ConsentAuditWriter } from '../../consent/application/consent-audit.writer';
import {
    LookupResultDto,
    PassportPublicPet,
    ShareResponseDto,
} from './dto/passport.dto';

const ALLOWED_HEALTH_SCOPES: ConsentScope[] = [ConsentScope.PASSPORT_READ, ConsentScope.MEDICAL_RECORDS_READ];
const MIN_TTL_DAYS = 1;
const MAX_TTL_DAYS = 90;
const DEFAULT_TTL_DAYS = 7;
const PASSPORT_AGGREGATION_LIMIT = 50;

interface JwtPayloadLike {
    sub: string;
    tenantId: string;
    role: UserRole;
}

@Injectable()
export class PassportService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly passportPrisma: PassportPrismaService,
        private readonly consentService: ConsentService,
        private readonly auditWriter: ConsentAuditWriter,
    ) {}

    /**
     * Devuelve el pasaporte agregado de una mascota.
     * Acceso permitido si:
     *   - el actor es staff del source tenant, o
     *   - el actor es CLIENT dueño de la mascota (mismo tenant implícito), o
     *   - el actor es staff de OTRO tenant con un `Consent` GRANTED activo.
     */
    async getPetPassport(
        actor: JwtPayloadLike,
        petId: string,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<PassportPublicPet> {
        const access = await this.resolveAccess(actor, petId, ALLOWED_HEALTH_SCOPES);

        const passport = await this.aggregate(petId);

        // Auditoría (solo si es acceso cross-tenant para no duplicar).
        if (access.sourceTenantId !== actor.tenantId) {
            await this.consentService.recordAccess({
                tenantId: access.sourceTenantId,
                consentId: access.consentId,
                actorUserId: actor.sub,
                actorTenantId: actor.tenantId,
                ipAddress: ctx.ipAddress,
                userAgent: ctx.userAgent,
                metadata: { petId, scopes: ALLOWED_HEALTH_SCOPES },
            });
        }

        return passport;
    }

    /**
     * Búsqueda pública para clínicas: encuentra la mascota por microchip
     * cross-tenant sin devolver datos médicos. Solo identidad mínima.
     * Requiere autenticación y rol staff.
     */
    async lookupByMicrochip(actor: JwtPayloadLike, microchip: string): Promise<LookupResultDto[]> {
        if (actor.role === UserRole.CLIENT) {
            throw new ForbiddenException('Only clinic staff can perform cross-tenant lookup');
        }

        const pets = await this.passportPrisma.client.pet.findMany({
            where: {
                microchip,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                microchip: true,
                tenantId: true,
                tenant: { select: { name: true } },
            },
            take: 10,
        });

        return pets.map((p) => ({
            petId: p.id,
            petName: p.name,
            sourceTenantId: p.tenantId,
            sourceTenantName: p.tenant.name,
            microchip: p.microchip ?? '',
        }));
    }

    // ─── Share tokens ──────────────────────────────────────────────────────

    async createShare(
        actor: JwtPayloadLike,
        petId: string,
        ttlDays: number = DEFAULT_TTL_DAYS,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<ShareResponseDto> {
        if (actor.role !== UserRole.CLIENT && actor.role !== UserRole.CLINIC_ADMIN && actor.role !== UserRole.VET) {
            throw new ForbiddenException('Only owners and clinic staff can create share tokens');
        }
        if (ttlDays < MIN_TTL_DAYS || ttlDays > MAX_TTL_DAYS) {
            throw new BadRequestException(
                `ttlDays must be between ${MIN_TTL_DAYS} and ${MAX_TTL_DAYS}`,
            );
        }

        const pet = await this.prisma.pet.findFirst({
            where: { id: petId, isActive: true, tenantId: actor.tenantId },
        });
        if (!pet) throw new NotFoundException('Pet not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === pet.ownerId;
        const isInternalStaff =
            actor.role !== UserRole.CLIENT && actor.tenantId === pet.tenantId;
        if (!isOwner && !isInternalStaff) {
            throw new ForbiddenException('Not allowed to share this pet');
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

        const share = await this.passportPrisma.client.petConsentShare.create({
            data: {
                tenantId: pet.tenantId,
                petId: pet.id,
                ownerId: pet.ownerId,
                token,
                expiresAt,
            },
        });

        await this.auditWriter.write({
            tenantId: pet.tenantId,
            shareId: share.id,
            action: ConsentAuditAction.SHARE_CREATED,
            actorUserId: actor.sub,
            actorTenantId: actor.tenantId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { ttlDays },
        });

        return {
            id: share.id,
            petId: share.petId,
            token: share.token,
            expiresAt: share.expiresAt,
            revokedAt: share.revokedAt,
            accessCount: share.accessCount,
            lastAccessedAt: share.lastAccessedAt,
            createdAt: share.createdAt,
            shareUrl: `/api/v1/passport/shares/${share.token}`,
        };
    }

    async revokeShare(
        actor: JwtPayloadLike,
        shareId: string,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<ShareResponseDto> {
        const share = await this.passportPrisma.client.petConsentShare.findUnique({
            where: { id: shareId },
        });
        if (!share) throw new NotFoundException('Share not found');

        if (actor.role === UserRole.CLIENT && actor.sub !== share.ownerId) {
            throw new ForbiddenException('Only the owner can revoke');
        }
        if (actor.role !== UserRole.CLIENT && actor.tenantId !== share.tenantId) {
            throw new ForbiddenException('Cross-tenant revoke not allowed');
        }
        if (share.revokedAt) {
            throw new BadRequestException('Share is already revoked');
        }

        const updated = await this.passportPrisma.client.petConsentShare.update({
            where: { id: share.id },
            data: { revokedAt: new Date() },
        });

        await this.auditWriter.write({
            tenantId: updated.tenantId,
            shareId: updated.id,
            action: ConsentAuditAction.SHARE_REVOKED,
            actorUserId: actor.sub,
            actorTenantId: actor.tenantId,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
        });

        return {
            id: updated.id,
            petId: updated.petId,
            token: updated.token,
            expiresAt: updated.expiresAt,
            revokedAt: updated.revokedAt,
            accessCount: updated.accessCount,
            lastAccessedAt: updated.lastAccessedAt,
            createdAt: updated.createdAt,
            shareUrl: `/api/v1/passport/shares/${updated.token}`,
        };
    }

    async listMyShares(actor: JwtPayloadLike): Promise<ShareResponseDto[]> {
        const where =
            actor.role === UserRole.CLIENT
                ? { ownerId: actor.sub }
                : { tenantId: actor.tenantId };

        const shares = await this.prisma.petConsentShare.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return shares.map((s) => ({
            id: s.id,
            petId: s.petId,
            token: s.token,
            expiresAt: s.expiresAt,
            revokedAt: s.revokedAt,
            accessCount: s.accessCount,
            lastAccessedAt: s.lastAccessedAt,
            createdAt: s.createdAt,
            shareUrl: `/api/v1/passport/shares/${s.token}`,
        }));
    }

    /**
     * Acceso público vía token. Devuelve el pasaporte si el token es válido
     * y no está revocado ni expirado. Audita el acceso.
     */
    async getByShareToken(
        token: string,
        ctx: { ipAddress?: string; userAgent?: string },
    ): Promise<PassportPublicPet> {
        const share = await this.passportPrisma.client.petConsentShare.findUnique({
            where: { token },
        });
        if (!share) throw new NotFoundException('Share not found');
        if (share.revokedAt) throw new ForbiddenException('Share has been revoked');
        if (share.expiresAt.getTime() <= Date.now()) {
            throw new ForbiddenException('Share has expired');
        }

        const passport = await this.aggregate(share.petId);

        // Incrementar contador y actualizar lastAccessedAt.
        await this.passportPrisma.client.petConsentShare.update({
            where: { id: share.id },
            data: {
                accessCount: { increment: 1 },
                lastAccessedAt: new Date(),
            },
        });

        await this.auditWriter.write({
            tenantId: share.tenantId,
            shareId: share.id,
            action: ConsentAuditAction.SHARE_ACCESSED,
            actorUserId: undefined,
            actorTenantId: undefined,
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            metadata: { petId: share.petId },
        });

        return passport;
    }

    // ─── Helpers internos ─────────────────────────────────────────────────

    private async resolveAccess(
        actor: JwtPayloadLike,
        petId: string,
        scopes: ConsentScope[],
    ): Promise<{ sourceTenantId: string; consentId?: string }> {
        const pet = await this.passportPrisma.client.pet.findUnique({
            where: { id: petId },
            select: { id: true, ownerId: true, tenantId: true, isActive: true },
        });
        if (!pet || !pet.isActive) throw new NotFoundException('Pet not found');

        // Mismo tenant: staff u owner con lectura libre.
        if (actor.tenantId === pet.tenantId) {
            const isOwner = actor.role === UserRole.CLIENT && actor.sub === pet.ownerId;
            const isStaff =
                actor.role === UserRole.CLINIC_ADMIN ||
                actor.role === UserRole.VET ||
                actor.role === UserRole.RECEPTIONIST;
            if (!isOwner && !isStaff) {
                throw new ForbiddenException('Cannot access this pet passport');
            }
            return { sourceTenantId: pet.tenantId };
        }

        // Cross-tenant: requiere Consent GRANTED y activo.
        const grant = await this.consentService.findActiveGrantForPetAndTenant(
            petId,
            actor.tenantId,
            scopes,
        );
        if (!grant) {
            throw new ForbiddenException(
                'No active consent from the pet owner grants access to your clinic',
            );
        }
        return { sourceTenantId: pet.tenantId, consentId: grant.id };
    }

    private async aggregate(petId: string): Promise<PassportPublicPet> {
        const pet = await this.passportPrisma.client.pet.findUnique({
            where: { id: petId },
            include: {
                tenant: { select: { id: true, name: true } },
            },
        });
        if (!pet || !pet.isActive) throw new NotFoundException('Pet not found');

        const [vaccines, records, surgeries] = await Promise.all([
            this.passportPrisma.client.vaccination.findMany({
                where: { petId },
                orderBy: { administeredAt: 'desc' },
                take: PASSPORT_AGGREGATION_LIMIT,
            }),
            this.passportPrisma.client.medicalRecord.findMany({
                where: { petId },
                orderBy: { createdAt: 'desc' },
                take: PASSPORT_AGGREGATION_LIMIT,
                include: {
                    vet: { select: { firstName: true, lastName: true } },
                },
            }),
            this.passportPrisma.client.surgery.findMany({
                where: { petId },
                orderBy: { scheduledAt: 'desc' },
                take: PASSPORT_AGGREGATION_LIMIT,
            }),
        ]);

        // Histórico de peso desde medical records (campo weight) y pet.weight actual.
        const weightHistory = records
            .filter((r) => r.weight != null)
            .map((r) => ({ date: r.createdAt, weight: r.weight as number }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
        if (pet.weight != null) {
            weightHistory.push({ date: pet.updatedAt, weight: pet.weight });
        }

        return {
            id: pet.id,
            name: pet.name,
            species: pet.species as unknown as PetSpecies,
            breed: pet.breed,
            sex: pet.sex as unknown as PetSex,
            birthDate: pet.birthDate,
            color: pet.color,
            microchip: pet.microchip,
            photoUrl: pet.photoUrl,
            weight: pet.weight,
            allergies: pet.allergies,
            isNeutered: pet.isNeutered,
            issuedBy: {
                tenantId: pet.tenant.id,
                tenantName: pet.tenant.name,
            },
            vaccines: vaccines.map((v) => ({
                id: v.id,
                vaccineName: v.vaccineName,
                manufacturer: v.manufacturer,
                batchNumber: v.batchNumber,
                administeredAt: v.administeredAt,
                nextDueAt: v.nextDueAt,
                status: v.status,
            })),
            medicalRecords: records.map((r) => ({
                id: r.id,
                date: r.createdAt,
                chiefComplaint: r.chiefComplaint,
                diagnosis: r.diagnosis,
                treatment: r.treatment,
                vetName: r.vet
                    ? `${r.vet.firstName} ${r.vet.lastName}`.trim()
                    : null,
            })),
            surgeries: surgeries.map((s) => ({
                id: s.id,
                scheduledAt: s.scheduledAt,
                completedAt: s.status === 'COMPLETED' ? s.scheduledAt : null,
                type: s.type,
                status: s.status,
                postInstructions: s.postInstructions,
            })),
            weightHistory,
            generatedAt: new Date(),
        };
    }
}
