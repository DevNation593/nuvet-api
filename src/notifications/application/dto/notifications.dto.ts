import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { NotificationChannel } from '@nuvet/types';
import {
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateNotificationTemplateDto {
    @ApiProperty({ example: 'appointment_reminder' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.IN_APP })
    @IsEnum(NotificationChannel)
    channel: NotificationChannel;

    @ApiPropertyOptional({ example: 'Recordatorio de cita' })
    @IsOptional()
    @IsString()
    subject?: string;

    @ApiProperty({ example: 'Hola {{clientName}}, tu cita es el {{date}}.' })
    @IsString()
    @IsNotEmpty()
    bodyTemplate: string;
}

export class UpdateNotificationTemplateDto extends PartialType(CreateNotificationTemplateDto) { }

export class TriggerNotificationDto {
    @ApiProperty({ example: 'appointment_reminder' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 'user-id-target' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiPropertyOptional({ enum: NotificationChannel, example: NotificationChannel.IN_APP })
    @IsOptional()
    @IsEnum(NotificationChannel)
    channel?: NotificationChannel;

    @ApiPropertyOptional({ example: { clientName: 'Ana', date: '2026-03-01 10:00' } })
    @IsOptional()
    @IsObject()
    data?: Record<string, unknown>;
}
