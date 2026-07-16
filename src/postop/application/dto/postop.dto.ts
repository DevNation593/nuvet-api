import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PostOpCheckinStatus, PostOpPlanStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostOpPlanDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    petId!: string;

    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    ownerId!: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    surgeryId?: string;

    @ApiProperty({ format: 'uuid', description: 'Vet responsable de revisar los checkins' })
    @IsUUID()
    vetId!: string;

    @ApiProperty({ maxLength: 200 })
    @IsString()
    @MaxLength(200)
    title!: string;

    @ApiProperty({ maxLength: 4000, description: 'Instrucciones escritas para el dueño' })
    @IsString()
    @MaxLength(4000)
    instructions!: string;

    @ApiProperty({ description: 'Inicio del período de recuperación' })
    @IsDateString()
    startDate!: string;

    @ApiProperty({ description: 'Fin esperado del período de recuperación' })
    @IsDateString()
    endDate!: string;

    @ApiPropertyOptional({ default: 2 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    checkinIntervalDays?: number;
}

export class UpdatePostOpPlanDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(4000)
    instructions?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(30)
    checkinIntervalDays?: number;
}

export class CancelPostOpPlanDto {
    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}

export class CreatePostOpCheckinDto {
    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    ownerNote?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    photoUrls?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    weightKg?: number;

    @ApiPropertyOptional({ maxLength: 50, description: 'normal | bajo | sin_apetito' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    appetite?: string;

    @ApiPropertyOptional({ maxLength: 50, description: 'normal | bajo | letargico' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    energyLevel?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    concernsFlag?: boolean;
}

export class ReviewPostOpCheckinDto {
    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    vetNote?: string;

    @ApiPropertyOptional({
        default: false,
        description: 'true = marcar preocupación clínica (status FLAGGED)',
    })
    @IsOptional()
    @IsBoolean()
    flagged?: boolean;
}

export class ListPostOpPlansQueryDto {
    @ApiPropertyOptional({ enum: PostOpPlanStatus })
    @IsOptional()
    @IsEnum(PostOpPlanStatus)
    status?: PostOpPlanStatus;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    petId?: string;

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
    surgeryId?: string;

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

export class ListPostOpCheckinsQueryDto {
    @ApiPropertyOptional({ enum: PostOpCheckinStatus })
    @IsOptional()
    @IsEnum(PostOpCheckinStatus)
    status?: PostOpCheckinStatus;

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
