import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ITenantRepository, TENANT_REPOSITORY } from '../domain/tenant.repository';

export class UpdateTenantDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
}

@Injectable()
export class TenantsService {
    constructor(
        @Inject(TENANT_REPOSITORY) private readonly tenantRepo: ITenantRepository,
    ) { }

    async findOne(id: string) {
        const tenant = await this.tenantRepo.findOne(id);
        if (!tenant) throw new NotFoundException('Tenant not found');
        return tenant;
    }

    async update(id: string, dto: UpdateTenantDto) {
        await this.findOne(id);
        return this.tenantRepo.update(id, dto);
    }
}