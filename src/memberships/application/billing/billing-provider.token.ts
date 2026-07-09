/**
 * Token DI para el `BillingProvider`. Ver ADR-005.
 *
 * La implementación por defecto (en producción / dev) es `MockBillingProvider`.
 * Tests unitarios pueden sobreescribir el provider con un stub mock-easy.
 */
export const BILLING_PROVIDER = Symbol('BILLING_PROVIDER');
