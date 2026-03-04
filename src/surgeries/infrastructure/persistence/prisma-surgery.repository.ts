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
        const count = await this.prisma.pet.count({ where: { id: petId, tenantId } });
        return count > 0;
    }

    async create(data: CreateSurgeryData): Promise<unknown> {
        return this.prisma.surgery.create({ data: data as any });
    }

    async update(
        id: string,
        data: Partial<Omit<CreateSurgeryData, 'tenantId' | 'petId' | 'vetId' | 'type'>>,
    ): Promise<unknown> {
        return this.prisma.surgery.update({ where: { id }, data: data as any });
    }
}
