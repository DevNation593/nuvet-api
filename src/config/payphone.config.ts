import { registerAs } from '@nestjs/config';

/**
 * Configuración del provider de pagos PayPhone (Ecuador).
 *
 * Variables de entorno esperadas:
 *   - PAYPHONE_ENV            : 'sandbox' | 'production' (default 'sandbox')
 *   - PAYPHONE_TOKEN          : Bearer token de la API (header Authorization)
 *   - PAYPHONE_STORE_ID       : id de la tienda en PayPhone (alias `storeId` en body)
 *   - PAYPHONE_TIMEOUT_MS     : timeout HTTP en ms (default 12000)
 *   - PAYPHONE_RETRY_MAX      : reintentos ante 5xx/timeouts (default 1)
 *
 * En 'sandbox' el baseUrl apunta al entorno de pruebas de PayPhone;
 * en 'production' apunta al endpoint productivo.
 */
export const payphoneConfig = registerAs('payphone', () => {
    const env = (process.env.PAYPHONE_ENV ?? 'sandbox').toLowerCase();
    const isProd = env === 'production' || env === 'prod';
    return {
        env: isProd ? 'production' : 'sandbox',
        baseUrl: isProd
            ? 'https://api.payphone.app'
            : 'https://pay.payphonet.com',
        token: process.env.PAYPHONE_TOKEN ?? '',
        storeId: process.env.PAYPHONE_STORE_ID ?? '',
        timeoutMs: (() => {
            const parsed = Number.parseInt(
                process.env.PAYPHONE_TIMEOUT_MS ?? '12000',
                10,
            );
            return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
        })(),
        retryMax: (() => {
            const parsed = Number.parseInt(
                process.env.PAYPHONE_RETRY_MAX ?? '1',
                10,
            );
            return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
        })(),
    };
});
