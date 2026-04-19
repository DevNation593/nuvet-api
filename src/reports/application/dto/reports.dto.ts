import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppointmentType } from '@nuvet/types';

export class AppointmentsReportQueryDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @IsDateString()
    from!: string;
    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to!: string;
    @ApiPropertyOptional({ description: 'Filter by vet user ID' })
    @IsOptional()
    @IsString()
    vetId?: string;

    @ApiPropertyOptional({ enum: AppointmentType })
    @IsOptional()
    @IsEnum(AppointmentType)
    type?: AppointmentType;
}

export class RevenueReportQueryDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @IsDateString()
    from!: string;
    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to!: string;
}

export class VaccinationsReportQueryDto {
    @ApiPropertyOptional({ example: 30, minimum: 1, maximum: 365, default: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(365)
    days?: number = 30;
}

export class ExpiringStockReportQueryDto {
    @ApiPropertyOptional({ example: 30, minimum: 1, maximum: 365, default: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(365)
    days?: number = 30;
}

export class TransactionsEvidenceQueryDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @IsDateString()
    from!: string;
    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to!: string;
    @ApiPropertyOptional({ description: 'Filter by POS status' })
    @IsOptional()
    @IsString()
    status?: string;
}

export class PosDiscountUsageReportQueryDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @IsDateString()
    from!: string;

    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to!: string;

    @ApiPropertyOptional({ description: 'Filter by branch ID' })
    @IsOptional()
    @IsString()
    branchId?: string;

    @ApiPropertyOptional({ description: 'Filter by discount ID' })
    @IsOptional()
    @IsString()
    discountId?: string;
}

export class InventoryKardexQueryDto {
    @ApiPropertyOptional({ description: 'Filter by product ID' })
    @IsOptional()
    @IsString()
    productId?: string;

    @ApiPropertyOptional({ example: '2026-01-01' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ example: '2026-12-31' })
    @IsOptional()
    @IsDateString()
    to?: string;
}

export class RestockSuggestionsQueryDto {
    @ApiPropertyOptional({ example: 14, minimum: 1, maximum: 180, default: 30 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(180)
    lookbackDays?: number = 30;
}

export class ClientSegmentationQueryDto {
    @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 30, default: 3 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(30)
    minFrequentPurchases?: number = 3;

    @ApiPropertyOptional({ example: 60, minimum: 15, maximum: 365, default: 60 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(15)
    @Max(365)
    inactiveDays?: number = 60;
}

