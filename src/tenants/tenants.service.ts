import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
}

@Injectable()
export class TenantsService {
    constructor(private prisma: PrismaService) { }

    async findOne(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: { _count: { select: { users: true, pets: true } } },
        });
        if (!tenant) throw new NotFoundException('Tenant not found');
        return tenant;
    }

    async update(id: string, dto: UpdateTenantDto) {
        await this.findOne(id);
        return this.prisma.tenant.update({ where: { id }, data: dto });
    }
}
