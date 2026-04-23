import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IAdoptionAnimalRepository,
    AdoptionAnimalData,
    CreateAdoptionAnimalData,
    UpdateAdoptionAnimalData,
} from '../../domain/adoption-animal.repository';

@Injectable()
export class PrismaAdoptionAnimalRepository implements IAdoptionAnimalRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, opts: { skip: number; take: number }): Promise<{ data: AdoptionAnimalData[]; total: number }> {
        const [data, total] = await Promise.all([
            this.prisma.adoptionAnimal.findMany({
                where: { tenantId },
                skip: opts.skip,
                take: opts.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.adoptionAnimal.count({ where: { tenantId } }),
        ]);
        return { data: data as unknown as AdoptionAnimalData[], total };
    }

    async findOne(tenantId: string, id: string): Promise<AdoptionAnimalData | null> {
        return this.prisma.adoptionAnimal.findFirst({ where: { id, tenantId } }) as unknown as Promise<AdoptionAnimalData | null>;
    }

    async create(data: CreateAdoptionAnimalData): Promise<AdoptionAnimalData> {
        return this.prisma.adoptionAnimal.create({ data }) as unknown as Promise<AdoptionAnimalData>;
    }

    async update(tenantId: string, id: string, data: UpdateAdoptionAnimalData): Promise<AdoptionAnimalData> {
        return this.prisma.adoptionAnimal.update({ where: { id }, data }) as unknown as Promise<AdoptionAnimalData>;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await this.prisma.adoptionAnimal.deleteMany({ where: { id, tenantId } });
    }
}
