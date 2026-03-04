import { IsNotEmpty, IsString, IsOptional, IsEmail, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdoptionStatus } from '@nuvet/types';

export class CreateAdoptionDto {
    @ApiProperty({ description: 'Pet to put up for adoption' })
    @IsString()
    @IsNotEmpty()
    petId: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class ApplyAdoptionDto {
    @ApiProperty() @IsString() @IsNotEmpty() applicantName: string;
    @ApiProperty() @IsEmail() applicantEmail: string;
    @ApiPropertyOptional() @IsOptional() @IsString() applicantPhone?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAdoptionStatusDto {
    @ApiProperty({ enum: [AdoptionStatus.APPROVED, AdoptionStatus.REJECTED] })
    @IsIn([AdoptionStatus.APPROVED, AdoptionStatus.REJECTED])
    status: AdoptionStatus;

    @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
}
