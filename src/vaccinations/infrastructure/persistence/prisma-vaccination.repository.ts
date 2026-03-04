import { Injectable } from '@nestjs/common';
import { VaccinationStatus } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { IVaccinationRepository, CreateVaccinationData } from '../../domain/vaccination.repository';

@Injectable()
export class PrismaVaccinationRepository implements IVaccinationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        petId: string,
        query: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId, petId };
        const [data, total] = await Promise.all([
            this.prisma.vaccination.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { administeredAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.vaccination.count({ where }),
        ]);
        return { data, total };
    }

    async findUpcoming(tenantId: string, until: Date): Promise<unknown[]> {
        return this.prisma.vaccination.findMany({
            where: {
                tenantId,
                nextDueAt: { lte: until, gte: new Date() },
                status: VaccinationStatus.ADMINISTERED,
            },
            include: {
                pet: {
                    select: {
                        id: true,
                        name: true,
                        owner: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
            orderBy: { nextDueAt: 'asc' },
        });
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.vaccination.findFirst({
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

    async create(data: CreateVaccinationData): Promise<unknown> {
        return this.prisma.vaccination.create({ data });
    }

    async update(
        id: string,
        data: Partial<Omit<CreateVaccinationData, 'tenantId' | 'petId' | 'vetId'>>,
    ): Promise<unknown> {
        return this.prisma.vaccination.update({ where: { id }, data });
    }
}
