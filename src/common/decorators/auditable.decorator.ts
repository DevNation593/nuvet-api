import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

export interface AuditableOptions {
    action: string;
    entity: string;
}

/**
 * Marks a controller method for automatic audit logging.
 * The interceptor will record the action, entity, user, and request data.
 */
export const Auditable = (options: AuditableOptions) =>
    SetMetadata(AUDIT_ACTION_KEY, options);
