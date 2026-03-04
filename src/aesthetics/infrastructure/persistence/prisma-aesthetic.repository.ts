import { Injectable } from '@nestjs/common';
import { AestheticStatus } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAestheticRepository, CreateAestheticData } from '../../domain/aesthetic.repository';

@Injectable()
export class PrismaAestheticRepository implements IAestheticRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number },
        groomerId?: string,
        status?: AestheticStatus,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = {
            tenantId,
            ...(groomerId ? { groomerId } : {}),
            ...(status ? { status } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.aestheticService.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { scheduledAt: 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    groomer: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.aestheticService.count({ where }),
        ]);
        return { data, total };
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.aestheticService.findFirst({ where: { id, tenantId } });
    }

    async create(data: CreateAestheticData): Promise<unknown> {
        return this.prisma.aestheticService.create({ data });
    }

    async update(
        tenantId: string,
        id: string,
        data: Partial<Omit<CreateAestheticData, 'tenantId'>>,
    ): Promise<unknown> {
        return this.prisma.aestheticService.update({ where: { id }, data });
    }
}
