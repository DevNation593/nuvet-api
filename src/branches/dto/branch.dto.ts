import {
    IsNotEmpty, IsString, IsOptional, IsBoolean, IsEmail, IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateBranchDto {
    @ApiProperty({ example: 'Sucursal Centro' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ example: 'Av. Principal 123, Col. Centro' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: '+52 55 1234 5678' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ example: 'centro@clinica.com' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
    @IsOptional()
    @IsString()
    logoUrl?: string;

    @ApiPropertyOptional({ example: 'https://clinica.com' })
    @IsOptional()
    @IsString()
    website?: string;

    @ApiPropertyOptional({
        example: false,
        description: 'Indica si esta es la sucursal principal del tenant. Solo puede haber una por tenant.',
    })
    @IsOptional()
    @IsBoolean()
    isMain?: boolean;
}

export class UpdateBranchDto extends PartialType(CreateBranchDto) {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
