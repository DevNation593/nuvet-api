import { registerAs } from '@nestjs/config';

export const billingConfig = registerAs('billing', () => ({
    apiBaseUrl: process.env.BILLING_FAKTUR_API_BASE_URL || 'https://api.faktur.com.ec',
    apiKey: process.env.BILLING_FAKTUR_API_KEY,
    apiSecret: process.env.BILLING_FAKTUR_API_SECRET,
    timeoutMs: (() => {
        const parsed = Number.parseInt(process.env.BILLING_FAKTUR_TIMEOUT_MS || '12000', 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
    })(),
    fakturTaxCode: process.env.BILLING_FAKTUR_TAX_CODE || '2',
    fakturIvaRateCode: process.env.BILLING_FAKTUR_IVA_RATE_CODE || '2',
    fakturKeyMode: process.env.BILLING_FAKTUR_KEY_MODE || 'POINT',
    fakturEstablishmentCode: process.env.BILLING_FAKTUR_ESTABLISHMENT_CODE,
    fakturEmissionPointCode: process.env.BILLING_FAKTUR_EMISSION_POINT_CODE,
    fakturAsyncEmission:
        (process.env.BILLING_FAKTUR_ASYNC_EMISSION || 'false').toLowerCase() === 'true',
}));
