import { ConsentScope, ConsentStatus } from '@prisma/client';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class GrantConsentDto {
    @IsUUID()
    petId!: string;

    @IsUUID()
    targetTenantId!: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    targetClinicName?: string;

    @IsOptional()
    @IsArray()
    @IsEnum(ConsentScope, { each: true })
    scopes?: ConsentScope[];

    @IsOptional()
    @IsString()
    @MaxLength(500)
    message?: string;

    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class RevokeConsentDto {
    @IsOptional()
    @IsString()
    @MaxLength(200)
    reason?: string;
}

export class ListConsentsQueryDto {
    @IsOptional()
    @IsUUID()
    petId?: string;

    @IsOptional()
    @IsUUID()
    targetTenantId?: string;

    @IsOptional()
    @IsEnum(ConsentStatus)
    status?: ConsentStatus;

    // Paginación se hereda del PaginationQueryDto compartido si el controller lo acepta.
}

export class ConsentResponseDto {
    id!: string;
    petId!: string;
    ownerId!: string;
    sourceTenantId!: string;
    targetTenantId!: string;
    targetClinicName!: string | null;
    status!: ConsentStatus;
    scopes!: ConsentScope[];
    message!: string | null;
    grantedAt!: Date;
    expiresAt!: Date | null;
    revokedAt!: Date | null;
    revokeReason!: string | null;
    createdAt!: Date;
    updatedAt!: Date;

    static from(c: {
        id: string;
        petId: string;
        ownerId: string;
        sourceTenantId: string;
        targetTenantId: string;
        targetClinicName: string | null;
        status: ConsentStatus;
        scopes: ConsentScope[];
        message: string | null;
        grantedAt: Date;
        expiresAt: Date | null;
        revokedAt: Date | null;
        revokeReason: string | null;
        createdAt: Date;
        updatedAt: Date;
    }): ConsentResponseDto {
        return Object.assign(new ConsentResponseDto(), c);
    }
}
