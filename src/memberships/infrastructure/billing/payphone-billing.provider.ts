import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BillingProviderKind } from '@prisma/client';
import {
    BillingProvider,
    ChargeResult,
} from '../../application/billing/billing-provider';
import { payphoneConfig } from '../../../config/payphone.config';
import {
    PayPhoneErrorResponse,
    PAYPHONE_ERROR_CODES,
    PayPhoneSaleRequest,
    PayPhoneSaleResponse,
} from './payphone.types';

/**
 * Provider de pagos para Ecuador vía PayPhone REST API.
 *
 * Implementa `BillingProvider` (ver ADR-005). El binding default
 * sigue siendo `MockBillingProvider`; este provider se activa cuando
 * el feature flag `billing_payphone_provider` está habilitado (ver
 * `memberships.module.ts`).
 *
 * Decisiones de diseño (ADR-006):
 *   - HTTP via `fetch` nativo de Node 20+ → cero deps nuevas
 *   - `AbortController` para timeout explícito (sin `setTimeout` colgando)
 *   - Idempotencia: pasamos `idempotencyKey` como `reference` a PayPhone
 *     → cobros duplicados se deduplican en el gateway
 *   - Reintentos: hasta N veces ante 5xx/timeout/network errors
 *     (default 1 — un reintento conservador)
 *   - Errores mapeados: cada `statusCode` de PayPhone se traduce a un
 *     `failureCode` interno estable (ver PAYPHONE_ERROR_CODES) para
 *     que el dashboard /clinic/billing-attempts los agrupe bien.
 *
 * Sandbox: la api en `https://pay.payphonet.com` (subdominio `pay`)
 * acepta cualquier tarjeta de prueba `4000 0000 0000 0002` (rechazada)
 * / `4111 1111 1111 1111` (aprobada) sin tocar la red real.
 */
@Injectable()
export class PayPhoneBillingProvider implements BillingProvider {
    readonly kind = BillingProviderKind.PAYPHONE;
    private readonly logger = new Logger(PayPhoneBillingProvider.name);

    constructor(
        @Inject(payphoneConfig.KEY)
        private readonly config: ConfigType<typeof payphoneConfig>,
    ) {
        if (!this.config.token || !this.config.storeId) {
            this.logger.warn(
                `[PayPhone] Falta PAYPHONE_TOKEN o PAYPHONE_STORE_ID — ` +
                    `los cobros fallarán hasta configurarlos. ` +
                    `(env=${this.config.env}, baseUrl=${this.config.baseUrl})`,
            );
        }
    }

    async charge(input: {
        subscriptionId: string;
        amountCents: number;
        currency: string;
        paymentMethodToken: string;
        idempotencyKey: string;
        metadata?: Record<string, string>;
    }): Promise<ChargeResult> {
        // Sanity: la config tiene que estar presente
        if (!this.config.token || !this.config.storeId) {
            return {
                ok: false,
                failureCode: 'provider_not_configured',
                failureMessage:
                    'PayPhone no está configurado (PAYPHONE_TOKEN / PAYPHONE_STORE_ID faltantes)',
            };
        }

        const body: PayPhoneSaleRequest = {
            token: input.paymentMethodToken,
            amount: input.amountCents,
            currency: input.currency,
            storeId: this.config.storeId,
            reference: input.idempotencyKey,
            description:
                input.metadata?.['description'] ??
                `Membresía ${input.subscriptionId}`,
        };

        const url = `${this.config.baseUrl}/api/sale`;

        try {
            const response = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.config.token}`,
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = (await response.json()) as PayPhoneSaleResponse;
                if (data.statusCode === 0) {
                    this.logger.log(
                        `[PayPhone] ok subscription=${input.subscriptionId} ` +
                            `tx=${data.transactionId} amount=${input.amountCents} ${input.currency}`,
                    );
                    return {
                        ok: true,
                        transactionId: data.transactionId,
                    };
                }
                // Respuesta 2xx pero statusCode de error de PayPhone
                return this.mapPayPhoneError({
                    statusCode: data.statusCode,
                    message: data.message ?? 'Error desconocido de PayPhone',
                });
            }

            // 4xx / 5xx
            let errorBody: PayPhoneErrorResponse | null = null;
            try {
                errorBody = (await response.json()) as PayPhoneErrorResponse;
            } catch {
                // body no es JSON; lo tratamos como error genérico
            }
            if (errorBody && typeof errorBody.statusCode === 'number') {
                return this.mapPayPhoneError(errorBody);
            }
            return {
                ok: false,
                failureCode: this.httpStatusToFailureCode(response.status),
                failureMessage: `PayPhone HTTP ${response.status}: ${
                    errorBody?.message ?? response.statusText
                }`,
            };
        } catch (err) {
            const message =
                err instanceof Error ? err.message : 'unknown error';
            this.logger.error(
                `[PayPhone] network/timeout subscription=${input.subscriptionId}: ${message}`,
            );
            return {
                ok: false,
                failureCode: this.classifyNetworkError(err),
                failureMessage: `PayPhone ${message}`,
            };
        }
    }

    async cancelAtPeriodEnd(subscriptionId: string): Promise<ChargeResult> {
        // PayPhone no tiene endpoint dedicado para "no renovar"
        // (la cancelación se gestiona con la pasarela manual o vía
        // dashboard). Devolvemos ok=true para no bloquear el flujo
        // del servicio; el operador debe gestionar la baja en el
        // dashboard de PayPhone.
        this.logger.log(
            `[PayPhone] cancelAtPeriodEnd subscription=${subscriptionId} — ` +
                `noop a nivel de provider, requiere acción manual en dashboard`,
        );
        return { ok: true, transactionId: `noop_${subscriptionId}_${Date.now()}` };
    }

    async tokenizePaymentMethod(input: {
        customerId: string;
        cardNumber?: string;
        cardHolder?: string;
        expiryMonth?: number;
        expiryYear?: number;
        cvv?: string;
    }): Promise<{ ok: boolean; token?: string; failureMessage?: string }> {
        // En esta vuelta, la tokenización se hace client-side
        // (PayPhone Button / SDK Web) y la clínica recibe un token
        // opaco que envía al backend. El backend NUNCA debería ver
        // datos de tarjeta. Si llega aquí un cardNumber no nulo,
        // lo rechazamos explícitamente para hacer cumplir esa política.
        if (input.cardNumber || input.cvv) {
            return {
                ok: false,
                failureMessage:
                    'PayPhoneBillingProvider no acepta datos de tarjeta crudos — ' +
                    'tokenizar client-side (PayPhone Button / WebSDK) y enviar el token al backend',
            };
        }
        // Si llegamos aquí es porque algo externo llama al provider
        // para tokenizar; el flujo real es client-side.
        return {
            ok: false,
            failureMessage:
                'tokenizePaymentMethod no implementado en PayPhoneBillingProvider — ' +
                'usar PayPhone Button / WebSDK del lado del cliente',
        };
    }

    // ── Helpers privados ───────────────────────────────────────────────────

    /**
     * fetch con timeout (AbortController) y reintentos ante 5xx, timeout
     * o network errors. 4xx no se reintenta (es error de input).
     */
    private async fetchWithRetry(
        url: string,
        init: RequestInit,
    ): Promise<Response> {
        let lastError: unknown;
        for (let attempt = 0; attempt <= this.config.retryMax; attempt++) {
            const ac = new AbortController();
            const timer = setTimeout(() => ac.abort(), this.config.timeoutMs);
            try {
                const res = await fetch(url, { ...init, signal: ac.signal });
                clearTimeout(timer);
                if (res.status >= 500 && attempt < this.config.retryMax) {
                    lastError = new Error(`HTTP ${res.status}`);
                    continue;
                }
                return res;
            } catch (err) {
                clearTimeout(timer);
                lastError = err;
                if (attempt >= this.config.retryMax) throw err;
            }
        }
        throw lastError instanceof Error
            ? lastError
            : new Error('PayPhone: reintentos agotados');
    }

    /**
     * Traduce un `statusCode` de PayPhone a `failureCode` interno.
     * El set es cerrado y estable — el dashboard depende de estos
     * códigos para agrupar fallos (ver phase2-15 / topFailureCodes).
     */
    private mapPayPhoneError(
        err: PayPhoneErrorResponse,
    ): ChargeResult {
        const code = err.statusCode;
        const mapped = this.payPhoneCodeToInternal(code);
        this.logger.warn(
            `[PayPhone] rejected code=${code} → ${mapped}: ${err.message}`,
        );
        return {
            ok: false,
            failureCode: mapped,
            failureMessage: err.message ?? `PayPhone error ${code}`,
        };
    }

    private payPhoneCodeToInternal(code: number): string {
        switch (code) {
            case PAYPHONE_ERROR_CODES.BAD_REQUEST:
                return 'bad_request';
            case PAYPHONE_ERROR_CODES.UNAUTHORIZED:
                return 'unauthorized';
            case PAYPHONE_ERROR_CODES.INVALID_TOKEN:
                return 'invalid_payment_token';
            case PAYPHONE_ERROR_CODES.INSUFFICIENT_FUNDS:
                return 'insufficient_funds';
            case PAYPHONE_ERROR_CODES.CARD_DECLINED:
                return 'card_declined';
            case PAYPHONE_ERROR_CODES.ANTIFRAUD:
                return 'antifraud_rejected';
            case PAYPHONE_ERROR_CODES.ACQUIRER_TIMEOUT:
                return 'acquirer_timeout';
            default:
                // 5xx → problema del provider (PayPhone o el banco adquirente)
                if (code >= 500 && code < 600) return 'payphone_provider_error';
                // 4xx → input malformado / cliente
                if (code >= 400 && code < 500) return 'payphone_client_error';
                // Cualquier otro (sub-100 o sentinel) → provider error
                return 'payphone_provider_error';
        }
    }

    private httpStatusToFailureCode(status: number): string {
        if (status === 401 || status === 403) return 'unauthorized';
        if (status === 404) return 'not_found';
        if (status === 422) return 'unprocessable';
        if (status === 429) return 'rate_limited';
        if (status >= 500) return 'payphone_provider_error';
        return 'payphone_client_error';
    }

    private classifyNetworkError(err: unknown): string {
        if (!(err instanceof Error)) return 'network_error';
        if (err.name === 'AbortError' || /aborted/i.test(err.message)) {
            return 'timeout';
        }
        if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(err.message)) {
            return 'dns_failure';
        }
        if (/ECONNREFUSED|ECONNRESET/i.test(err.message)) {
            return 'connection_refused';
        }
        return 'network_error';
    }
}
