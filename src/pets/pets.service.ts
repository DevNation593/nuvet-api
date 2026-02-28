import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

@Injectable()
export class PetsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto, ownerId?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, isActive: true, ...(ownerId ? { ownerId } : {}) };

        const [pets, total] = await Promise.all([
            this.prisma.pet.findMany({
                where,
                skip,
                take,
                orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
                include: {
                    owner: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            }),
            this.prisma.pet.count({ where }),
        ]);

        return buildPaginatedResponse(pets, total, page, limit);
    }

    async findOne(tenantId: string, id: string, ownerId?: string) {
        const pet = await this.prisma.pet.findFirst({
            where: { id, tenantId, isActive: true, ...(ownerId ? { ownerId } : {}) },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                vaccinations: { orderBy: { administeredAt: 'desc' }, take: 5 },
                medicalRecords: { orderBy: { createdAt: 'desc' }, take: 3 },
            },
        });
        if (!pet) throw new NotFoundException('Pet not found');
        return pet;
    }

    async create(tenantId: string, dto: CreatePetDto) {
        // Verify owner belongs to the same tenant
        const owner = await this.prisma.user.findFirst({
            where: { id: dto.ownerId, tenantId },
        });
        if (!owner) throw new NotFoundException('Owner not found in this clinic');

        return this.prisma.pet.create({
            data: {
                ...dto,
                tenantId,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
            include: {
                owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdatePetDto, ownerId?: string) {
        await this.findOne(tenantId, id, ownerId);
        return this.prisma.pet.update({
            where: { id },
            data: {
                ...dto,
                birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            },
        });
    }

    async remove(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        await this.prisma.pet.update({ where: { id }, data: { isActive: false } });
        return { message: 'Pet deactivated successfully' };
    }
}
