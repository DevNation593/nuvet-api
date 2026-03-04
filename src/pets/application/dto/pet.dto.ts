import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsBoolean,
    IsDateString,
    IsNumber,
    IsPositive,
    MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PetSpecies, PetSex } from '@nuvet/types';

export class CreatePetDto {
    @ApiProperty({ example: 'Buddy' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiProperty({ enum: PetSpecies, example: PetSpecies.DOG })
    @IsEnum(PetSpecies)
    species: PetSpecies;

    @ApiProperty({ enum: PetSex, example: PetSex.MALE })
    @IsEnum(PetSex)
    sex: PetSex;

    @ApiProperty({ description: 'Owner user ID' })
    @IsString()
    @IsNotEmpty()
    ownerId: string;

    @ApiPropertyOptional({ example: 'Golden Retriever' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    breed?: string;

    @ApiPropertyOptional({ example: '2020-06-15' })
    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @ApiPropertyOptional({ example: 28.5, description: 'Weight in kg' })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @IsPositive()
    weight?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    microchip?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    color?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    isNeutered?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    allergies?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class UpdatePetDto extends PartialType(CreatePetDto) { }
