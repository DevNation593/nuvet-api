/**
 * Interfaz `BillingProvider` — Fase 2.
 *
 * Punto único de integración con cualquier proveedor de pagos
 * (Stripe, PayPhone, mock, etc). Los controllers nunca tocan el provider
 * directamente: lo hacen a través de los `BillingProvider` que se inyectan
 * por DI. Cambiar de proveedor = cambiar el binding, sin reescribir
 * controllers / services / repositories.
 *
 * Ver ADR-005 en `docs/ai/DECISIONS.md` para la justificación completa.
 */

import type { BillingProviderKind } from '@prisma/client';

export interface ChargeResult {
    ok: boolean;
    transactionId?: string;
    failureCode?: string;
    failureMessage?: string;
}

/**
 * Credenciales opacas asociadas a un cliente (no se guardan en claro,
 * se almacenan sólo como token devuelto por el provider).
 */
export interface PaymentMethodToken {
    token: string;
    provider: BillingProviderKind;
    last4?: string;
    brand?: string; // "VISA", "MASTERCARD", etc.
    expiryMonth?: number;
    expiryYear?: number;
}

export interface BillingProvider {
    readonly kind: BillingProviderKind;

    /**
     * Cobro único o recurrente del monto al método de pago tokenizado.
     * El provider decide si cobrar inmediatamente o programar el cargo.
     */
    charge(input: {
        subscriptionId: string;
        amountCents: number;
        currency: string;
        paymentMethodToken: string;
        idempotencyKey: string;
        metadata?: Record<string, string>;
    }): Promise<ChargeResult>;

    /**
     * Marca la suscripción para que NO se renueve al final del período
     * actual. Equivalente a `cancelAtPeriodEnd` en Stripe. Devuelve éxito
     * si el provider aceptó el pedido.
     */
    cancelAtPeriodEnd(subscriptionId: string): Promise<ChargeResult>;

    /**
     * Tokeniza un método de pago. En esta vuelta no se usa porque el mock
     * acepta cualquier `paymentMethodToken`; queda declarado para
     * cuando llegue el provider real.
     */
    tokenizePaymentMethod(input: {
        customerId: string;
        cardNumber?: string;
        cardHolder?: string;
        expiryMonth?: number;
        expiryYear?: number;
        cvv?: string;
    }): Promise<{ ok: boolean; token?: string; failureMessage?: string }>;
}
