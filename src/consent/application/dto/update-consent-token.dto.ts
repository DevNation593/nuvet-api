import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateConsentTokenDto } from './create-consent-token.dto';

/**
 * DTO de actualización parcial de un token.
 *
 * Solo campos seguros: scope, expiresAt, auditReason.
 * El cambio de estado (REVOKED) se hace mediante el endpoint
 * dedicado `/consent/tokens/:id/revoke` para mantener trazabilidad
 * explícita — este DTO nunca puede revocar.
 */
export class UpdateConsentTokenDto extends PartialType(
    OmitType(CreateConsentTokenDto, ['ownerUserId', 'petIds', 'granteeEmail'] as const),
) {}