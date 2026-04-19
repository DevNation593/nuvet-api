import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ITenantRepository, TENANT_REPOSITORY } from '../domain/tenant.repository';

export class UpdateTenantDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() website?: string;
}

export class UpdateBillingConfigDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) billingApiKey?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) billingApiSecret?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) billingEstablishmentCode?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10) billingEmissionPointCode?: string;
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

    async getBillingConfig(tenantId: string) {
        const config = await this.tenantRepo.findBillingConfig(tenantId);
        if (!config) {
            return {
                billingApiKey: null,
                billingEstablishmentCode: '001',
                billingEmissionPointCode: '001',
                hasBillingApiSecret: false,
            };
        }
        const { billingApiSecret, ...rest } = config;
        return {
            ...rest,
            hasBillingApiSecret: Boolean(billingApiSecret),
        };
    }

    async updateBillingConfig(tenantId: string, dto: UpdateBillingConfigDto) {
        await this.findOne(tenantId);
        return this.tenantRepo.upsertBillingConfig(tenantId, dto);
    }
}
