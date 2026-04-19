import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPetRepository, CreatePetData, PetWithDetails, ClinicalHistory } from '../../domain/pet.repository';
import { PetEntity } from '../../domain/pet.entity';
import { sanitizeSortBy } from '../../../common/dto/pagination.dto';

@Injectable()
export class PrismaPetRepository implements IPetRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
        ownerId?: string,
        includeInactive = false,
    ): Promise<{ data: PetWithDetails[]; total: number }> {
        const where = {
            tenantId,
            ...(includeInactive ? {} : { isActive: true }),
            ...(ownerId ? { ownerId } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.pet.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { [sanitizeSortBy(query.sortBy)]: query.sortOrder ?? 'desc' },
                include: {
                    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            }),
            this.prisma.pet.count({ where }),
        ]);
        return { data: data as unknown as PetWithDetails[], total };
    }

    async findOne(tenantId: string, id: string, ownerId?: string): Promise<PetWithDetails | null> {
        const pet = await this.prisma.pet.findFirst({
            where: { id, tenantId, ...(ownerId ? { ownerId } : {}) },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                vaccinations: { orderBy: { administeredAt: 'desc' }, take: 5 },
                medicalRecords: { orderBy: { createdAt: 'desc' }, take: 3 },
            },
        });
        return pet as unknown as PetWithDetails | null;
    }

    async findOwner(tenantId: string, ownerId: string): Promise<{ id: string } | null> {
        return this.prisma.user.findFirst({ where: { id: ownerId, tenantId }, select: { id: true } });
    }

    async create(data: CreatePetData): Promise<PetEntity> {
        return this.prisma.pet.create({ data: data as any }) as unknown as PetEntity;
    }

    async update(id: string, data: Partial<CreatePetData>): Promise<PetEntity> {
        return this.prisma.pet.update({ where: { id }, data: data as any }) as unknown as PetEntity;
    }

    async softDelete(id: string): Promise<void> {
        await this.prisma.pet.update({ where: { id }, data: { isActive: false } });
    }

    async reactivate(id: string): Promise<void> {
        await this.prisma.pet.update({ where: { id }, data: { isActive: true } });
    }

    async getClinicalHistory(tenantId: string, id: string): Promise<ClinicalHistory | null> {
        const pet = await this.prisma.pet.findFirst({
            where: { id, tenantId },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });
        if (!pet) return null;

        const [medicalRecords, vaccinations, surgeries] = await Promise.all([
            this.prisma.medicalRecord.findMany({
                where: { petId: id, tenantId },
                orderBy: { createdAt: 'desc' },
                include: {
                    vet: { select: { id: true, firstName: true, lastName: true } },
                    appointment: { select: { id: true, scheduledAt: true, type: true } },
                },
            }),
            this.prisma.vaccination.findMany({
                where: { petId: id, tenantId },
                orderBy: { administeredAt: 'desc' },
                include: {
                    vet: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.surgery.findMany({
                where: { petId: id, tenantId },
                orderBy: { scheduledAt: 'desc' },
                include: {
                    vet: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
        ]);

        return {
            pet: pet as unknown as PetWithDetails,
            medicalRecords,
            vaccinations,
            surgeries,
        };
    }
}
