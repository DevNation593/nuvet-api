import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { HomeVetBookingStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const CURRENCIES = ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'PEN', 'CLP', 'BRL'] as const;
export type HomeVetCurrency = (typeof CURRENCIES)[number];

export class CreateHomeVetBookingDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    petId!: string;

    @ApiProperty({ description: 'Fecha y hora de la visita' })
    @IsDateString()
    scheduledAt!: string;

    @ApiProperty()
    @IsString()
    @MaxLength(500)
    address!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    addressNotes?: string;

    @ApiProperty({ description: 'Motivo de la visita' })
    @IsString()
    @MaxLength(2000)
    reason!: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    visitFeeCents?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    travelFeeCents?: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    totalCents?: number;

    @ApiPropertyOptional({ enum: CURRENCIES, default: 'USD' })
    @IsOptional()
    @IsString()
    currency?: HomeVetCurrency;
}

export class UpdateHomeVetBookingDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    scheduledAt?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    addressNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reason?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    visitFeeCents?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    travelFeeCents?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    totalCents?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    currency?: HomeVetCurrency;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    visitNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    diagnosis?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    internalNotes?: string;
}

export class AssignVetDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    vetId!: string;
}

export class CancelHomeVetBookingDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export class CompleteHomeVetBookingDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    visitNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    diagnosis?: string;
}

export class ListHomeVetBookingsQueryDto {
    @ApiPropertyOptional({ enum: HomeVetBookingStatus })
    @IsOptional()
    @IsEnum(HomeVetBookingStatus)
    status?: HomeVetBookingStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    fromDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    toDate?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    ownerId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    vetId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    petId?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    pageSize?: number;
}
