import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ConsentAccessAction } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/**
 * Query DTO para listar entradas de auditoría.
 *
 * Filtros opcionales:
 *  - tokenId    → entradas de un token específico.
 *  - action     → por tipo de evento (VALIDATE / READ / REVOKE).
 *  - from / to  → ventana temporal (ISO 8601).
 *
 * Paginación heredada de `PaginationQueryDto`.
 */
export class ConsentAccessLogQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID('4')
    tokenId?: string;

    @ApiPropertyOptional({ enum: ConsentAccessAction })
    @IsOptional()
    @IsEnum(ConsentAccessAction)
    action?: ConsentAccessAction;

    @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ example: '2026-07-31T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    to?: string;
}