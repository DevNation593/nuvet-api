import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IAppointmentRepository,
    AppointmentFilterParams,
    AppointmentPaginationParams,
    CreateAppointmentData,
    UpdateAppointmentData,
    CreateAuditLogData,
    AvailabilityData,
    StaffMember,
} from '../../domain/appointment.repository';
import { AppointmentStatus, UserRole } from '@nuvet/types';

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        filter: AppointmentFilterParams,
        pagination: AppointmentPaginationParams,
        sortOrder: 'asc' | 'desc',
        ownerId?: string,
    ): Promise<{ data: unknown[]; total: number }> {
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

        const [data, total] = await Promise.all([
            this.prisma.appointment.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { scheduledAt: sortOrder },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    vet: { select: { id: true, firstName: true, lastName: true } },
                    groomer: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.appointment.count({ where }),
        ]);

        return { data, total };
    }

    async findOne(tenantId: string, id: string, ownerId?: string): Promise<unknown | null> {
        return this.prisma.appointment.findFirst({
            where: { id, tenantId, ...(ownerId ? { pet: { ownerId } } : {}) },
            include: {
                pet: {
                    include: {
                        owner: { select: { id: true, firstName: true, lastName: true, phone: true } },
                    },
                },
                vet: { select: { id: true, firstName: true, lastName: true, role: true } },
                groomer: { select: { id: true, firstName: true, lastName: true } },
                medicalRecord: true,
                vaccination: true,
            },
        });
    }

    async create(data: CreateAppointmentData): Promise<unknown> {
        return this.prisma.appointment.create({
            data: {
                tenantId: data.tenantId,
                petId: data.petId,
                type: data.type as any,
                scheduledAt: new Date(data.scheduledAt),
                durationMinutes: data.durationMinutes,
                vetId: data.vetId,
                notes: data.notes,
                branchId: data.branchId,
            },
            include: {
                pet: { select: { id: true, name: true, species: true } },
                vet: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async update(id: string, data: UpdateAppointmentData): Promise<unknown> {
        return this.prisma.appointment.update({
            where: { id },
            data: {
                ...data,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            } as any,
        });
    }

    async updateStatus(
        id: string,
        status: AppointmentStatus,
        cancelReason?: string,
    ): Promise<unknown> {
        return this.prisma.appointment.update({
            where: { id },
            data: { status: status as any, ...(cancelReason ? { cancelReason } : {}) },
        });
    }

    async createAuditLog(data: CreateAuditLogData): Promise<void> {
        await this.prisma.appointmentAuditLog.create({
            data: {
                appointmentId: data.appointmentId,
                fromStatus: data.details?.['fromStatus'] as any,
                toStatus: data.details?.['toStatus'] as any,
                changedBy: data.performedById,
            },
        });
    }

    async getAvailabilityData(
        tenantId: string,
        staffId: string,
        dayStr: string,
        date: Date,
    ): Promise<AvailabilityData> {
        const dayOfWeek = date.getDay();

        const [holiday, clinicHours, schedule, blocks, booked] = await Promise.all([
            this.prisma.holiday.findFirst({
                where: {
                    tenantId,
                    date: {
                        gte: new Date(dayStr),
                        lte: new Date(dayStr + 'T23:59:59.999Z'),
                    },
                },
            }),
            this.prisma.clinicHours.findFirst({
                where: { tenantId, branchId: null, dayOfWeek },
            }),
            this.prisma.staffSchedule.findFirst({
                where: { tenantId, userId: staffId, dayOfWeek },
            }),
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
                    scheduledAt: {
                        gte: new Date(dayStr + 'T00:00:00.000Z'),
                        lte: new Date(dayStr + 'T23:59:59.999Z'),
                    },
                    status: { notIn: [AppointmentStatus.CANCELLED as any] },
                },
                select: { scheduledAt: true, durationMinutes: true },
            }),
        ]);

        return {
            holiday: holiday ? { id: (holiday as any).id } : null,
            clinicHours: clinicHours
                ? {
                      openTime: (clinicHours as any).openTime,
                      closeTime: (clinicHours as any).closeTime,
                  }
                : null,
            schedule: schedule
                ? {
                      startTime: (schedule as any).startTime,
                      endTime: (schedule as any).endTime,
                  }
                : null,
            blocks: (blocks as any[]).map((b) => ({
                startTime: new Date(b.startAt),
                endTime: new Date(b.endAt),
            })),
            booked: (booked as any[]).map((a) => ({
                scheduledAt: new Date(a.scheduledAt),
                durationMinutes: a.durationMinutes,
            })),
        };
    }

    async checkConflict(
        tenantId: string,
        vetId: string,
        scheduledAt: string,
        durationMinutes: number,
    ): Promise<void> {
        const start = new Date(scheduledAt);
        const end = new Date(start.getTime() + durationMinutes * 60000);

        const conflict = await this.prisma.appointment.findFirst({
            where: {
                tenantId,
                vetId,
                status: { notIn: [AppointmentStatus.CANCELLED as any] },
                scheduledAt: { lt: end },
                AND: [{ scheduledAt: { gte: new Date(start.getTime() - 240 * 60000) } }],
            },
        });

        if (conflict) {
            const conflictEnd = new Date(
                new Date((conflict as any).scheduledAt).getTime() +
                    (conflict as any).durationMinutes * 60000,
            );
            if (conflictEnd > start && new Date((conflict as any).scheduledAt) < end) {
                throw new ConflictException(
                    `Vet has a conflicting appointment at ${(conflict as any).scheduledAt.toISOString()}`,
                );
            }
        }
    }

    async getAssignableStaff(tenantId: string): Promise<StaffMember[]> {
        const staff = await this.prisma.user.findMany({
            where: {
                tenantId,
                isActive: true,
                role: {
                    in: [UserRole.CLINIC_ADMIN as any, UserRole.VET as any, UserRole.GROOMER as any],
                },
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
            },
            orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
        });
        return staff as unknown as StaffMember[];
    }

    async findPetWithOwner(
        petId: string,
        tenantId: string,
        ownerId?: string,
    ): Promise<{ ownerId: string } | null> {
        return this.prisma.pet.findFirst({
            where: { id: petId, tenantId, ...(ownerId ? { ownerId } : {}) },
            select: { ownerId: true },
        }) as Promise<{ ownerId: string } | null>;
    }
}
