import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

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
    @MaxLength(64)
    microchip!: string;
}

export class PassportPublicPet {
    id!: string;
    name!: string;
    species!: string;
    breed!: string | null;
    sex!: string;
    birthDate!: Date | null;
    color!: string | null;
    microchip!: string | null;
    photoUrl!: string | null;
    weight!: number | null;
    allergies!: string | null;
    isNeutered!: boolean;
    issuedBy!: {
        tenantId: string;
        tenantName: string;
    };
    vaccines!: Array<{
        id: string;
        vaccineName: string;
        manufacturer: string | null;
        batchNumber: string | null;
        administeredAt: Date;
        nextDueAt: Date | null;
        status: string;
    }>;
    medicalRecords!: Array<{
        id: string;
        date: Date;
        chiefComplaint: string;
        diagnosis: string;
        treatment: string;
        vetName: string | null;
    }>;
    surgeries!: Array<{
        id: string;
        scheduledAt: Date;
        completedAt: Date | null;
        type: string;
        status: string;
        postInstructions: string | null;
    }>;
    weightHistory!: Array<{ date: Date; weight: number }>;
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
