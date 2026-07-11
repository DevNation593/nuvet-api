import { Injectable } from '@nestjs/common';
import { HomeVetBookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    CreateHomeVetBookingData,
    HomeVetBookingEntity,
    IHomeVetBookingRepository,
    ListHomeVetBookingsFilter,
    UpdateHomeVetBookingData,
} from '../../domain/home-vet-booking.repository';

const includeRelations = {
    pet: { select: { id: true, name: true, species: true } },
    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
    vet: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.HomeVetBookingInclude;

@Injectable()
export class PrismaHomeVetBookingRepository implements IHomeVetBookingRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateHomeVetBookingData): Promise<HomeVetBookingEntity> {
        const created = await this.prisma.homeVetBooking.create({
            data: {
                tenantId: data.tenantId,
                ownerId: data.ownerId,
                petId: data.petId,
                scheduledAt: data.scheduledAt,
                address: data.address,
                addressNotes: data.addressNotes ?? null,
                reason: data.reason,
                visitFeeCents: data.visitFeeCents ?? 0,
                travelFeeCents: data.travelFeeCents ?? 0,
                totalCents: data.totalCents ?? 0,
                currency: data.currency ?? 'USD',
            },
            include: includeRelations,
        });
        return created as unknown as HomeVetBookingEntity;
    }

    async findOne(
        tenantId: string,
        id: string,
    ): Promise<HomeVetBookingEntity | null> {
        const found = await this.prisma.homeVetBooking.findFirst({
            where: { id, tenantId },
            include: includeRelations,
        });
        return (found as unknown as HomeVetBookingEntity | null) ?? null;
    }

    async findByTenant(
        tenantId: string,
        filter: ListHomeVetBookingsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: HomeVetBookingEntity[]; total: number }> {
        const where = this.buildWhere(tenantId, filter);
        const [data, total] = await this.prisma.$transaction([
            this.prisma.homeVetBooking.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { scheduledAt: 'asc' },
                include: includeRelations,
            }),
            this.prisma.homeVetBooking.count({ where }),
        ]);
        return {
            data: data as unknown as HomeVetBookingEntity[],
            total,
        };
    }

    async findByOwner(
        ownerId: string,
        filter: ListHomeVetBookingsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: HomeVetBookingEntity[]; total: number }> {
        const where: Prisma.HomeVetBookingWhereInput = { ownerId };
        if (filter.status) where.status = filter.status;
        if (filter.petId) where.petId = filter.petId;
        if (filter.vetId) where.vetId = filter.vetId;
        if (filter.fromDate || filter.toDate) {
            where.scheduledAt = {};
            if (filter.fromDate) where.scheduledAt.gte = filter.fromDate;
            if (filter.toDate) where.scheduledAt.lte = filter.toDate;
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.homeVetBooking.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { scheduledAt: 'asc' },
                include: includeRelations,
            }),
            this.prisma.homeVetBooking.count({ where }),
        ]);
        return {
            data: data as unknown as HomeVetBookingEntity[],
            total,
        };
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateHomeVetBookingData,
    ): Promise<HomeVetBookingEntity> {
        const updated = await this.prisma.homeVetBooking.update({
            where: { id },
            data: {
                ...(data.scheduledAt && { scheduledAt: data.scheduledAt }),
                ...(data.address !== undefined && { address: data.address }),
                ...(data.addressNotes !== undefined && {
                    addressNotes: data.addressNotes,
                }),
                ...(data.reason !== undefined && { reason: data.reason }),
                ...(data.visitFeeCents !== undefined && {
                    visitFeeCents: data.visitFeeCents,
                }),
                ...(data.travelFeeCents !== undefined && {
                    travelFeeCents: data.travelFeeCents,
                }),
                ...(data.totalCents !== undefined && {
                    totalCents: data.totalCents,
                }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.visitNotes !== undefined && {
                    visitNotes: data.visitNotes,
                }),
                ...(data.diagnosis !== undefined && {
                    diagnosis: data.diagnosis,
                }),
                ...(data.internalNotes !== undefined && {
                    internalNotes: data.internalNotes,
                }),
            },
            include: includeRelations,
        });
        // Defensive: ensure tenantId matches (so we never cross tenants).
        if (updated.tenantId !== tenantId) {
            throw new Error('Tenant mismatch en update');
        }
        return updated as unknown as HomeVetBookingEntity;
    }

    async assignVet(
        tenantId: string,
        id: string,
        vetId: string,
    ): Promise<HomeVetBookingEntity> {
        const updated = await this.prisma.homeVetBooking.update({
            where: { id },
            data: { vetId },
            include: includeRelations,
        });
        if (updated.tenantId !== tenantId) {
            throw new Error('Tenant mismatch en assignVet');
        }
        return updated as unknown as HomeVetBookingEntity;
    }

    async markStatus(
        tenantId: string,
        id: string,
        status: HomeVetBookingStatus,
        extra: { cancelReason?: string; visitNotes?: string; diagnosis?: string },
    ): Promise<HomeVetBookingEntity> {
        const now = new Date();
        const updated = await this.prisma.homeVetBooking.update({
            where: { id },
            data: {
                status,
                ...(status === HomeVetBookingStatus.CANCELLED && {
                    cancelledAt: now,
                    cancelReason: extra.cancelReason ?? null,
                }),
                ...(status === HomeVetBookingStatus.COMPLETED && {
                    completedAt: now,
                    ...(extra.visitNotes !== undefined && {
                        visitNotes: extra.visitNotes,
                    }),
                    ...(extra.diagnosis !== undefined && {
                        diagnosis: extra.diagnosis,
                    }),
                }),
            },
            include: includeRelations,
        });
        if (updated.tenantId !== tenantId) {
            throw new Error('Tenant mismatch en markStatus');
        }
        return updated as unknown as HomeVetBookingEntity;
    }

    private buildWhere(
        tenantId: string,
        filter: ListHomeVetBookingsFilter,
    ): Prisma.HomeVetBookingWhereInput {
        const where: Prisma.HomeVetBookingWhereInput = { tenantId };
        if (filter.status) where.status = filter.status;
        if (filter.ownerId) where.ownerId = filter.ownerId;
        if (filter.vetId) where.vetId = filter.vetId;
        if (filter.petId) where.petId = filter.petId;
        if (filter.fromDate || filter.toDate) {
            where.scheduledAt = {};
            if (filter.fromDate) where.scheduledAt.gte = filter.fromDate;
            if (filter.toDate) where.scheduledAt.lte = filter.toDate;
        }
        return where;
    }
}
