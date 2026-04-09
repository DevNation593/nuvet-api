import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { ValidateNested } from 'class-validator';

export class InvoiceBuyerDto {
    @ApiProperty({ example: 'Cliente de Mostrador' })
    @IsString()
    @MinLength(2)
    @MaxLength(180)
    legalName!: string;

    @ApiProperty({ example: '0999999999001' })
    @IsString()
    @MinLength(8)
    @MaxLength(20)
    taxId!: string;

    @ApiPropertyOptional({ enum: ['04', '05', '06', '07', '08'] })
    @IsOptional()
    @IsIn(['04', '05', '06', '07', '08'])
    idType?: '04' | '05' | '06' | '07' | '08';

    @ApiPropertyOptional({ example: 'cliente@correo.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+593999999999' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;

    @ApiPropertyOptional({ example: 'Quito - Ecuador' })
    @IsOptional()
    @IsString()
    @MaxLength(250)
    address?: string;
}

export class IssuePosTicketInvoiceDto {
    @ApiPropertyOptional({
        description: 'Datos del comprador para ventas de mostrador o para sobrescribir los del cliente del ticket',
        type: InvoiceBuyerDto,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => InvoiceBuyerDto)
    buyer?: InvoiceBuyerDto;

    @ApiPropertyOptional({ example: '001', description: 'Requerido cuando la API Key Faktur es de tipo company' })
    @IsOptional()
    @IsString()
    @Length(3, 3)
    establishmentCode?: string;

    @ApiPropertyOptional({ example: '001', description: 'Requerido cuando la API Key Faktur es de tipo company' })
    @IsOptional()
    @IsString()
    @Length(3, 3)
    emissionPointCode?: string;

    @ApiPropertyOptional({ default: false, description: 'Si es true, Faktur responde en estado PENDING y procesa en background' })
    @IsOptional()
    @IsBoolean()
    asyncEmission?: boolean;
}
