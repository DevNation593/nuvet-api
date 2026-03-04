import { IsNotEmpty, IsString, IsOptional, IsInt, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SurgeryStatus } from '@nuvet/types';

export class CreateSurgeryDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiProperty() @IsString() @IsNotEmpty() vetId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Spay (Ovariohysterectomy)' }) @IsString() @IsNotEmpty() type: string;
    @ApiProperty({ example: '2026-03-10T09:00:00Z' }) @IsDateString() scheduledAt: string;
    @ApiPropertyOptional({ example: '2026-03-05T12:00:00Z' }) @IsOptional() @IsDateString() consentSignedAt?: string;
    @ApiPropertyOptional({ description: 'User id who recorded consent' }) @IsOptional() @IsString() consentSignedBy?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() preInstructions?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() postInstructions?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() postOpNotes?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() anesthesiaType?: string;
    @ApiPropertyOptional({ example: 90 }) @IsOptional() @Type(() => Number) @IsInt() durationMinutes?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateSurgeryDto extends PartialType(CreateSurgeryDto) {
    @ApiPropertyOptional({ enum: SurgeryStatus }) @IsOptional() @IsEnum(SurgeryStatus) status?: SurgeryStatus;
}
