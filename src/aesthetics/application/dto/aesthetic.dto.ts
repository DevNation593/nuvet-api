import { IsNotEmpty, IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AestheticStatus } from '@nuvet/types';

export class CreateAestheticDto {
    @ApiProperty() @IsString() @IsNotEmpty() petId: string;
    @ApiProperty() @IsString() @IsNotEmpty() groomerId: string;
    @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
    @ApiProperty({ example: 'Full grooming + nail trim' }) @IsString() @IsNotEmpty() serviceName: string;
    @ApiProperty({ example: '2026-03-01T14:00:00Z' }) @IsDateString() scheduledAt: string;
    @ApiPropertyOptional({ example: 45.0 }) @IsOptional() @Type(() => Number) @IsNumber() price?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAestheticDto extends PartialType(CreateAestheticDto) {
    @ApiPropertyOptional({ enum: AestheticStatus }) @IsOptional() @IsEnum(AestheticStatus) status?: AestheticStatus;
}
