import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPetRepository, CreatePetData, PetWithDetails } from '../../domain/pet.repository';
import { PetEntity } from '../../domain/pet.entity';

@Injectable()
export class PrismaPetRepository implements IPetRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
        ownerId?: string,
    ): Promise<{ data: PetWithDetails[]; total: number }> {
        const where = { tenantId, isActive: true, ...(ownerId ? { ownerId } : {}) };
        const [data, total] = await Promise.all([
            this.prisma.pet.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
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
            where: { id, tenantId, isActive: true, ...(ownerId ? { ownerId } : {}) },
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
}
