import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import {
    CreateAppointmentDto,
    UpdateAppointmentDto,
    AppointmentFilterDto,
} from './dto/appointment.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../../common/dto/pagination.dto';
import { AppointmentStatus, AppointmentType, UserRole } from '@nuvet/types';
import {
    IAppointmentRepository,
    APPOINTMENT_REPOSITORY,
} from '../domain/appointment.repository';

@Injectable()
export class AppointmentsService {
    constructor(
        @Inject(APPOINTMENT_REPOSITORY)
        private readonly appointmentRepo: IAppointmentRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto, filter: AppointmentFilterDto, ownerId?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);

        const { data, total } = await this.appointmentRepo.findAll(
            tenantId,
            {
                petId: filter.petId,
                vetId: filter.vetId,
                type: filter.type,
                status: filter.status,
                dateFrom: filter.dateFrom,
                dateTo: filter.dateTo,
                branchId: filter.branchId,
            },
            { skip, take },
            (query.sortOrder as 'asc' | 'desc') || 'asc',
            ownerId,
        );

        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string, ownerId?: string) {
        const appointment = await this.appointmentRepo.findOne(tenantId, id, ownerId);
        if (!appointment) throw new NotFoundException('Appointment not found');
        return appointment;
    }

    async create(tenantId: string, dto: CreateAppointmentDto, ownerId?: string) {
        const pet = await this.appointmentRepo.findPetWithOwner(dto.petId, tenantId, ownerId);
        if (!pet) throw new NotFoundException('Pet not found');

        if (dto.vetId) {
            await this.appointmentRepo.checkConflict(tenantId, dto.vetId, dto.scheduledAt, dto.durationMinutes || 30);
        }

        return this.appointmentRepo.create({
            tenantId,
            petId: dto.petId,
            vetId: dto.vetId,
            groomerId: dto.groomerId,
            type: dto.type,
            scheduledAt: dto.scheduledAt,
            durationMinutes: dto.durationMinutes || 30,
            notes: dto.notes,
            branchId: dto.branchId,
        });
    }

    async update(tenantId: string, id: string, dto: UpdateAppointmentDto, userId?: string) {
        const appointment = await this.findOne(tenantId, id) as any;

        if (
            appointment.status === AppointmentStatus.COMPLETED ||
            appointment.status === AppointmentStatus.CANCELLED
        ) {
            throw new BadRequestException('Cannot modify a completed or cancelled appointment');
        }

        const updated = await this.appointmentRepo.update(id, {
            ...dto,
        });

        if (dto.status && dto.status !== appointment.status && userId) {
            await this.appointmentRepo.createAuditLog({
                appointmentId: id,
                action: 'STATUS_CHANGE',
                performedById: userId,
                tenantId,
                details: { fromStatus: appointment.status, toStatus: dto.status },
            });
        }
        return updated;
    }

    async cancel(tenantId: string, id: string, reason?: string, userId?: string, ownerId?: string) {
        const appointment = await this.findOne(tenantId, id, ownerId) as any;
        if (appointment.status === AppointmentStatus.CANCELLED) {
            throw new ConflictException('Appointment is already cancelled');
        }

        const updated = await this.appointmentRepo.updateStatus(
            id,
            AppointmentStatus.CANCELLED,
            reason,
        );

        if (userId) {
            await this.appointmentRepo.createAuditLog({
                appointmentId: id,
                action: 'CANCELLED',
                performedById: userId,
                tenantId,
                details: { fromStatus: appointment.status, toStatus: AppointmentStatus.CANCELLED },
            });
        }
        return updated;
    }

    async getAvailability(tenantId: string, date: string, staffId: string, branchId?: string) {
        const targetDate = new Date(date);
        const dayStr = targetDate.toISOString().slice(0, 10);

        const { holiday, clinicHours, schedule, blocks, booked } =
            await this.appointmentRepo.getAvailabilityData(tenantId, staffId, dayStr, targetDate, branchId);

        if (holiday) {
            return { slots: [], reason: 'Holiday: Closed' };
        }

        const slots = this.buildSlots(targetDate, clinicHours, schedule, blocks, booked);
        return { slots };
    }

    async getAssignableStaff(tenantId: string) {
        return this.appointmentRepo.getAssignableStaff(tenantId);
    }

    async getClinicAvailability(tenantId: string, date: string, type: string) {
        const targetDate = new Date(date);
        const dayStr = targetDate.toISOString().slice(0, 10);

        const [assignable, tenantContext] = await Promise.all([
            this.appointmentRepo.getAssignableStaff(tenantId),
            this.appointmentRepo.getTenantDayContext(tenantId, dayStr, targetDate),
        ]);

        if (tenantContext.holiday) return { slots: [], reason: 'Holiday: Closed' };

        const requiresGroomer = type === AppointmentType.AESTHETICS;
        const eligibleStaff = assignable.filter((staff) =>
            requiresGroomer
                ? staff.role === UserRole.GROOMER || staff.role === UserRole.CLINIC_ADMIN
                : staff.role === UserRole.VET || staff.role === UserRole.CLINIC_ADMIN,
        );

        if (eligibleStaff.length === 0) return { slots: [] };

        const staffDataList = await Promise.all(
            eligibleStaff.map(async (staff) => {
                const data = await this.appointmentRepo.getStaffDayData(tenantId, staff.id, dayStr, targetDate);
                return { staffId: staff.id, ...data };
            }),
        );

        const merged = new Map<string, { time: string; available: boolean; staffId?: string }>();

        for (const staffData of staffDataList) {
            const slots = this.buildSlots(targetDate, tenantContext.clinicHours, staffData.schedule, staffData.blocks, staffData.booked);
            for (const slot of slots) {
                const current = merged.get(slot.time);
                if (!current) {
                    merged.set(slot.time, {
                        time: slot.time,
                        available: slot.available,
                        staffId: slot.available ? staffData.staffId : undefined,
                    });
                } else if (!current.available && slot.available) {
                    merged.set(slot.time, { time: slot.time, available: true, staffId: staffData.staffId });
                }
            }
        }

        const slots = Array.from(merged.values()).sort((a, b) => a.time.localeCompare(b.time));
        return { slots };
    }

    private buildSlots(
        targetDate: Date,
        clinicHours: { openTime: string; closeTime: string } | null,
        schedule: { startTime: string; endTime: string } | null,
        blocks: Array<{ startTime: Date; endTime: Date }>,
        booked: Array<{ scheduledAt: Date; durationMinutes: number }>,
    ): Array<{ time: string; available: boolean }> {
        let startHour = 9, startMin = 0, endHour = 17, endMin = 0, isClosed = false;

        if (schedule) {
            startHour = parseInt(schedule.startTime.split(':')[0], 10);
            startMin = parseInt(schedule.startTime.split(':')[1] ?? '0', 10);
            endHour = parseInt(schedule.endTime.split(':')[0], 10);
            endMin = parseInt(schedule.endTime.split(':')[1] ?? '0', 10);
        } else if (clinicHours) {
            const ch = clinicHours as any;
            isClosed = ch.isClosed ?? false;
            if (!isClosed) {
                startHour = parseInt(clinicHours.openTime.split(':')[0], 10);
                startMin = parseInt(clinicHours.openTime.split(':')[1] ?? '0', 10);
                endHour = parseInt(clinicHours.closeTime.split(':')[0], 10);
                endMin = parseInt(clinicHours.closeTime.split(':')[1] ?? '0', 10);
            }
        }

        if (isClosed) return [];

        const dayStart = new Date(targetDate);
        dayStart.setHours(startHour, startMin, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(endHour, endMin, 0, 0);

        const slots: Array<{ time: string; available: boolean }> = [];
        let current = new Date(dayStart);

        while (current < dayEnd) {
            const slotEnd = new Date(current.getTime() + 30 * 60000);
            const inBlock = blocks.some((b) => current < b.endTime && slotEnd > b.startTime);
            const isBooked = booked.some((appt) => {
                const start = new Date(appt.scheduledAt);
                const end = new Date(start.getTime() + appt.durationMinutes * 60000);
                return current < end && slotEnd > start;
            });
            slots.push({ time: current.toISOString(), available: !inBlock && !isBooked });
            current = new Date(current.getTime() + 30 * 60000);
        }

        return slots;
    }
}