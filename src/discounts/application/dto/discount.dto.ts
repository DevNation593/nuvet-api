import {
    IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive,
    IsBoolean, IsEnum, IsDateString, Min, Max, IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DiscountType, DiscountTargetType } from '@nuvet/types';

export class CreateDiscountDto {
    @ApiProperty({ example: 'Descuento de verano' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: '20% de descuento en todos los juguetes' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENTAGE })
    @IsEnum(DiscountType)
    type: DiscountType;

    @ApiPropertyOptional({
        example: 20,
        description: 'Porcentaje (0-100) si type=PERCENTAGE, o monto fijo si type=FIXED. No aplica para BUY_X_GET_Y.',
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    value?: number;

    @ApiPropertyOptional({
        example: 2,
        description: 'Unidades que debe comprar el cliente (solo para type=BUY_X_GET_Y, ej: 2 en un 2x1)',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    buyQuantity?: number;

    @ApiPropertyOptional({
        example: 1,
        description: 'Unidades que recibe gratis el cliente (solo para type=BUY_X_GET_Y, ej: 1 en un 2x1)',
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    getQuantity?: number;

    @ApiProperty({ enum: DiscountTargetType, example: DiscountTargetType.PRODUCT_CATEGORY })
    @IsEnum(DiscountTargetType)
    targetType: DiscountTargetType;

    @ApiPropertyOptional({
        example: 'prod_uuid_here',
        description: 'ID del producto cuando targetType = PRODUCT',
    })
    @IsOptional()
    @IsString()
    targetId?: string;

    @ApiPropertyOptional({
        example: 'Toys',
        description: 'Categoría del producto cuando targetType = PRODUCT_CATEGORY',
    })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({
        example: 'VACCINATION',
        description: 'Tipo de servicio (AppointmentType) cuando targetType = SERVICE',
    })
    @IsOptional()
    @IsString()
    serviceType?: string;

    @ApiPropertyOptional({ example: 50, description: 'Monto mínimo de compra para aplicar el descuento' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minAmount?: number;

    @ApiPropertyOptional({ example: 100, description: 'Número máximo de usos. null = ilimitado' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    maxUses?: number;

    @ApiProperty({
        example: '2026-03-01T00:00:00.000Z',
        description: 'Fecha/hora de activación del descuento',
    })
    @IsDateString()
    startAt: string;

    @ApiPropertyOptional({
        example: '2026-03-31T23:59:59.000Z',
        description: 'Fecha/hora de expiración. null = sin expiración',
    })
    @IsOptional()
    @IsDateString()
    endAt?: string;
}

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class ApplyDiscountDto {
    @ApiProperty({ description: 'ID del descuento a simular/aplicar' })
    @IsString()
    @IsNotEmpty()
    discountId: string;

    @ApiProperty({ example: 150, description: 'Monto total sobre el que aplicar el descuento' })
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    amount: number;
}
