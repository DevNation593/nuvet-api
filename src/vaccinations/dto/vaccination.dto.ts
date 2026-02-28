import { IsNotEmpty, IsString, IsOptional, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { VaccinationStatus } from '@nuvet/types';

export class CreateVaccinationDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Rabies' }) @IsString() @IsNotEmpty() vaccineName: string;
    @ApiPropertyOptional({ example: 'Pfizer Animal Health' }) @IsOptional() @IsString() manufacturer?: string;
    @ApiPropertyOptional({ example: 'BATCH-001' }) @IsOptional() @IsString() batchNumber?: string;
    @ApiProperty({ example: 1, default: 1 }) @Type(() => Number) @IsInt() @Min(1) dose: number;
    @ApiProperty({ example: '2026-03-01T10:00:00Z' }) @IsDateString() administeredAt: string;
    @ApiPropertyOptional({ example: '2027-03-01T10:00:00Z' }) @IsOptional() @IsDateString() nextDueAt?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateVaccinationDto extends PartialType(CreateVaccinationDto) {
    @ApiPropertyOptional({ enum: VaccinationStatus }) @IsOptional() @IsEnum(VaccinationStatus) status?: VaccinationStatus;
}
