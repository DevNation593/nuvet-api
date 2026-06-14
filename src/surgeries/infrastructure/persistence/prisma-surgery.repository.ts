import { Injectable } from '@nestjs/common';
import { SurgeryStatus } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISurgeryRepository, CreateSurgeryData } from '../../domain/surgery.repository';

@Injectable()
export class PrismaSurgeryRepository implements ISurgeryRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number },
        vetId?: string,
        status?: SurgeryStatus,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = {
            tenantId,
            ...(vetId ? { vetId } : {}),
            ...(status ? { status } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.surgery.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { scheduledAt: 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    vet: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.surgery.count({ where }),
        ]);
        return { data, total };
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.surgery.findFirst({
            where: { id, tenantId },
            include: {
                pet: true,
                vet: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }

    async petExists(tenantId: string, petId: string): Promise<boolean> {
        const pet = await this.prisma.pet.findFirst({
            where: { id: petId, tenantId },
            select: { id: true },
        });
        return Boolean(pet);
    }

    async create(data: CreateSurgeryData): Promise<unknown> {
        return this.prisma.surgery.create({ data: data as any });
    }

    async update(
        tenantId: string,
        id: string,
        data: Partial<Omit<CreateSurgeryData, 'tenantId'>>,
    ): Promise<unknown> {
        const existing = await this.prisma.surgery.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!existing) return null;
        return this.prisma.surgery.update({ where: { id }, data: data as any });
    }

    async delete(tenantId: string, id: string): Promise<void> {
        const existing = await this.prisma.surgery.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!existing) return;
        await this.prisma.surgery.delete({ where: { id } });
    }
}
