import { Injectable } from '@nestjs/common';
import { Prisma, VaccinationCampaignStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    CreateCampaignData,
    IVaccinationCampaignRepository,
    ListCampaignsFilter,
    UpdateCampaignData,
    VaccinationCampaignEntity,
} from '../../domain/vaccination-campaign.repository';

@Injectable()
export class PrismaVaccinationCampaignRepository
    implements IVaccinationCampaignRepository
{
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateCampaignData): Promise<VaccinationCampaignEntity> {
        const row = await this.prisma.vaccinationCampaign.create({
            data: {
                tenantId: data.tenantId,
                name: data.name,
                description: data.description,
                vaccineName: data.vaccineName,
                startsAt: data.startsAt,
                endsAt: data.endsAt,
                location: data.location,
                capacity: data.capacity,
                priceCents: data.priceCents ?? 0,
                currency: data.currency ?? 'USD',
                notes: data.notes,
                createdById: data.createdById,
            },
        });
        return { ...row, registrationCount: 0 };
    }

    async findOne(
        tenantId: string,
        id: string,
    ): Promise<VaccinationCampaignEntity | null> {
        const row = await this.prisma.vaccinationCampaign.findFirst({
            where: { tenantId, id },
            include: { _count: { select: { registrations: true } } },
        });
        if (!row) return null;
        return { ...row, registrationCount: row._count.registrations };
    }

    async findByTenant(
        tenantId: string,
        filter: ListCampaignsFilter,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationCampaignEntity[]; total: number }> {
        const where: Prisma.VaccinationCampaignWhereInput = { tenantId };
        if (filter.status) where.status = filter.status;
        if (filter.fromDate || filter.toDate) {
            where.startsAt = {};
            if (filter.fromDate) where.startsAt.gte = filter.fromDate;
            if (filter.toDate) where.startsAt.lte = filter.toDate;
        }
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.vaccinationCampaign.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { startsAt: 'desc' },
                include: { _count: { select: { registrations: true } } },
            }),
            this.prisma.vaccinationCampaign.count({ where }),
        ]);
        return {
            data: rows.map((r) => ({
                ...r,
                registrationCount: r._count.registrations,
            })),
            total,
        };
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateCampaignData,
    ): Promise<VaccinationCampaignEntity> {
        const row = await this.prisma.vaccinationCampaign.update({
            where: { tenantId, id },
            data,
        });
        return { ...row, registrationCount: 0 };
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await this.prisma.vaccinationCampaign.delete({
            where: { tenantId, id },
        });
    }
}

// ── VaccinationRegistration ───────────────────────────────────────────────

import type {
    CreateRegistrationData,
    IVaccinationRegistrationRepository,
    UpdateRegistrationData,
    VaccinationRegistrationEntity,
} from '../../domain/vaccination-campaign.repository';

@Injectable()
export class PrismaVaccinationRegistrationRepository
    implements IVaccinationRegistrationRepository
{
    constructor(private readonly prisma: PrismaService) {}

    async create(
        data: CreateRegistrationData,
    ): Promise<VaccinationRegistrationEntity> {
        const row = await this.prisma.vaccinationRegistration.create({
            data: {
                tenantId: data.tenantId,
                campaignId: data.campaignId,
                petId: data.petId,
                ownerId: data.ownerId,
                notes: data.notes,
            },
            include: {
                pet: { select: { id: true, name: true, species: true } },
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return row as VaccinationRegistrationEntity;
    }

    async findOneGlobal(
        id: string,
    ): Promise<VaccinationRegistrationEntity | null> {
        const row = await this.prisma.vaccinationRegistration.findUnique({
            where: { id },
            include: {
                pet: { select: { id: true, name: true, species: true } },
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return row as VaccinationRegistrationEntity | null;
    }

    async findOneByCampaignAndPet(
        campaignId: string,
        petId: string,
    ): Promise<VaccinationRegistrationEntity | null> {
        const row = await this.prisma.vaccinationRegistration.findUnique({
            where: { campaignId_petId: { campaignId, petId } },
        });
        return row as VaccinationRegistrationEntity | null;
    }

    async findByCampaign(
        campaignId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationRegistrationEntity[]; total: number }> {
        const where = { campaignId };
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.vaccinationRegistration.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.vaccinationRegistration.count({ where }),
        ]);
        return { data: rows as VaccinationRegistrationEntity[], total };
    }

    async findByOwner(
        ownerId: string,
        pagination: { skip: number; take: number },
    ): Promise<{ data: VaccinationRegistrationEntity[]; total: number }> {
        const where = { ownerId };
        const [rows, total] = await this.prisma.$transaction([
            this.prisma.vaccinationRegistration.findMany({
                where,
                skip: pagination.skip,
                take: pagination.take,
                orderBy: { createdAt: 'desc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.vaccinationRegistration.count({ where }),
        ]);
        return { data: rows as VaccinationRegistrationEntity[], total };
    }

    async update(
        id: string,
        data: UpdateRegistrationData,
    ): Promise<VaccinationRegistrationEntity> {
        const row = await this.prisma.vaccinationRegistration.update({
            where: { id },
            data,
            include: {
                pet: { select: { id: true, name: true, species: true } },
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        return row as VaccinationRegistrationEntity;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.vaccinationRegistration.delete({ where: { id } });
    }
}
