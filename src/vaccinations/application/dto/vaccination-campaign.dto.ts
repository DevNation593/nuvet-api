import {
    IsDateString,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VaccinationCampaignStatus } from '@prisma/client';

export class CreateVaccinationCampaignDto {
    @IsString()
    @MinLength(3)
    @MaxLength(120)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsString()
    @MinLength(2)
    @MaxLength(120)
    vaccineName!: string;

    @IsDateString()
    startsAt!: string;

    @IsDateString()
    endsAt!: string;

    @IsOptional()
    @IsString()
    @MaxLength(240)
    location?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    capacity?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    priceCents?: number;

    @IsOptional()
    @IsString()
    @MinLength(3)
    @MaxLength(3)
    currency?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}

export class UpdateVaccinationCampaignDto {
    @IsOptional() @IsString() @MinLength(3) @MaxLength(120) name?: string;
    @IsOptional() @IsString() @MaxLength(2000) description?: string;
    @IsOptional() @IsString() @MinLength(2) @MaxLength(120) vaccineName?: string;
    @IsOptional() @IsDateString() startsAt?: string;
    @IsOptional() @IsDateString() endsAt?: string;
    @IsOptional() @IsString() @MaxLength(240) location?: string;
    @IsOptional() @Type(() => Number) @IsInt() @Min(0) capacity?: number;
    @IsOptional() @Type(() => Number) @IsInt() @Min(0) priceCents?: number;
    @IsOptional() @IsString() @MinLength(3) @MaxLength(3) currency?: string;
    @IsOptional() @IsString() @MaxLength(2000) notes?: string;
    @IsOptional() @IsEnum(VaccinationCampaignStatus) status?: VaccinationCampaignStatus;
}

export class RegisterPetDto {
    @IsString()
    petId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}

export class MarkAttendedDto {
    @IsOptional()
    @IsDateString()
    attendedAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    notes?: string;
}
