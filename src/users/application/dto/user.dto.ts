import {
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { UserRole } from '@nuvet/types';

export class CreateUserDto {
    @ApiProperty({ example: 'jane@happypaws.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Jane' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Smith' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ enum: UserRole, example: UserRole.VET })
    @IsEnum(UserRole)
    role: UserRole;

    @ApiProperty({ example: 'TempPass123!', minLength: 8 })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    password: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
