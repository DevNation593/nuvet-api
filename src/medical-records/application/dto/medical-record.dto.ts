import {
    IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive, IsInt, Min, IsEnum, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class MedicalRecordsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Filter by pet ID' })
    @IsOptional()
    @IsString()
    petId?: string;

    @ApiPropertyOptional({ description: 'Filter only active records', default: true })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    onlyActive?: boolean;
}

export class CreateMedicalRecordDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId!: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Limping on right front leg' }) @IsString() @IsNotEmpty() chiefComplaint!: string;
    @ApiProperty({ example: 'Mild sprain, no fracture detected' }) @IsString() @IsNotEmpty() diagnosis!: string;
    @ApiProperty({ example: 'Rest for 5 days, apply cold compress' }) @IsString() @IsNotEmpty() treatment!: string;
    @ApiPropertyOptional() @IsOptional() @IsString() prescriptions?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
    @ApiPropertyOptional({ description: 'Weight in kg' }) @IsOptional() @Type(() => Number) @IsNumber() @IsPositive() weight?: number;
    @ApiPropertyOptional({ description: 'Temperature in °C' }) @IsOptional() @Type(() => Number) @IsNumber() temperature?: number;
    @ApiPropertyOptional({ description: 'Heart rate bpm' }) @IsOptional() @Type(() => Number) @IsInt() heartRate?: number;
}

export class UpdateMedicalRecordDto extends PartialType(CreateMedicalRecordDto) { }

export class RegisterAttachmentDto {
    @ApiProperty({ description: 'S3 key returned from POST /files/presign' })
    @IsString()
    @IsNotEmpty()
    key!: string;
    @ApiProperty({ example: 'report.pdf' })
    @IsString()
    @IsNotEmpty()
    filename!: string;
    @ApiProperty({ example: 'application/pdf' })
    @IsString()
    @IsNotEmpty()
    contentType!: string;
    @ApiProperty({ example: 1024, description: 'File size in bytes' })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    size!: number;
}

export enum ClinicalDocumentType {
    CONSENT = 'CONSENT',
    PRESCRIPTION = 'PRESCRIPTION',
    REPORT = 'REPORT',
}

export class RegisterClinicalDocumentDto extends RegisterAttachmentDto {
    @ApiProperty({ enum: ClinicalDocumentType })
    @IsEnum(ClinicalDocumentType)
    type!: ClinicalDocumentType;
    @ApiProperty({ example: 1, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    version!: number;
    @ApiPropertyOptional({ example: 'sha256:9f5b3e4...' })
    @IsOptional()
    @IsString()
    signatureHash?: string;

    @ApiPropertyOptional({ example: '2026-04-09T18:30:00Z' })
    @IsOptional()
    @IsString()
    signedAt?: string;
}

