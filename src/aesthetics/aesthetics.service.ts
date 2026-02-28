import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AestheticStatus } from '@nuvet/types';
import {
    IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

export class CreateAestheticDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiProperty() @IsString() @IsNotEmpty() groomerId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Full grooming + nail trim' }) @IsString() @IsNotEmpty() serviceName: string;
    @ApiProperty({ example: '2026-03-01T14:00:00Z' }) @IsDateString() scheduledAt: string;
    @ApiPropertyOptional({ example: 45.00 }) @IsOptional() @Type(() => Number) @IsNumber() price?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAestheticDto extends PartialType(CreateAestheticDto) {
    @ApiPropertyOptional({ enum: AestheticStatus }) @IsOptional() @IsEnum(AestheticStatus) status?: AestheticStatus;
}

@Injectable()
export class AestheticsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto, groomerId?: string, status?: AestheticStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, ...(groomerId ? { groomerId } : {}), ...(status ? { status } : {}) };
        const [services, total] = await Promise.all([
            this.prisma.aestheticService.findMany({
                where, skip, take, orderBy: { scheduledAt: 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    groomer: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.aestheticService.count({ where }),
        ]);
        return buildPaginatedResponse(services, total, page, limit);
    }

    async create(tenantId: string, dto: CreateAestheticDto) {
        return this.prisma.aestheticService.create({
            data: {
                tenantId,
                petId: dto.petId, groomerId: dto.groomerId,
                appointmentId: dto.appointmentId,
                serviceName: dto.serviceName,
                scheduledAt: new Date(dto.scheduledAt),
                price: dto.price, notes: dto.notes,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateAestheticDto) {
        const s = await this.prisma.aestheticService.findFirst({ where: { id, tenantId } });
        if (!s) throw new NotFoundException('Aesthetic service not found');
        return this.prisma.aestheticService.update({
            where: { id },
            data: { ...dto, scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined },
        });
    }
}
