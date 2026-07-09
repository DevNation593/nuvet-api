import { Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { BillingProviderKind } from '@prisma/client';
import { payphoneConfig } from '../../../config/payphone.config';
import { PayPhoneBillingProvider } from './payphone-billing.provider';
import { PAYPHONE_ERROR_CODES } from './payphone.types';

/**
 * Tests del `PayPhoneBillingProvider` (Fase 2 · Slice 3).
 *   - `charge()` happy path contra sandbox PayPhone
 *   - mapeo de cada `statusCode` de PayPhone → `failureCode` interno
 *   - manejo de errores HTTP (4xx no-retry, 5xx retry + fallback)
 *   - timeout (AbortController)
 *   - cancelación (no-op documentado)
 *   - tokenización: rechaza datos crudos de tarjeta
 *
 * Mockeamos `globalThis.fetch` con `jest.fn()` para evitar red.
 */

function buildConfig(
    overrides: Partial<ConfigType<typeof payphoneConfig>> = {},
): ConfigType<typeof payphoneConfig> {
    return {
        env: 'sandbox',
        baseUrl: 'https://pay.payphonet.com',
        token: 'tok_test_abc',
        storeId: 'store-1',
        timeoutMs: 5000,
        retryMax: 1,
        ...overrides,
    };
}

/** Helper: instala un mock de fetch que devuelve una `Response` JSON. */
function mockFetchResponse(
    body: unknown,
    init: { status?: number; ok?: boolean } = {},
): jest.Mock {
    const ok = init.ok ?? (init.status ? init.status < 400 : true);
    const status = init.status ?? (ok ? 200 : 500);
    return jest.fn().mockResolvedValueOnce({
        ok,
        status,
        statusText: 'OK',
        json: async () => body,
    } as unknown as Response);
}

describe('PayPhoneBillingProvider', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('exposes kind=PAYPHONE', () => {
        const p = new PayPhoneBillingProvider(buildConfig());
        expect(p.kind).toBe(BillingProviderKind.PAYPHONE);
    });

    describe('charge()', () => {
        const baseInput = {
            subscriptionId: 'sub-1',
            amountCents: 1990,
            currency: 'USD',
            paymentMethodToken: 'tok_card_abc',
            idempotencyKey: 'idem-1',
        };

        it('devuelve ok=true con transactionId cuando PayPhone responde 200 statusCode=0', async () => {
            globalThis.fetch = mockFetchResponse(
                {
                    statusCode: 0,
                    message: 'OK',
                    transactionId: 'pp-tx-1',
                    transactionStatus: 'Aprobada',
                    cardBrand: 'VISA',
                    cardLast4: '1111',
                },
                { status: 200 },
            );
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.charge(baseInput);
            expect(result).toEqual({ ok: true, transactionId: 'pp-tx-1' });
            expect(globalThis.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/sale'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer tok_test_abc',
                        'Content-Type': 'application/json',
                    }),
                    body: expect.stringContaining('"reference":"idem-1"'),
                }),
            );
        });

        it('mapea insufficient_funds al interno', async () => {
            globalThis.fetch = mockFetchResponse(
                {
                    statusCode: PAYPHONE_ERROR_CODES.INSUFFICIENT_FUNDS,
                    message: 'Fondos insuficientes',
                    transactionStatus: 'Rechazada',
                },
                { status: 200 },
            );
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.charge(baseInput);
            expect(result).toMatchObject({
                ok: false,
                failureCode: 'insufficient_funds',
            });
        });

        it('mapea card_declined al interno', async () => {
            globalThis.fetch = mockFetchResponse(
                {
                    statusCode: PAYPHONE_ERROR_CODES.CARD_DECLINED,
                    message: 'Tarjeta rechazada',
                    transactionStatus: 'Rechazada',
                },
                { status: 200 },
            );
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.charge(baseInput);
            expect(result).toMatchObject({
                ok: false,
                failureCode: 'card_declined',
            });
        });

        it('mapea invalid_payment_token (token de tarjeta expirado)', async () => {
            globalThis.fetch = mockFetchResponse(
                {
                    statusCode: PAYPHONE_ERROR_CODES.INVALID_TOKEN,
                    message: 'Token inválido o expirado',
                    transactionStatus: 'Rechazada',
                },
                { status: 200 },
            );
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.charge(baseInput);
            expect(result).toMatchObject({
                ok: false,
                failureCode: 'invalid_payment_token',
            });
        });

        it('mapea antifraud_rejected', async () => {
            globalThis.fetch = mockFetchResponse(
                {
                    statusCode: PAYPHONE_ERROR_CODES.ANTIFRAUD,
                    message: 'Bloqueado por antifraude',
                    transactionStatus: 'Rechazada',
                },
                { status: 200 },
            );
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.charge(baseInput);
            expect(result).toMatchObject({
                ok: false,
                failureCode: 'antifraud_rejected',
            });
        });

        it('rechaza con provider_not_configured si falta token', async () => {
            const p = new PayPhoneBillingProvider(
                buildConfig({ token: '', storeId: '' }),
            );
            const result = await p.charge(baseInput);
            expect(result).toMatchObject({
                ok: false,
                failureCode: 'provider_not_configured',
            });
        });

        it('clase HTTP 4xx no se reintenta (error de input)', async () => {
            const fetchMock = jest
                .fn()
                .mockResolvedValueOnce({
                    ok: false,
                    status: 422,
                    statusText: 'Unprocessable',
                    json: async () => ({
                        statusCode: 422,
                        message: 'Invalid amount',
                    }),
                } as unknown as Response);
            globalThis.fetch = fetchMock;
            const p = new PayPhoneBillingProvider(buildConfig({ retryMax: 3 }));
            const result = await p.charge(baseInput);
            expect(result.ok).toBe(false);
            expect(fetchMock).toHaveBeenCalledTimes(1); // sin reintento
        });

        it('clase HTTP 5xx se reintenta hasta retryMax y luego falla', async () => {
            const fetchMock = jest
                .fn()
                .mockResolvedValue({
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                    // body SIN statusCode numérico → cae al fallback
                    // genérico basado en HTTP status
                    json: async () => ({ message: 'down' }),
                } as unknown as Response);
            globalThis.fetch = fetchMock;
            const p = new PayPhoneBillingProvider(buildConfig({ retryMax: 2 }));
            const result = await p.charge(baseInput);
            expect(result.ok).toBe(false);
            expect(result.failureCode).toBe('payphone_provider_error');
            // 1 intento inicial + 2 reintentos = 3
            expect(fetchMock).toHaveBeenCalledTimes(3);
        });

        it('mapea timeout a failureCode="timeout" cuando fetch aborta', async () => {
            globalThis.fetch = jest
                .fn()
                .mockImplementationOnce(
                    () =>
                        new Promise((_resolve, reject) => {
                            const err = new Error('aborted');
                            err.name = 'AbortError';
                            reject(err);
                        }),
                );
            const p = new PayPhoneBillingProvider(buildConfig({ retryMax: 0 }));
            const result = await p.charge(baseInput);
            expect(result.ok).toBe(false);
            expect(result.failureCode).toBe('timeout');
        });
    });

    describe('cancelAtPeriodEnd()', () => {
        it('devuelve ok=true (PayPhone no tiene endpoint de cancel, es no-op documentado)', async () => {
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.cancelAtPeriodEnd('sub-1');
            expect(result.ok).toBe(true);
            expect(result.transactionId).toMatch(/^noop_sub-1_/);
        });
    });

    describe('tokenizePaymentMethod()', () => {
        it('rechaza SIEMPRE que reciba datos crudos de tarjeta (PCI: nunca ver PAN/CVV)', async () => {
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.tokenizePaymentMethod({
                customerId: 'cust-1',
                cardNumber: '4111111111111111', // ¡PAN crudo!
                cardHolder: 'Test User',
                expiryMonth: 12,
                expiryYear: 2030,
                cvv: '123',
            });
            expect(result.ok).toBe(false);
            expect(result.failureMessage).toMatch(
                /no acepta datos de tarjeta crudos/i,
            );
        });

        it('devuelve mensaje informativo si se llama sin cardNumber (tokenización client-side)', async () => {
            const p = new PayPhoneBillingProvider(buildConfig());
            const result = await p.tokenizePaymentMethod({ customerId: 'cust-1' });
            expect(result.ok).toBe(false);
            expect(result.failureMessage).toMatch(/PayPhone Button/i);
        });
    });
});
