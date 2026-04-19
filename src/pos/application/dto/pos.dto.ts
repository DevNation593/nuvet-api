import {
    IsString, IsOptional, IsNumber, Min, IsEnum,
    IsArray, ValidateNested, IsUUID, IsDateString, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PosItemType, PosTicketStatus } from '@nuvet/types';
import { IssuePosTicketInvoiceDto } from '../../../billing/application/dto/billing.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

// ── Cash Register ─────────────────────────────────────────────────────────────

export class OpenRegisterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    openingBalance?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CloseRegisterDto {
    @ApiProperty()
    @IsNumber()
    @Min(0)
    closingBalance!: number;
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// ── Ticket ────────────────────────────────────────────────────────────────────

export class CreateTicketDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    registerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class TicketFilterDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: PosTicketStatus })
    @IsOptional()
    @IsEnum(PosTicketStatus)
    status?: PosTicketStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    registerId?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    dateFrom?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    dateTo?: string;
}

// ── Ticket Item ───────────────────────────────────────────────────────────────

export class AddTicketItemDto {
    @ApiProperty({ enum: PosItemType })
    @IsEnum(PosItemType)
    type!: PosItemType;
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    productId?: string;

    @ApiProperty()
    @IsString()
    description!: string;
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(0.001)
    quantity?: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    unitPrice!: number;
    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    discountAmount?: number;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export class PaymentInputDto {
    @ApiProperty({ enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    method!: PaymentMethod;
    @ApiProperty()
    @IsNumber()
    @Min(0.01)
    amount!: number;
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    reference?: string;
}

export class ProcessPaymentsDto {
    @ApiProperty({ type: [PaymentInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentInputDto)
    payments!: PaymentInputDto[];
}

// ── Refund ────────────────────────────────────────────────────────────────────

export class CreateRefundDto {
    @ApiProperty()
    @IsNumber()
    @Min(0.01)
    amount!: number;
    @ApiProperty({ example: 'Cliente devolvio el producto por falla', minLength: 8 })
    @IsString()
    @MinLength(8)
    reason!: string;
}

// ── Legacy Compatibility (web POS) ──────────────────────────────────────────

export class LegacyTransactionItemInputDto {
    @ApiProperty()
    @IsUUID()
    productId!: string;
    @ApiProperty()
    @IsNumber()
    @Min(0.001)
    quantity!: number;
    @ApiProperty()
    @IsNumber()
    @Min(0)
    unitPrice!: number;
}

export class CreateLegacyTransactionDto {
    @ApiProperty({ type: [LegacyTransactionItemInputDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => LegacyTransactionItemInputDto)
    items!: LegacyTransactionItemInputDto[];
    @ApiProperty({ enum: PaymentMethod })
    @IsEnum(PaymentMethod)
    paymentMethod!: PaymentMethod;
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    promotionCode?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    cashReceived?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    clientId?: string;

    @ApiPropertyOptional({ description: 'Branch ID for multi-branch tenants' })
    @IsOptional()
    @IsUUID()
    branchId?: string;

    @ApiPropertyOptional({
        type: IssuePosTicketInvoiceDto,
        description: 'Datos opcionales para emitir factura electronica al cerrar la venta',
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => IssuePosTicketInvoiceDto)
    invoice?: IssuePosTicketInvoiceDto;
}

