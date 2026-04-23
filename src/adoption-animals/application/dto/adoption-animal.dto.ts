import { IsNotEmpty, IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PetSpecies, PetSex } from '@nuvet/types';
import { Type } from 'class-transformer';

export class CreateAdoptionAnimalDto {
    @ApiProperty() @IsString() @IsNotEmpty() name!: string;
    @ApiProperty({ enum: PetSpecies }) @IsEnum(PetSpecies) species!: PetSpecies;
    @ApiProperty({ enum: PetSex }) @IsEnum(PetSex) sex!: PetSex;
    @ApiPropertyOptional() @IsOptional() @IsString() breed?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isNeutered?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateAdoptionAnimalDto {
    @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
    @ApiPropertyOptional({ enum: PetSpecies }) @IsOptional() @IsEnum(PetSpecies) species?: PetSpecies;
    @ApiPropertyOptional({ enum: PetSex }) @IsOptional() @IsEnum(PetSex) sex?: PetSex;
    @ApiPropertyOptional() @IsOptional() @IsString() breed?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() birthDate?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Type(() => Number) weight?: number;
    @ApiPropertyOptional() @IsOptional() @IsString() photoUrl?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isNeutered?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
