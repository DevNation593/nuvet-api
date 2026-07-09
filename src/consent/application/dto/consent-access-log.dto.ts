import { ApiProperty } from '@nestjs/swagger';
import { ConsentAccessAction } from '@prisma/client';

/**
 * View DTO serializado al cliente.
 * Mantener las fechas en formato ISO (string) para que web/mobile no tengan
 * que serializar Date manualmente.
 */
export class ConsentAccessLogDto {
    @ApiProperty({ format: 'uuid' })
    id!: string;

    @ApiProperty({ format: 'uuid' })
    tenantId!: string;

    @ApiProperty({ format: 'uuid' })
    consentTokenId!: string;

    @ApiProperty({ format: 'uuid' })
    accessedByUserId!: string;

    @ApiProperty({ format: 'uuid', nullable: true })
    accessedByTenantId!: string | null;

    @ApiProperty({ enum: ConsentAccessAction })
    action!: ConsentAccessAction;

    @ApiProperty({ type: String, nullable: true })
    ipAddress!: string | null;

    @ApiProperty({ type: String, nullable: true })
    userAgent!: string | null;

    @ApiProperty({ example: '2026-07-07T22:00:00.000Z' })
    createdAt!: string;

    static from(record: {
        id: string;
        tenantId: string;
        consentTokenId: string;
        accessedByUserId: string;
        accessedByTenantId: string | null;
        action: ConsentAccessAction;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
    }): ConsentAccessLogDto {
        const dto = new ConsentAccessLogDto();
        dto.id = record.id;
        dto.tenantId = record.tenantId;
        dto.consentTokenId = record.consentTokenId;
        dto.accessedByUserId = record.accessedByUserId;
        dto.accessedByTenantId = record.accessedByTenantId;
        dto.action = record.action;
        dto.ipAddress = record.ipAddress;
        dto.userAgent = record.userAgent;
        dto.createdAt = record.createdAt.toISOString();
        return dto;
    }
}