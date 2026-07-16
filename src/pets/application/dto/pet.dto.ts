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
import { Transform, Type } from 'class-transformer';
import { PetSpecies, PetSex } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreatePetDto {
    @ApiProperty({ example: 'Buddy' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name!: string;
    @ApiProperty({ enum: PetSpecies, example: PetSpecies.DOG })
    @IsEnum(PetSpecies)
    species!: PetSpecies;
    @ApiProperty({ enum: PetSex, example: PetSex.MALE })
    @IsEnum(PetSex)
    sex!: PetSex;
    @ApiPropertyOptional({
        description:
            'Owner user ID. Opcional cuando el caller es un CLIENT — el controller ' +
            'lo rellena con el sub del JWT para evitar que un cliente cree mascotas ' +
            'a nombre de otros dueños.',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    ownerId?: string;
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

export class PetsListQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({
        description: 'Include inactive pets in results (admin/staff only)',
        default: false,
    })
    @IsOptional()
    @Transform(({ value }) => value === true || value === 'true')
    @IsBoolean()
    includeInactive?: boolean = false;
}

