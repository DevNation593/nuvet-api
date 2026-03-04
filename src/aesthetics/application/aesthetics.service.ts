import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { AestheticStatus } from '@nuvet/types';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { CreateAestheticDto, UpdateAestheticDto } from './dto/aesthetic.dto';
import { IAestheticRepository, AESTHETIC_REPOSITORY } from '../domain/aesthetic.repository';

export { CreateAestheticDto, UpdateAestheticDto };

@Injectable()
export class AestheticsService {
    constructor(
        @Inject(AESTHETIC_REPOSITORY) private readonly aestheticRepo: IAestheticRepository,
    ) {}

    async findAll(tenantId: string, query: PaginationQueryDto, groomerId?: string, status?: AestheticStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.aestheticRepo.findAll(tenantId, { skip, take }, groomerId, status);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async create(tenantId: string, dto: CreateAestheticDto) {
        return this.aestheticRepo.create({
            tenantId,
            petId: dto.petId,
            groomerId: dto.groomerId,
            appointmentId: dto.appointmentId,
            serviceName: dto.serviceName,
            scheduledAt: new Date(dto.scheduledAt),
            price: dto.price,
            notes: dto.notes,
        });
    }

    async update(tenantId: string, id: string, dto: UpdateAestheticDto) {
        const existing = await this.aestheticRepo.findOne(tenantId, id);
        if (!existing) throw new NotFoundException('Aesthetic service not found');
        return this.aestheticRepo.update(tenantId, id, {
            ...dto,
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        });
    }
}
