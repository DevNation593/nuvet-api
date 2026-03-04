import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IPetRepository, PET_REPOSITORY } from '../domain/pet.repository';
import { CreatePetDto, UpdatePetDto } from './dto/pet.dto';
import { buildPaginatedResponse, buildPaginationArgs, PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PetsService {
    constructor(
        @Inject(PET_REPOSITORY) private readonly petRepo: IPetRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto, ownerId?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.petRepo.findAll(
            tenantId,
            { skip, take, sortBy: query.sortBy, sortOrder: query.sortOrder },
            ownerId,
        );
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string, ownerId?: string) {
        const pet = await this.petRepo.findOne(tenantId, id, ownerId);
        if (!pet) throw new NotFoundException('Pet not found');
        return pet;
    }

    async create(tenantId: string, dto: CreatePetDto) {
        const owner = await this.petRepo.findOwner(tenantId, dto.ownerId);
        if (!owner) throw new NotFoundException('Owner not found in this clinic');

        return this.petRepo.create({
            tenantId,
            ...dto,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        });
    }

    async update(tenantId: string, id: string, dto: UpdatePetDto, ownerId?: string) {
        await this.findOne(tenantId, id, ownerId);
        return this.petRepo.update(id, {
            ...dto,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        });
    }

    async remove(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        await this.petRepo.softDelete(id);
        return { message: 'Pet deactivated successfully' };
    }
}
