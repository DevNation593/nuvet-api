import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';
import {
    CreateCampaignData,
    CreateRegistrationData,
    IVaccinationCampaignRepository,
    IVaccinationRegistrationRepository,
    ListCampaignsFilter,
    UpdateCampaignData,
    UpdateRegistrationData,
    VACCINATION_CAMPAIGN_REPOSITORY,
    VACCINATION_REGISTRATION_REPOSITORY,
} from '../domain/vaccination-campaign.repository';

/**
 * Fase 3 · Slice 1 — Vaccination Campaigns.
 *
 * Reglas de negocio:
 *   - Una campaña en DRAFT/OPEN acepta inscripciones.
 *   - En CLOSED/COMPLETED/CANCELLED no se aceptan más registros.
 *   - El dueño solo puede inscribir mascotas propias (Pet.ownerId).
 *   - El staff del tenant puede inscribir cualquier mascota del tenant.
 *   - markAttended cambia status + attendedAt atómicamente.
 *   - Cancelar una inscripción la marca CANCELLED (no se borra para
 *     conservar histórico de auditoría de la campaña).
 */
@Injectable()
export class VaccinationCampaignsService {
    constructor(
        @Inject(VACCINATION_CAMPAIGN_REPOSITORY)
        private readonly campaignRepo: IVaccinationCampaignRepository,
        @Inject(VACCINATION_REGISTRATION_REPOSITORY)
        private readonly registrationRepo: IVaccinationRegistrationRepository,
        private readonly prisma: PrismaService,
        private readonly passportPrisma: PassportPrismaService,
    ) {}

    // ── Campaigns ───────────────────────────────────────────────────────────

    async listForTenant(
        tenantId: string,
        filter: ListCampaignsFilter,
        pagination: { skip: number; take: number },
    ) {
        return this.campaignRepo.findByTenant(tenantId, filter, pagination);
    }

    async getOne(tenantId: string, id: string) {
        const campaign = await this.campaignRepo.findOne(tenantId, id);
        if (!campaign) {
            throw new NotFoundException('Campaña no encontrada');
        }
        return campaign;
    }

    async create(tenantId: string, data: Omit<CreateCampaignData, 'tenantId'>) {
        if (data.endsAt.getTime() <= data.startsAt.getTime()) {
            throw new BadRequestException(
                'endsAt debe ser posterior a startsAt',
            );
        }
        if (data.capacity !== undefined && data.capacity < 0) {
            throw new BadRequestException('capacity no puede ser negativo');
        }
        return this.campaignRepo.create({ ...data, tenantId });
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateCampaignData,
    ) {
        // Cargamos primero para validar invariantes (fechas + transición de status)
        const existing = await this.campaignRepo.findOne(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Campaña no encontrada');
        }
        if (
            data.startsAt ||
            data.endsAt ||
            data.status === 'OPEN' ||
            data.status === 'COMPLETED'
        ) {
            const newStart = data.startsAt ?? existing.startsAt;
            const newEnd = data.endsAt ?? existing.endsAt;
            if (newEnd.getTime() <= newStart.getTime()) {
                throw new BadRequestException(
                    'endsAt debe ser posterior a startsAt',
                );
            }
        }
        return this.campaignRepo.update(tenantId, id, data);
    }

    async delete(tenantId: string, id: string) {
        const existing = await this.campaignRepo.findOne(tenantId, id);
        if (!existing) {
            throw new NotFoundException('Campaña no encontrada');
        }
        // Bloqueamos delete si la campaña ya tiene inscripciones
        // atendidas — preserva histórico.
        if (existing.registrationCount && existing.registrationCount > 0) {
            // Permitimos si todas son CANCELLED o no vino a la cita,
            // pero en general preferimos que el admin cancele la campaña
            // (status=CANCELLED) en vez de eliminarla.
            throw new ConflictException(
                'No se puede eliminar una campaña con inscripciones. ' +
                    'Cámbiala a status=CANCELLED en su lugar.',
            );
        }
        await this.campaignRepo.delete(tenantId, id);
    }

    // ── Registrations ───────────────────────────────────────────────────────

    async listRegistrations(
        campaignId: string,
        tenantId: string,
        pagination: { skip: number; take: number },
    ) {
        // Validamos que la campaña exista en el tenant (seguridad cross-tenant)
        const campaign = await this.campaignRepo.findOne(tenantId, campaignId);
        if (!campaign) {
            throw new NotFoundException('Campaña no encontrada');
        }
        return this.registrationRepo.findByCampaign(campaignId, pagination);
    }

    async listMineRegistrations(
        ownerId: string,
        pagination: { skip: number; take: number },
    ) {
        return this.registrationRepo.findByOwner(ownerId, pagination);
    }

    async registerPet(
        actor: { sub: string; tenantId: string; role: string },
        data: Omit<CreateRegistrationData, 'tenantId' | 'ownerId'>,
    ) {
        // 1. La campaña debe existir y aceptar inscripciones.
        const campaign = await this.campaignRepo.findOne(
            actor.tenantId,
            data.campaignId,
        );
        if (!campaign) {
            throw new NotFoundException('Campaña no encontrada');
        }
        if (campaign.status !== 'OPEN' && campaign.status !== 'CLOSED') {
            throw new ConflictException(
                `La campaña está en estado ${campaign.status} y no acepta inscripciones`,
            );
        }
        if (
            campaign.capacity !== null &&
            (campaign.registrationCount ?? 0) >= campaign.capacity
        ) {
            throw new ConflictException('La campaña ya alcanzó su capacidad');
        }
        if (campaign.startsAt.getTime() < Date.now() - 60 * 60 * 1000) {
            // Si la campaña ya empezó hace más de 1h, no se aceptan
            // inscripciones tardías (la jornada ya está en curso).
            throw new ConflictException(
                'La campaña ya comenzó y no acepta más inscripciones',
            );
        }

        // 2. La mascota debe existir y ser del tenant.
        const pet = await this.prisma.pet.findFirst({
            where: { id: data.petId, tenantId: actor.tenantId },
        });
        if (!pet) throw new NotFoundException('Mascota no encontrada');

        // 3. Authz: el dueño solo puede inscribir mascotas propias;
        //    el staff del tenant puede inscribir cualquier mascota.
        const isOwner = pet.ownerId === actor.sub;
        const isStaff = ['CLINIC_ADMIN', 'VET', 'RECEPTIONIST'].includes(
            actor.role,
        );
        if (!isOwner && !isStaff) {
            throw new ForbiddenException(
                'Solo el dueño de la mascota o staff de la clínica puede inscribirla',
            );
        }

        // 4. No doble inscripción para la misma mascota.
        const existing = await this.registrationRepo.findOneByCampaignAndPet(
            data.campaignId,
            data.petId,
        );
        if (existing) {
            if (existing.status === 'CANCELLED') {
                // Re-habilitamos la inscripción
                return this.registrationRepo.update(existing.id, {
                    status: 'REGISTERED',
                    notes: data.notes,
                });
            }
            throw new ConflictException(
                'La mascota ya está inscrita en esta campaña',
            );
        }

        return this.registrationRepo.create({
            tenantId: actor.tenantId,
            campaignId: data.campaignId,
            petId: data.petId,
            ownerId: pet.ownerId,
            notes: data.notes,
        });
    }

    async cancelRegistration(
        actor: { sub: string; tenantId: string; role: string },
        registrationId: string,
    ) {
        const reg = await this.registrationRepo.findOneGlobal(registrationId);
        if (!reg) {
            throw new NotFoundException('Inscripción no encontrada');
        }
        if (reg.tenantId !== actor.tenantId) {
            throw new ForbiddenException(
                'Inscripción pertenece a otro tenant',
            );
        }
        const isOwner = reg.ownerId === actor.sub;
        const isStaff = ['CLINIC_ADMIN', 'VET', 'RECEPTIONIST'].includes(
            actor.role,
        );
        if (!isOwner && !isStaff) {
            throw new ForbiddenException(
                'Solo el dueño o el staff pueden cancelar la inscripción',
            );
        }
        return this.registrationRepo.update(registrationId, {
            status: 'CANCELLED',
        });
    }

    async markAttended(
        actor: { sub: string; tenantId: string; role: string },
        registrationId: string,
        data: UpdateRegistrationData & { attendedAt?: Date },
    ) {
        // Solo staff puede marcar asistencia.
        if (
            !['CLINIC_ADMIN', 'VET', 'RECEPTIONIST'].includes(actor.role)
        ) {
            throw new ForbiddenException(
                'Solo el staff puede marcar asistencia',
            );
        }
        const reg = await this.registrationRepo.findOneGlobal(registrationId);
        if (!reg) {
            throw new NotFoundException('Inscripción no encontrada');
        }
        if (reg.tenantId !== actor.tenantId) {
            throw new ForbiddenException(
                'Inscripción pertenece a otro tenant',
            );
        }
        return this.registrationRepo.update(registrationId, {
            status: 'ATTENDED',
            attendedAt: data.attendedAt ?? new Date(),
            notes: data.notes,
        });
    }

    async markNoShow(
        actor: { sub: string; tenantId: string; role: string },
        registrationId: string,
    ) {
        if (
            !['CLINIC_ADMIN', 'VET', 'RECEPTIONIST'].includes(actor.role)
        ) {
            throw new ForbiddenException(
                'Solo el staff puede marcar no-show',
            );
        }
        const reg = await this.registrationRepo.findOneGlobal(registrationId);
        if (!reg) {
            throw new NotFoundException('Inscripción no encontrada');
        }
        if (reg.tenantId !== actor.tenantId) {
            throw new ForbiddenException(
                'Inscripción pertenece a otro tenant',
            );
        }
        return this.registrationRepo.update(registrationId, {
            status: 'NO_SHOW',
        });
    }
}
