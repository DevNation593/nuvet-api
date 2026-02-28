import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsDateString,
    IsInt,
    Min,
    Max,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AppointmentType, AppointmentStatus } from '@nuvet/types';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateAppointmentDto {
    @ApiProperty({ description: 'Pet ID' })
    @IsString()
    @IsNotEmpty()
    petId: string;

    @ApiProperty({ enum: AppointmentType, example: AppointmentType.CONSULTATION })
    @IsEnum(AppointmentType)
    type: AppointmentType;

    @ApiProperty({ example: '2026-03-01T10:00:00.000Z' })
    @IsDateString()
    scheduledAt: string;

    @ApiPropertyOptional({ example: 30, default: 30, minimum: 15, maximum: 240 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(15)
    @Max(240)
    durationMinutes?: number = 30;

    @ApiPropertyOptional({ description: 'Assigned vet user ID' })
    @IsOptional()
    @IsString()
    vetId?: string;

    @ApiPropertyOptional({ description: 'Assigned groomer user ID' })
    @IsOptional()
    @IsString()
    groomerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
    @ApiPropertyOptional({ enum: AppointmentStatus })
    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cancelReason?: string;
}

export class AppointmentFilterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    petId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vetId?: string;

    @ApiPropertyOptional({ enum: AppointmentType })
    @IsOptional()
    @IsEnum(AppointmentType)
    type?: AppointmentType;

    @ApiPropertyOptional({ enum: AppointmentStatus })
    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;

    @ApiPropertyOptional({ example: '2026-03-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ example: '2026-03-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

export class AppointmentListQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    petId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    vetId?: string;

    @ApiPropertyOptional({ enum: AppointmentType })
    @IsOptional()
    @IsEnum(AppointmentType)
    type?: AppointmentType;

    @ApiPropertyOptional({ enum: AppointmentStatus })
    @IsOptional()
    @IsEnum(AppointmentStatus)
    status?: AppointmentStatus;

    @ApiPropertyOptional({ example: '2026-03-01' })
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional({ example: '2026-03-31' })
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

export class CancelAppointmentDto {
    @ApiPropertyOptional({ description: 'Reason for cancellation' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    reason?: string;
}
