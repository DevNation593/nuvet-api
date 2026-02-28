import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context for the current request. Used by Prisma middleware to inject
 * tenantId into queries and block cross-tenant access.
 * Set by TenantContextMiddleware after JWT validation (request.tenantId).
 */
export const tenantContext = new AsyncLocalStorage<{ tenantId: string }>();

export function getTenantId(): string | undefined {
    return tenantContext.getStore()?.tenantId;
}

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
    return tenantContext.run({ tenantId }, fn);
}
