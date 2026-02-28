import {
    IsNotEmpty, IsString, IsOptional, IsNumber, IsPositive, IsInt, Min, IsBoolean,
    IsArray, ValidateNested, IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { StockMovementType, OrderStatus } from '@nuvet/types';

export class CreateProductDto {
    @ApiProperty() @IsString() @IsNotEmpty() name: string;
    @ApiProperty() @IsString() @IsNotEmpty() sku: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiProperty({ example: 'Food' }) @IsString() @IsNotEmpty() category: string;
    @ApiProperty({ example: 19.99 }) @Type(() => Number) @IsNumber() @IsPositive() price: number;
    @ApiPropertyOptional({ example: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) stock?: number;
    @ApiPropertyOptional({ example: 5 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) lowStockThreshold?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class StockAdjustmentDto {
    @ApiProperty({ enum: StockMovementType })
    @IsEnum(StockMovementType)
    type: StockMovementType;

    @ApiProperty({ description: 'Product ID' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 10 })
    @Type(() => Number)
    @IsInt()
    @IsPositive()
    quantity: number;

    @ApiPropertyOptional({ example: 'Delivery from supplier' })
    @IsOptional()
    @IsString()
    reason?: string;
}

export class CreateOrderItemDto {
    @ApiProperty({ description: 'Product ID' })
    @IsString()
    @IsNotEmpty()
    productId: string;

    @ApiProperty({ example: 2, minimum: 1 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    @ApiProperty({ type: [CreateOrderItemDto], description: 'Order line items' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items: CreateOrderItemDto[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdateOrderStatusDto {
    @ApiProperty({ enum: OrderStatus })
    @IsEnum(OrderStatus)
    status: OrderStatus;
}
