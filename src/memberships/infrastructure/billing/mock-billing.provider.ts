import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { BillingProviderKind } from '@prisma/client';
import type {
    BillingProvider,
    ChargeResult,
    PaymentMethodToken,
} from '../../application/billing/billing-provider';
import { PassportPrismaService } from '../../../prisma/passport-prisma.service';

/**
 * Implementación `MOCK` del `BillingProvider`.
 *
 * No toca red. Persiste cada intento en `billing_attempts` para que el
 * dashboard de auditoría pueda mostrar "qué pasó" cuando algo salga mal.
 * Devuelve `ok=true` con un `transactionId` aleatorio. Cuando llegue el
 * provider real, este archivo se reemplaza y los controllers no se enteran.
 *
 * La persistencia cruza tenants (la suscripción puede no pertenecer al
 * tenant del caller), así que usa `PassportPrismaService` sin tenant scope.
 */
@Injectable()
export class MockBillingProvider implements BillingProvider {
    readonly kind = BillingProviderKind.MOCK;
    private readonly logger = new Logger(MockBillingProvider.name);

    constructor(private readonly passportPrisma: PassportPrismaService) {}

    async charge(input: {
        subscriptionId: string;
        amountCents: number;
        currency: string;
        paymentMethodToken: string;
        idempotencyKey: string;
        metadata?: Record<string, string>;
    }): Promise<ChargeResult> {
        // En el mock simulamos un ratio de éxito de 95%. El resto falla
        // con un código "card_declined" para que el dashboard muestre
        // valores realistas cuando se pruebe el flujo de retry.
        const roll = Math.random();
        const ok = roll < 0.95;

        const transactionId = ok ? `mock_${randomBytes(8).toString('hex')}` : undefined;
        const failureCode = ok ? undefined : 'card_declined';
        const failureMessage = ok
            ? undefined
            : 'El mock simuló una tarjeta rechazada (5% de intentos).';

        // Buscamos el tenantId de la suscripción para escribir el
        // billing_attempt con el contexto correcto.
        const subscription = await this.passportPrisma.client.membershipSubscription.findUnique({
            where: { id: input.subscriptionId },
            select: { tenantId: true },
        });

        if (!subscription) {
            this.logger.warn(
                `MockBilling.charge: subscription ${input.subscriptionId} no existe`,
            );
            return { ok: false, failureCode: 'subscription_not_found' };
        }

        await this.passportPrisma.client.billingAttempt.create({
            data: {
                tenantId: subscription.tenantId,
                subscriptionId: input.subscriptionId,
                provider: BillingProviderKind.MOCK,
                transactionId,
                status: ok ? 'SUCCESS' : 'FAILED',
                amountCents: input.amountCents,
                currency: input.currency,
                failureCode,
                failureMessage,
            },
        });

        if (!ok) {
            this.logger.warn(
                `MockBilling.charge: simulated failure for ${input.subscriptionId} (${failureMessage})`,
            );
        }
        return ok
            ? { ok: true, transactionId }
            : { ok: false, failureCode, failureMessage };
    }

    async cancelAtPeriodEnd(_subscriptionId: string): Promise<ChargeResult> {
        // Mock: idempotente, siempre acepta.
        return { ok: true, transactionId: `mock_cancel_${randomBytes(4).toString('hex')}` };
    }

    async tokenizePaymentMethod(_input: {
        customerId: string;
        cardNumber?: string;
        cardHolder?: string;
        expiryMonth?: number;
        expiryYear?: number;
        cvv?: string;
    }): Promise<{ ok: boolean; token?: string; failureMessage?: string }> {
        // Mock: tokenizamos cualquier input "razonable" devolviendo un
        // token aleatorio. Útil sólo para tests de UI.
        return { ok: true, token: `tok_mock_${randomBytes(8).toString('hex')}` };
    }
}
