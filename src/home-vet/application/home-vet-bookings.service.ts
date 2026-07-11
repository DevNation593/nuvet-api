import { Inject, Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { HomeVetBookingStatus } from '@prisma/client';
import { JwtPayload, UserRole } from '@nuvet/types';
import {
    CreateHomeVetBookingData,
    HOME_VET_BOOKING_REPOSITORY,
    IHomeVetBookingRepository,
    ListHomeVetBookingsFilter,
} from '../domain/home-vet-booking.repository';

/**
 * Application layer de `home-vet` (Fase 3 · Slice 2).
 *
 * Reglas de negocio:
 *  - Dueños (CLIENT) pueden crear bookings para sus propias mascotas y
 *    listar/ver solo los suyos.
 *  - Staff (CLINIC_ADMIN, VET, RECEPTIONIST) puede listar todos los
 *    del tenant, asignar vet, transicionar status y editar.
 *  - Transiciones válidas:
 *      REQUESTED -> CONFIRMED (clínica confirma + asigna vet)
 *      CONFIRMED -> EN_ROUTE (vet salió)
 *      EN_ROUTE  -> IN_PROGRESS (vet llegó)
 *      IN_PROGRESS -> COMPLETED (vet terminó)
 *      REQUESTED|CONFIRMED|EN_ROUTE|IN_PROGRESS -> CANCELLED
 *      CONFIRMED|EN_ROUTE|IN_PROGRESS -> NO_SHOW
 *  - No se puede editar un booking CANCELLED o COMPLETED.
 *  - scheduledAt debe ser en el futuro al crear.
 */
@Injectable()
export class HomeVetBookingsService {
    constructor(
        @Inject(HOME_VET_BOOKING_REPOSITORY)
        private readonly repo: IHomeVetBookingRepository,
    ) {}

    async create(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        input: {
            petId: string;
            scheduledAt: Date;
            address: string;
            addressNotes?: string;
            reason: string;
            visitFeeCents?: number;
            travelFeeCents?: number;
            totalCents?: number;
            currency?: string;
            ownerId?: string;
        },
    ) {
        if (input.scheduledAt.getTime() <= Date.now()) {
            throw new BadRequestException('scheduledAt debe ser en el futuro');
        }
        // Dueño solo puede crear bookings para sí mismo.
        // Staff puede crear para cualquier owner del tenant.
        let ownerId: string;
        if (actor.role === UserRole.CLIENT) {
            ownerId = actor.sub;
        } else {
            if (!input.ownerId) {
                throw new BadRequestException('ownerId requerido para staff');
            }
            ownerId = input.ownerId;
        }

        const data: CreateHomeVetBookingData = {
            tenantId: actor.tenantId,
            ownerId,
            petId: input.petId,
            scheduledAt: input.scheduledAt,
            address: input.address,
            addressNotes: input.addressNotes,
            reason: input.reason,
            visitFeeCents: input.visitFeeCents ?? 0,
            travelFeeCents: input.travelFeeCents ?? 0,
            totalCents:
                input.totalCents ??
                (input.visitFeeCents ?? 0) + (input.travelFeeCents ?? 0),
            currency: input.currency ?? 'USD',
        };
        return this.repo.create(data);
    }

    async list(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        filter: ListHomeVetBookingsFilter,
        pagination: { skip: number; take: number },
    ) {
        if (actor.role === UserRole.CLIENT) {
            // Dueño solo ve los suyos.
            return this.repo.findByOwner(actor.sub, filter, pagination);
        }
        return this.repo.findByTenant(actor.tenantId, filter, pagination);
    }

    async getOne(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        id: string,
    ) {
        const booking = await this.repo.findOne(actor.tenantId, id);
        if (!booking) throw new NotFoundException('Booking no encontrado');
        if (
            actor.role === UserRole.CLIENT &&
            booking.ownerId !== actor.sub
        ) {
            // Para un cliente, simular "no encontrado" si el booking no es suyo
            // (evita fuga de información cross-tenant).
            throw new NotFoundException('Booking no encontrado');
        }
        return booking;
    }

    async update(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        id: string,
        input: Parameters<IHomeVetBookingRepository['update']>[2],
    ) {
        if (actor.role === UserRole.CLIENT) {
            throw new ForbiddenException(
                'Los clientes no pueden editar bookings; pueden cancelar',
            );
        }
        const existing = await this.repo.findOne(actor.tenantId, id);
        if (!existing) throw new NotFoundException('Booking no encontrado');
        if (
            existing.status === HomeVetBookingStatus.CANCELLED ||
            existing.status === HomeVetBookingStatus.COMPLETED
        ) {
            throw new BadRequestException(
                `No se puede editar un booking en estado ${existing.status}`,
            );
        }
        return this.repo.update(actor.tenantId, id, input);
    }

    async assignVet(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        id: string,
        vetId: string,
    ) {
        if (actor.role === UserRole.CLIENT) {
            throw new ForbiddenException('Solo staff puede asignar vet');
        }
        const existing = await this.repo.findOne(actor.tenantId, id);
        if (!existing) throw new NotFoundException('Booking no encontrado');
        if (existing.status === HomeVetBookingStatus.CANCELLED) {
            throw new BadRequestException('Booking cancelado, no se puede asignar vet');
        }
        if (existing.vetId && existing.vetId !== vetId) {
            // Reasignación: solo admin puede.
            if (actor.role !== UserRole.CLINIC_ADMIN) {
                throw new ForbiddenException(
                    'Solo un admin puede reasignar el veterinario',
                );
            }
        }
        const updated = await this.repo.assignVet(actor.tenantId, id, vetId);
        // Si estaba en REQUESTED, transicionar a CONFIRMED.
        if (updated.status === HomeVetBookingStatus.REQUESTED) {
            return this.repo.markStatus(
                actor.tenantId,
                id,
                HomeVetBookingStatus.CONFIRMED,
                {},
            );
        }
        return updated;
    }

    async transition(
        actor: Pick<JwtPayload, 'sub' | 'tenantId' | 'role'>,
        id: string,
        next: HomeVetBookingStatus,
        extra: { cancelReason?: string; visitNotes?: string; diagnosis?: string } = {},
    ) {
        if (actor.role === UserRole.CLIENT) {
            // Cliente solo puede CANCELLED.
            if (next !== HomeVetBookingStatus.CANCELLED) {
                throw new ForbiddenException(
                    'Clientes solo pueden cancelar bookings',
                );
            }
        }
        const existing = await this.repo.findOne(actor.tenantId, id);
        if (!existing) throw new NotFoundException('Booking no encontrado');
        if (
            actor.role === UserRole.CLIENT &&
            existing.ownerId !== actor.sub
        ) {
            throw new NotFoundException('Booking no encontrado');
        }
        this.assertTransition(existing.status, next);
        return this.repo.markStatus(actor.tenantId, id, next, extra);
    }

    private assertTransition(
        from: HomeVetBookingStatus,
        to: HomeVetBookingStatus,
    ) {
        const valid: Record<HomeVetBookingStatus, HomeVetBookingStatus[]> = {
            REQUESTED: [
                HomeVetBookingStatus.CONFIRMED,
                HomeVetBookingStatus.CANCELLED,
            ],
            CONFIRMED: [
                HomeVetBookingStatus.EN_ROUTE,
                HomeVetBookingStatus.CANCELLED,
                HomeVetBookingStatus.NO_SHOW,
            ],
            EN_ROUTE: [
                HomeVetBookingStatus.IN_PROGRESS,
                HomeVetBookingStatus.NO_SHOW,
                HomeVetBookingStatus.CANCELLED,
            ],
            IN_PROGRESS: [
                HomeVetBookingStatus.COMPLETED,
                HomeVetBookingStatus.NO_SHOW,
            ],
            COMPLETED: [],
            CANCELLED: [],
            NO_SHOW: [],
        };
        if (!valid[from].includes(to)) {
            throw new BadRequestException(
                `Transición inválida: ${from} → ${to}`,
            );
        }
    }
}
