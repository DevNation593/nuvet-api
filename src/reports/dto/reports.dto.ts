import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppointmentType } from '@nuvet/types';

export class AppointmentsReportQueryDto {
    @ApiProperty({ example: '2026-01-01' })
    @IsNotEmpty()
    @IsDateString()
    from: string;

    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to: string;

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
    from: string;

    @ApiProperty({ example: '2026-12-31' })
    @IsNotEmpty()
    @IsDateString()
    to: string;
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
