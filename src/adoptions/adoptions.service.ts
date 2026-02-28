import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdoptionStatus } from '@nuvet/types';
import { IsNotEmpty, IsString, IsOptional, IsEmail, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

export class CreateAdoptionDto {
    @ApiProperty({ description: 'Pet to put up for adoption' }) @IsString() @IsNotEmpty() petId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class ApplyAdoptionDto {
    @ApiProperty() @IsString() @IsNotEmpty() applicantName: string;
    @ApiProperty() @IsEmail() applicantEmail: string;
    @ApiPropertyOptional() @IsOptional() @IsString() applicantPhone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAdoptionStatusDto {
    @ApiProperty({ enum: [AdoptionStatus.APPROVED, AdoptionStatus.REJECTED] })
    @IsIn([AdoptionStatus.APPROVED, AdoptionStatus.REJECTED])
    status: AdoptionStatus;

    @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}

@Injectable()
export class AdoptionsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, query: PaginationQueryDto, status?: AdoptionStatus) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, ...(status ? { status } : {}) };
        const [adoptions, total] = await Promise.all([
            this.prisma.adoption.findMany({
                where, skip, take, orderBy: { createdAt: 'desc' },
                include: { pet: { select: { id: true, name: true, species: true, breed: true, photoUrl: true } } },
            }),
            this.prisma.adoption.count({ where }),
        ]);
        return buildPaginatedResponse(adoptions, total, page, limit);
    }

    async findOne(tenantId: string, id: string) {
        const a = await this.prisma.adoption.findFirst({
            where: { id, tenantId },
            include: { pet: true },
        });
        if (!a) throw new NotFoundException('Adoption record not found');
        return a;
    }

    async createListing(tenantId: string, dto: CreateAdoptionDto) {
        const pet = await this.prisma.pet.findFirst({ where: { id: dto.petId, tenantId } });
        if (!pet) throw new NotFoundException('Pet not found');
        return this.prisma.adoption.create({
            data: { tenantId, petId: dto.petId, status: AdoptionStatus.AVAILABLE, notes: dto.notes },
            include: { pet: true },
        });
    }

    async submitApplication(tenantId: string, id: string, dto: ApplyAdoptionDto, applicantId?: string) {
        await this.findOne(tenantId, id);
        return this.prisma.adoption.update({
            where: { id },
            data: {
                status: AdoptionStatus.PENDING,
                applicantId,
                applicantName: dto.applicantName,
                applicantEmail: dto.applicantEmail,
                applicantPhone: dto.applicantPhone,
                notes: dto.notes,
            },
        });
    }

    async updateStatus(tenantId: string, id: string, dto: UpdateAdoptionStatusDto) {
        await this.findOne(tenantId, id);
        return this.prisma.adoption.update({
            where: { id },
            data: {
                status: dto.status,
                rejectionReason: dto.rejectionReason,
            },
        });
    }
}
