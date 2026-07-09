/**
 * Tipos internos de la API de PayPhone (Ecuador).
 *
 * Documentación consultada: docs/ai/DECISIONS.md · ADR-006.
 * Estos tipos son deliberadamente restringidos al subconjunto que
 * necesitamos para cobros recurrentes de membresías — no replican
 * 100% del schema de PayPhone.
 *
 * Endpoint principal: `POST /api/sale` con body JSON, autenticación
 * Bearer via header `Authorization`.
 */

/** Body de un cobro de venta. */
export interface PayPhoneSaleRequest {
    /** Token opaco devuelto por PayPhone al tokenizar la tarjeta del cliente. */
    token: string;
    /** Monto en centavos (centésimas). */
    amount: number;
    /** Código de moneda ISO 4217 (`USD` para Ecuador). */
    currency: string;
    /** Identificador de la tienda (merchant). */
    storeId: string;
    /** Referencia única para idempotencia (mismo valor = no se cobra dos veces). */
    reference: string;
    /** Descripción legible que aparece en el dashboard de PayPhone. */
    description?: string;
    /** Email del cliente (opcional, para recibo). */
    email?: string;
    /** Teléfono del cliente (opcional, 10 dígitos Ecuador). */
    phone?: string;
}

/** Respuesta exitosa de un cobro PayPhone. */
export interface PayPhoneSaleResponse {
    /** Código interno: 0 = OK, != 0 = error (ver `PayPhoneErrorCode`). */
    statusCode: number;
    /** Mensaje humano (español). */
    message: string;
    /** id de transacción PayPhone (lo guardamos como `transactionId`). */
    transactionId: string;
    /** Estado lógico: 'Aprobada' | 'Rechazada' | 'Anulada' | etc. */
    transactionStatus: 'Aprobada' | string;
    /** Token de autorización (útil para devoluciones posteriores). */
    authorizationCode?: string;
    /** Marca de la tarjeta (VISA / MASTERCARD / DINERS / etc). */
    cardBrand?: string;
    /** últimos 4 dígitos. */
    cardLast4?: string;
}

/** Error devuelto por PayPhone cuando `statusCode !== 0`. */
export interface PayPhoneErrorResponse {
    statusCode: number;
    message: string;
    errorCode?: string;
}

/** Catálogo de códigos de error de PayPhone (subconjunto relevante). */
export const PAYPHONE_ERROR_CODES = {
    /** Petición malformada (parámetros faltantes o inválidos). */
    BAD_REQUEST: 1,
    /** Credenciales inválidas o token expirado. */
    UNAUTHORIZED: 2,
    /** Token de tarjeta inválido o expirado. */
    INVALID_TOKEN: 3,
    /** Fondos insuficientes en la tarjeta. */
    INSUFFICIENT_FUNDS: 4,
    /** Tarjeta rechazada por el banco emisor. */
    CARD_DECLINED: 5,
    /** Transacción rechazada por antifraude de PayPhone. */
    ANTIFRAUD: 6,
    /** Timeout del banco adquirente. */
    ACQUIRER_TIMEOUT: 7,
    /** Error genérico del proveedor. */
    PROVIDER_ERROR: 99,
} as const;
