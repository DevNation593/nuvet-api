import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SurgeryStatus } from '@nuvet/types';
import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

export class CreateSurgeryDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiProperty() @IsString() @IsNotEmpty() vetId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Spay (Ovariohysterectomy)' }) @IsString() @IsNotEmpty() type: string;
    @ApiProperty({ example: '2026-03-10T09:00:00Z' }) @IsDateString() scheduledAt: string;
    @ApiPropertyOptional({ example: '2026-03-05T12:00:00Z' }) @IsOptional() @IsDateString() consentSignedAt?: string;
    @ApiPropertyOptional({ description: 'User id who recorded consent' }) @IsOptional() @IsString() consentSignedBy?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() preInstructions?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() postInstructions?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() postOpNotes?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() anesthesiaType?: string;
    @ApiPropertyOptional({ example: 90 }) @IsOptional() @Type(() => Number) @IsInt() durationMinutes?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateSurgeryDto extends PartialType(CreateSurgeryDto) {
    @ApiPropertyOptional({ enum: SurgeryStatus }) @IsOptional() @IsEnum(SurgeryStatus) status?: SurgeryStatus;
}

@Injectable()
export class SurgeriesService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto, vetId?: string, status?: SurgeryStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, ...(vetId ? { vetId } : {}), ...(status ? { status } : {}) };
        const [surgeries, total] = await Promise.all([
            this.prisma.surgery.findMany({
                where, skip, take, orderBy: { scheduledAt: 'asc' },
                include: {
                    pet: { select: { id: true, name: true, species: true } },
                    vet: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.surgery.count({ where }),
        ]);
        return buildPaginatedResponse(surgeries, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const s = await this.prisma.surgery.findFirst({
            where: { id, tenantId },
            include: {
                pet: true,
                vet: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        if (!s) throw new NotFoundException('Surgery not found');
        return s;
    }

    async create(tenantId: string, dto: CreateSurgeryDto) {
        const pet = await this.prisma.pet.findFirst({ where: { id: dto.petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');
        return this.prisma.surgery.create({
            data: {
                ...dto,
                tenantId,
                scheduledAt: new Date(dto.scheduledAt),
                consentSignedAt: dto.consentSignedAt ? new Date(dto.consentSignedAt) : undefined,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateSurgeryDto) {
        await this.findOne(tenantId, id);
        return this.prisma.surgery.update({
            where: { id },
            data: {
                ...dto,
                scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
                consentSignedAt: dto.consentSignedAt ? new Date(dto.consentSignedAt) : undefined,
            },
        });
    }
}
