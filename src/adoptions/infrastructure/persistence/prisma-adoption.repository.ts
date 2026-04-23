import { Injectable } from '@nestjs/common';
import { AdoptionStatus } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { IAdoptionRepository, CreateAdoptionData, UpdateAdoptionApplicationData } from '../../domain/adoption.repository';

@Injectable()
export class PrismaAdoptionRepository implements IAdoptionRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number },
        status?: AdoptionStatus,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = { tenantId, ...(status ? { status } : {}) };
        const [data, total] = await Promise.all([
            this.prisma.adoption.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createdAt: 'desc' },
                include: {
                    pet: { select: { id: true, name: true, species: true, breed: true, photoUrl: true } },
                    adoptionAnimal: { select: { id: true, name: true, species: true, breed: true, photoUrl: true } },
                },
            }),
            this.prisma.adoption.count({ where }),
        ]);
        return { data, total };
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.adoption.findFirst({
            where: { id, tenantId },
            include: { pet: true, adoptionAnimal: true },
        });
    }

    async petExists(tenantId: string, petId: string): Promise<boolean> {
        const pet = await this.prisma.pet.findFirst({
            where: { id: petId, tenantId },
            select: { id: true },
        });
        return Boolean(pet);
    }

    async adoptionAnimalExists(tenantId: string, adoptionAnimalId: string): Promise<boolean> {
        const animal = await this.prisma.adoptionAnimal.findFirst({
            where: { id: adoptionAnimalId, tenantId },
            select: { id: true },
        });
        return Boolean(animal);
    }

    async create(data: CreateAdoptionData): Promise<unknown> {
        return this.prisma.adoption.create({
            data,
            include: { pet: true, adoptionAnimal: true },
        });
    }

    async update(tenantId: string, id: string, data: Partial<UpdateAdoptionApplicationData>): Promise<unknown> {
        const existing = await this.prisma.adoption.findFirst({ where: { id, tenantId }, select: { id: true } });
        if (!existing) return null;
        return this.prisma.adoption.update({ where: { id }, data });
    }
}
