import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

/**
 * DTO para crear un share token.
 * El dueño de la mascota (o staff del source tenant) puede generar un token
 * público con expiración. Default: 7 días, máximo 90.
 */
export class CreateShareDto {
    @IsUUID()
    petId!: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    ttlDays?: number;
}

export class PassportLookupQueryDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    microchip!: string;
}

export class PassportIssuedByDto {
    @ApiProperty() tenantId!: string;
    @ApiProperty() tenantName!: string;
}

export class PassportVaccineDto {
    @ApiProperty() id!: string;
    @ApiProperty() vaccineName!: string;
    @ApiPropertyOptional({ nullable: true }) manufacturer!: string | null;
    @ApiPropertyOptional({ nullable: true }) batchNumber!: string | null;
    @ApiProperty() administeredAt!: Date;
    @ApiPropertyOptional({ nullable: true }) nextDueAt!: Date | null;
    @ApiProperty() status!: string;
}

export class PassportMedicalRecordDto {
    @ApiProperty() id!: string;
    @ApiProperty() date!: Date;
    @ApiProperty() chiefComplaint!: string;
    @ApiProperty() diagnosis!: string;
    @ApiProperty() treatment!: string;
    @ApiPropertyOptional({ nullable: true }) vetName!: string | null;
}

export class PassportSurgeryDto {
    @ApiProperty() id!: string;
    @ApiProperty() scheduledAt!: Date;
    @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
    @ApiProperty() type!: string;
    @ApiProperty() status!: string;
    @ApiPropertyOptional({ nullable: true }) postInstructions!: string | null;
}

export class PassportWeightEntryDto {
    @ApiProperty() date!: Date;
    @ApiProperty() weight!: number;
}

export class PassportPublicPet {
    @ApiProperty()
    id!: string;
    @ApiProperty()
    name!: string;
    @ApiProperty()
    species!: string;
    @ApiProperty({ nullable: true })
    breed!: string | null;
    @ApiProperty()
    sex!: string;
    @ApiProperty({ nullable: true })
    birthDate!: Date | null;
    @ApiProperty({ nullable: true })
    color!: string | null;
    @ApiProperty({ nullable: true })
    microchip!: string | null;
    @ApiProperty({ nullable: true })
    photoUrl!: string | null;
    @ApiProperty({ nullable: true })
    weight!: number | null;
    @ApiProperty({ nullable: true })
    allergies!: string | null;
    @ApiProperty()
    isNeutered!: boolean;
    @ApiProperty({ type: () => PassportIssuedByDto })
    issuedBy!: PassportIssuedByDto;
    @ApiProperty({ type: () => PassportVaccineDto, isArray: true })
    vaccines!: PassportVaccineDto[];
    @ApiProperty({ type: () => PassportMedicalRecordDto, isArray: true })
    medicalRecords!: PassportMedicalRecordDto[];
    @ApiProperty({ type: () => PassportSurgeryDto, isArray: true })
    surgeries!: PassportSurgeryDto[];
    @ApiProperty({ type: () => PassportWeightEntryDto, isArray: true })
    weightHistory!: PassportWeightEntryDto[];
    @ApiProperty()
    generatedAt!: Date;
}

export class ShareResponseDto {
    id!: string;
    petId!: string;
    token!: string;
    expiresAt!: Date;
    revokedAt!: Date | null;
    accessCount!: number;
    lastAccessedAt!: Date | null;
    createdAt!: Date;
    shareUrl!: string;
}

export class LookupResultDto {
    petId!: string;
    petName!: string;
    sourceTenantId!: string;
    sourceTenantName!: string;
    microchip!: string;
}
