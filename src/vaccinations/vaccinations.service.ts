import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVaccinationDto, UpdateVaccinationDto } from './dto/vaccination.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';
import { VaccinationStatus } from '@nuvet/types';

@Injectable()
export class VaccinationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, petId: string, query: PaginationQueryDto) {
        const pet = await this.prisma.pet.findFirst({ where: { id: petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');

        const { skip, take, page, limit } = buildPaginationArgs(query);
        const [vaccines, total] = await Promise.all([
            this.prisma.vaccination.findMany({
                where: { tenantId, petId },
                skip, take,
                orderBy: { administeredAt: 'desc' },
                include: { vet: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.vaccination.count({ where: { tenantId, petId } }),
        ]);
        return buildPaginatedResponse(vaccines, total, page, limit);
    }

    async findUpcoming(tenantId: string, daysAhead = 30) {
        const until = new Date();
        until.setDate(until.getDate() + daysAhead);
        return this.prisma.vaccination.findMany({
            where: {
                tenantId,
                nextDueAt: { lte: until, gte: new Date() },
                status: VaccinationStatus.ADMINISTERED,
            },
            include: {
                pet: { select: { id: true, name: true, owner: { select: { firstName: true, lastName: true, email: true } } } },
            },
            orderBy: { nextDueAt: 'asc' },
        });
    }

    async findOne(tenantId: string, id: string) {
        const v = await this.prisma.vaccination.findFirst({
            where: { id, tenantId },
            include: { pet: true, vet: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!v) throw new NotFoundException('Vaccination record not found');
        return v;
    }

    async create(tenantId: string, vetId: string, dto: CreateVaccinationDto) {
        const pet = await this.prisma.pet.findFirst({ where: { id: dto.petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');
        return this.prisma.vaccination.create({
            data: {
                ...dto,
                tenantId,
                vetId,
                status: VaccinationStatus.ADMINISTERED,
                administeredAt: new Date(dto.administeredAt),
                nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateVaccinationDto) {
        await this.findOne(tenantId, id);
        return this.prisma.vaccination.update({
            where: { id },
            data: {
                ...dto,
                administeredAt: dto.administeredAt ? new Date(dto.administeredAt) : undefined,
                nextDueAt: dto.nextDueAt ? new Date(dto.nextDueAt) : undefined,
            },
        });
    }
}
