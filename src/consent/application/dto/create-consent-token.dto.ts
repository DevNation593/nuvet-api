import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMinSize,
    ArrayMaxSize,
    ArrayUnique,
    IsArray,
    IsDateString,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ConsentTokenScope } from '@prisma/client';

/**
 * DTO de creación de un token de consentimiento.
 *
 * Restricciones:
 *  - `petIds` ∈ [1, 50] UUIDs únicos (los pets deben pertenecer al tenant emisor;
 *    el servicio lo verifica contra la base de datos).
 *  - `expiresAt` debe estar en el futuro y <= 90 días desde `now`.
 *  - `granteeEmail` se normaliza a lowercase antes de persistir.
 */
export class CreateConsentTokenDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID('4')
    ownerUserId!: string;

    @ApiProperty({ example: 'staff@other-clinic.com' })
    @IsEmail()
    @MaxLength(254)
    granteeEmail!: string;

    @ApiPropertyOptional({ format: 'uuid', nullable: true })
    @IsOptional()
    @IsUUID('4')
    granteeTenantId?: string | null;

    @ApiPropertyOptional({ enum: ConsentTokenScope, default: ConsentTokenScope.READ })
    @IsOptional()
    @IsEnum(ConsentTokenScope)
    scope?: ConsentTokenScope = ConsentTokenScope.READ;

    @ApiProperty({ type: [String], minItems: 1, maxItems: 50 })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(50)
    @ArrayUnique()
    @IsUUID('4', { each: true })
    @Type(() => String)
    petIds!: string[];

    @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
    @IsDateString()
    expiresAt!: string;

    @ApiPropertyOptional({ description: 'Motivo libre capturado al crear (ej. "traslado temporal").' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    auditReason?: string | null;
}