import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CreateAppointmentDto,
    UpdateAppointmentDto,
    AppointmentFilterDto,
} from './dto/appointment.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../common/dto/pagination.dto';
import { AppointmentStatus, AppointmentType, UserRole } from '@nuvet/types';

@Injectable()
export class AppointmentsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto, filter: AppointmentFilterDto, ownerId?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);

        const where: Record<string, unknown> = {
            tenantId,
            ...(filter.petId && { petId: filter.petId }),
            ...(filter.vetId && { vetId: filter.vetId }),
            ...(filter.type && { type: filter.type }),
            ...(filter.status && { status: filter.status }),
        };
        if (ownerId) {
            where.pet = { ownerId };
        }

        if (filter.dateFrom || filter.dateTo) {
            where.scheduledAt = {
                ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
                ...(filter.dateTo && { lte: new Date(filter.dateTo + 'T23:59:59.999Z') }),
            };
        }

        const [appointments, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip,
                take,
                orderBy: { scheduledAt: query.sortOrder || 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    vet: { select: { id: true, firstName: true, lastName: true } },
                    groomer: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return buildPaginatedResponse(appointments, total, page, limit);
    }

    async findOne(tenantId: string, id: string, ownerId?: string) {
        const appointment = await this.prisma.appointment.findFirst({
            where: { id, tenantId, ...(ownerId ? { pet: { ownerId } } : {}) },
            include: {
                pet: { include: { owner: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
                vet: { select: { id: true, firstName: true, lastName: true, role: true } },
                groomer: { select: { id: true, firstName: true, lastName: true } },
                medicalRecord: true,
                vaccination: true,
            },
        });
        if (!appointment) throw new NotFoundException('Appointment not found');
        return appointment;
    }

    async create(tenantId: string, dto: CreateAppointmentDto, ownerId?: string) {
        // Check pet belongs to tenant
        const pet = await this.prisma.pet.findFirst({
            where: { id: dto.petId, tenantId, ...(ownerId ? { ownerId } : {}) },
        });
        if (!pet) throw new NotFoundException('Pet not found');

        // Check for scheduling conflict for the same vet/groomer
        if (dto.vetId) {
            await this.checkConflict(tenantId, dto.vetId, dto.scheduledAt, dto.durationMinutes || 30);
        }

        return this.prisma.appointment.create({
            data: {
                tenantId,
                petId: dto.petId,
                type: dto.type,
                scheduledAt: new Date(dto.scheduledAt),
                durationMinutes: dto.durationMinutes || 30,
                vetId: dto.vetId,
                groomerId: dto.groomerId,
                notes: dto.notes,
            },
            include: {
                pet: { select: { id: true, name: true, species: true } },
                vet: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateAppointmentDto, userId?: string) {
        const appointment = await this.findOne(tenantId, id);

        if (appointment.status === AppointmentStatus.COMPLETED ||
            appointment.status === AppointmentStatus.CANCELLED) {
            throw new BadRequestException('Cannot modify a completed or cancelled appointment');
        }

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: {
                ...dto,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            },
        });

        if (dto.status && dto.status !== appointment.status) {
            await this.prisma.appointmentAuditLog.create({
                data: {
                    appointmentId: id,
                    fromStatus: appointment.status,
                    toStatus: dto.status,
                    changedBy: userId,
                },
            });
        }
        return updated;
    }

    async cancel(tenantId: string, id: string, reason?: string, userId?: string, ownerId?: string) {
        const appointment = await this.findOne(tenantId, id, ownerId);
        if (appointment.status === AppointmentStatus.CANCELLED) {
            throw new ConflictException('Appointment is already cancelled');
        }

        const updated = await this.prisma.appointment.update({
            where: { id },
            data: { status: AppointmentStatus.CANCELLED, cancelReason: reason },
        });

        await this.prisma.appointmentAuditLog.create({
            data: {
                appointmentId: id,
                fromStatus: appointment.status,
                toStatus: AppointmentStatus.CANCELLED,
                changedBy: userId,
            },
        });
        return updated;
    }

    async getAvailability(tenantId: string, date: string, staffId: string) {
        const targetDate = new Date(date);
        const dayOfWeek = targetDate.getDay();
        const dayStr = targetDate.toISOString().slice(0, 10);

        const [holiday, clinicHours, schedule, blocks, booked] = await Promise.all([
            this.prisma.holiday.findFirst({
                where: { tenantId, date: { gte: new Date(dayStr), lte: new Date(dayStr + 'T23:59:59.999Z') } },
            }),
            this.prisma.clinicHours.findFirst({ where: { tenantId, branchId: null, dayOfWeek } }),
            this.prisma.staffSchedule.findFirst({ where: { tenantId, userId: staffId, dayOfWeek } }),
            this.prisma.block.findMany({
                where: {
                    tenantId,
                    OR: [{ userId: null }, { userId: staffId }],
                    startAt: { lt: new Date(dayStr + 'T23:59:59.999Z') },
                    endAt: { gt: new Date(dayStr + 'T00:00:00.000Z') },
                },
            }),
            this.prisma.appointment.findMany({
                where: {
                    tenantId,
                    OR: [{ vetId: staffId }, { groomerId: staffId }],
                    scheduledAt: { gte: new Date(dayStr + 'T00:00:00.000Z'), lte: new Date(dayStr + 'T23:59:59.999Z') },
                    status: { notIn: [AppointmentStatus.CANCELLED] },
                },
                select: { scheduledAt: true, durationMinutes: true },
            }),
        ]);

        if (holiday) {
            return { slots: [], reason: 'Holiday: ' + (holiday.name ?? 'Closed') };
        }

        let startHour = 9, startMin = 0, endHour = 17, endMin = 0, isClosed = false;
        if (schedule) {
            startHour = parseInt(schedule.startTime.split(':')[0], 10);
            startMin = parseInt(schedule.startTime.split(':')[1] ?? '0', 10);
            endHour = parseInt(schedule.endTime.split(':')[0], 10);
            endMin = parseInt(schedule.endTime.split(':')[1] ?? '0', 10);
        } else if (clinicHours) {
            isClosed = clinicHours.isClosed;
            if (!isClosed) {
                startHour = parseInt(clinicHours.openTime.split(':')[0], 10);
                startMin = parseInt(clinicHours.openTime.split(':')[1] ?? '0', 10);
                endHour = parseInt(clinicHours.closeTime.split(':')[0], 10);
                endMin = parseInt(clinicHours.closeTime.split(':')[1] ?? '0', 10);
            }
        }

        const dayStart = new Date(targetDate);
        dayStart.setHours(startHour, startMin, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        const slots: { time: string; available: boolean }[] = [];
        if (isClosed) return { slots };

        let current = new Date(dayStart);
        while (current < dayEnd) {
            const slotEnd = new Date(current.getTime() + 30 * 60000);
            const inBlock = blocks.some((b) => current < b.endAt && slotEnd > b.startAt);
            const isBooked = booked.some((appt) => {
                const start = new Date(appt.scheduledAt);
                const end = new Date(start.getTime() + appt.durationMinutes * 60000);
                return current < end && slotEnd > start;
            });
            slots.push({ time: current.toISOString(), available: !inBlock && !isBooked });
            current.setMinutes(current.getMinutes() + 30);
        }
        return { slots };
    }

    async getClinicAvailability(tenantId: string, date: string, type: string) {
        const assignable = await this.getAssignableStaff(tenantId);
        const requiresGroomer = type === AppointmentType.AESTHETICS;
        const eligibleStaff = assignable.filter((staff) =>
            requiresGroomer
                ? staff.role === UserRole.GROOMER || staff.role === UserRole.CLINIC_ADMIN
                : staff.role === UserRole.VET || staff.role === UserRole.CLINIC_ADMIN,
        );

        if (eligibleStaff.length === 0) {
            return { slots: [] };
        }

        const availabilityByStaff = await Promise.all(
            eligibleStaff.map(async (staff) => {
                const result = await this.getAvailability(tenantId, date, staff.id);
                return { staffId: staff.id, slots: result.slots ?? [] };
            }),
        );

        const merged = new Map<string, { time: string; available: boolean; staffId?: string }>();

        for (const source of availabilityByStaff) {
            for (const slot of source.slots) {
                const current = merged.get(slot.time);
                if (!current) {
                    merged.set(slot.time, {
                        time: slot.time,
                        available: slot.available,
                        staffId: slot.available ? source.staffId : undefined,
                    });
                    continue;
                }

                if (!current.available && slot.available) {
                    merged.set(slot.time, {
                        time: slot.time,
                        available: true,
                        staffId: source.staffId,
                    });
                }
            }
        }

        const slots = Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time));
        return { slots };
    }

    async getAssignableStaff(tenantId: string) {
        return this.prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
                role: { in: [UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.GROOMER] },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
            },
            orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
        });
    }

    private async checkConflict(tenantId: string, vetId: string, scheduledAt: string, durationMinutes: number) {
        const start = new Date(scheduledAt);
        const end = new Date(start.getTime() + durationMinutes * 60000);

        const conflict = await this.prisma.appointment.findFirst({
            where: {
                tenantId,
                vetId,
                status: { notIn: [AppointmentStatus.CANCELLED] },
                scheduledAt: { lt: end },
                AND: [
                    {
                        scheduledAt: { gte: new Date(start.getTime() - 240 * 60000) }, // Look back 4 hours just in case
                    },
                ],
            },
        });

        if (conflict) {
            const conflictEnd = new Date(
                new Date(conflict.scheduledAt).getTime() + conflict.durationMinutes * 60000,
            );
            // Strict overlap check
            if (conflictEnd > start && new Date(conflict.scheduledAt) < end) {
                throw new ConflictException(
                    `Vet has a conflicting appointment at ${conflict.scheduledAt.toISOString()}`,
                );
            }
        }
    }
}
