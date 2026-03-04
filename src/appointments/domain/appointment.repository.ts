import { AppointmentStatus, AppointmentType, UserRole } from '@nuvet/types';

export interface AppointmentFilterParams {
    petId?: string;
    vetId?: string;
    type?: AppointmentType;
    status?: AppointmentStatus;
    dateFrom?: string;
    dateTo?: string;
}

export interface AppointmentPaginationParams {
    skip: number;
    take: number;
}

export interface CreateAppointmentData {
    tenantId: string;
    petId: string;
    vetId?: string;
    type: string;
    scheduledAt: string;
    durationMinutes: number;
    notes?: string;
    branchId?: string;
}

export interface UpdateAppointmentData {
    vetId?: string;
    type?: string;
    scheduledAt?: string;
    durationMinutes?: number;
    notes?: string;
    status?: AppointmentStatus;
    branchId?: string;
    cancelReason?: string;
}

export interface CreateAuditLogData {
    appointmentId: string;
    action: string;
    performedById: string;
    tenantId: string;
    details?: Record<string, unknown>;
}

export interface AvailabilityData {
    holiday: { id: string } | null;
    clinicHours: { openTime: string; closeTime: string } | null;
    schedule: { startTime: string; endTime: string } | null;
    blocks: Array<{ startTime: Date; endTime: Date }>;
    booked: Array<{ scheduledAt: Date; durationMinutes: number }>;
}

export interface StaffMember {
    id: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}

export interface IAppointmentRepository {
    findAll(
        tenantId: string,
        filter: AppointmentFilterParams,
        pagination: AppointmentPaginationParams,
        sortOrder: 'asc' | 'desc',
        ownerId?: string,
    ): Promise<{ data: unknown[]; total: number }>;

    findOne(tenantId: string, id: string, ownerId?: string): Promise<unknown | null>;

    create(data: CreateAppointmentData): Promise<unknown>;

    update(id: string, data: UpdateAppointmentData): Promise<unknown>;

    updateStatus(
        id: string,
        status: AppointmentStatus,
        cancelReason?: string,
    ): Promise<unknown>;

    createAuditLog(data: CreateAuditLogData): Promise<void>;

    getAvailabilityData(
        tenantId: string,
        staffId: string,
        dayStr: string,
        date: Date,
    ): Promise<AvailabilityData>;

    checkConflict(
        tenantId: string,
        vetId: string,
        scheduledAt: string,
        durationMinutes: number,
    ): Promise<void>;

    getAssignableStaff(tenantId: string): Promise<StaffMember[]>;

    findPetWithOwner(
        petId: string,
        tenantId: string,
        ownerId?: string,
    ): Promise<{ ownerId: string } | null>;
}

export const APPOINTMENT_REPOSITORY = Symbol('IAppointmentRepository');
