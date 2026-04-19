import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AuditLogQueryDto {
    @ApiPropertyOptional({ default: 1, minimum: 1 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({ description: 'Filtrar por accion exacta', example: 'POS_TICKET_REFUNDED' })
    @IsOptional()
    @IsString()
    action?: string;

    @ApiPropertyOptional({ description: 'Filtrar por entidad exacta', example: 'PosTicket' })
    @IsOptional()
    @IsString()
    entity?: string;

    @ApiPropertyOptional({ description: 'Filtrar por id de usuario' })
    @IsOptional()
    @IsString()
    userId?: string;

    @ApiPropertyOptional({ description: 'Filtrar eventos desde esta fecha ISO', example: '2026-04-01' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ description: 'Filtrar eventos hasta esta fecha ISO', example: '2026-04-11' })
    @IsOptional()
    @IsDateString()
    to?: string;
}
