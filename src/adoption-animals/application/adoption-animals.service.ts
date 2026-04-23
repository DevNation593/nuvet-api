import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { CreateAdoptionAnimalDto, UpdateAdoptionAnimalDto } from './dto/adoption-animal.dto';
import { IAdoptionAnimalRepository, ADOPTION_ANIMAL_REPOSITORY } from '../domain/adoption-animal.repository';

export { CreateAdoptionAnimalDto, UpdateAdoptionAnimalDto };

@Injectable()
export class AdoptionAnimalsService {
    constructor(
        @Inject(ADOPTION_ANIMAL_REPOSITORY) private readonly repo: IAdoptionAnimalRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.repo.findAll(tenantId, { skip, take });
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const animal = await this.repo.findOne(tenantId, id);
        if (!animal) throw new NotFoundException('Adoption animal not found');
        return animal;
    }

    async create(tenantId: string, dto: CreateAdoptionAnimalDto) {
        return this.repo.create({
            tenantId,
            name: dto.name,
            species: dto.species,
            sex: dto.sex,
            breed: dto.breed,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            color: dto.color,
            weight: dto.weight,
            photoUrl: dto.photoUrl,
            description: dto.description,
            isNeutered: dto.isNeutered,
            notes: dto.notes,
        });
    }

    async update(tenantId: string, id: string, dto: UpdateAdoptionAnimalDto) {
        await this.findOne(tenantId, id);
        return this.repo.update(tenantId, id, {
            name: dto.name,
            species: dto.species,
            sex: dto.sex,
            breed: dto.breed,
            birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
            color: dto.color,
            weight: dto.weight,
            photoUrl: dto.photoUrl,
            description: dto.description,
            isNeutered: dto.isNeutered,
            notes: dto.notes,
            isActive: dto.isActive,
        });
    }

    async delete(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        await this.repo.delete(tenantId, id);
    }
}
