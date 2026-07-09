import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * DTO para validar/canjear un token.
 * Se modela como POST porque tiene efectos colaterales (audit log).
 */
export class ValidateConsentTokenDto {
    @ApiProperty({ format: 'uuid', description: 'Identificador del token a validar.' })
    @IsUUID('4')
    tokenId!: string;
}