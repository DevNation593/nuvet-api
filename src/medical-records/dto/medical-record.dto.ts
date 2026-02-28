import {
    IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMedicalRecordDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Limping on right front leg' }) @IsString() @IsNotEmpty() chiefComplaint: string;
    @ApiProperty({ example: 'Mild sprain, no fracture detected' }) @IsString() @IsNotEmpty() diagnosis: string;
    @ApiProperty({ example: 'Rest for 5 days, apply cold compress' }) @IsString() @IsNotEmpty() treatment: string;
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
    key: string;

    @ApiProperty({ example: 'report.pdf' })
    @IsString()
    @IsNotEmpty()
    filename: string;

    @ApiProperty({ example: 'application/pdf' })
    @IsString()
    @IsNotEmpty()
    contentType: string;

    @ApiProperty({ example: 1024, description: 'File size in bytes' })
    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    size: number;
}
