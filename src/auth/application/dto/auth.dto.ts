import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsNotEmpty,
    Matches,
    IsOptional,
    IsPhoneNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'Happy Paws Clinic' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    clinicName: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ example: 'owner@happypaws.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message:
            'Password must have uppercase, lowercase and a number or special character',
    })
    password: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    phone?: string;
}

export class LoginDto {
    @ApiProperty({ example: 'owner@happypaws.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'demo-pro' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'tenantSlug must be lowercase slug format (e.g. demo-pro)',
    })
    tenantSlug?: string;

    @ApiProperty({ example: 'SecurePass123!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}

export class RefreshTokenDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class ChangePasswordDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    currentPassword: string;

    @ApiProperty({ minLength: 8 })
    @IsString()
    @MinLength(8)
    @MaxLength(64)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must have uppercase, lowercase and a number or special character',
    })
    newPassword: string;
}

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'Jane' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;

    @ApiPropertyOptional({ example: '+1234567890' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    phone?: string;
}
