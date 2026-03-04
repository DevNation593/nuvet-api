import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateClientDto {
    @ApiProperty({ example: 'client@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Ana' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Gomez' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ example: 'ClientPass123!', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    password: string;

    @ApiPropertyOptional({ example: '+593999999999' })
    @IsOptional()
    @IsString()
    phone?: string;
}

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    isActive?: boolean;
}
