import {
    BadGatewayException,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IElectronicInvoiceProvider,
    ElectronicInvoicePayload,
    IssueElectronicInvoiceResult,
    ElectronicInvoiceStatusResult,
} from '../../domain/electronic-invoice.provider';

@Injectable()
export class ElectronicInvoiceHttpProvider implements IElectronicInvoiceProvider {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
    private readonly apiSecret?: string;
    private readonly timeoutMs: number;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl =
            this.configService.get<string>('billing.apiBaseUrl') ?? 'https://api.faktur.com.ec';
        this.apiKey = this.configService.get<string>('billing.apiKey');
        this.apiSecret = this.configService.get<string>('billing.apiSecret');
        this.timeoutMs = this.configService.get<number>('billing.timeoutMs') ?? 12000;
    }

    async issueInvoice(payload: ElectronicInvoicePayload): Promise<IssueElectronicInvoiceResult> {
        const body: Record<string, unknown> = {
            buyerIdType: payload.buyer.idType,
            buyerId: payload.buyer.id,
            buyerName: payload.buyer.name,
            buyerAddress: payload.buyer.address,
            buyerEmail: payload.buyer.email,
            issueDate: payload.issueDate,
            items: payload.items,
        };

        if (payload.establishmentCode) body.establishmentCode = payload.establishmentCode;
        if (payload.emissionPointCode) body.emissionPointCode = payload.emissionPointCode;
        if (payload.payments?.length) body.payments = payload.payments;

        const query = payload.asyncEmission ? '?async=true' : '';
        const data = await this.request(`/v1/documents/invoices${query}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Idempotency-Key': payload.internalReference,
            },
        });

        return {
            providerInvoiceId: data.id,
            providerStatus: data.status,
            documentNumber: data.documentNumber,
            accessKey: data.accessKey,
            authorizationCode: data.sriResponse?.authorizationNumber,
            authorizedAt: data.sriResponse?.authorizedAt,
            raw: data,
        };
    }

    async getInvoiceStatus(providerInvoiceId: string): Promise<ElectronicInvoiceStatusResult> {
        const data = await this.request(`/v1/documents/${providerInvoiceId}`, {
            method: 'GET',
        });

        return {
            providerInvoiceId: data.id,
            providerStatus: data.status,
            documentNumber: data.documentNumber,
            accessKey: data.accessKey,
            authorizedAt: data.sriResponse?.authorizedAt,
            rejectedReason: data.errorDetail,
            raw: data,
        };
    }

    private async request(path: string, init: RequestInit): Promise<any> {
        if (!this.apiKey || !this.apiSecret) {
            throw new ServiceUnavailableException('Faltan credenciales BILLING_FAKTUR_API_KEY o BILLING_FAKTUR_API_SECRET');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-API-Key': this.apiKey,
                'X-API-Secret': this.apiSecret,
                ...((init.headers ?? {}) as Record<string, string>),
            };

            const response = await fetch(`${this.baseUrl}${path}`, {
                ...init,
                headers,
                signal: controller.signal,
            });

            let payload: any = null;
            const textBody = await response.text();
            if (textBody) {
                try {
                    payload = JSON.parse(textBody);
                } catch {
                    payload = { message: textBody };
                }
            }

            if (!response.ok) {
                const message = payload?.error?.message ?? payload?.message;
                throw new BadGatewayException(
                    message ??
                        `Error al consumir proveedor de facturación (HTTP ${response.status})`,
                );
            }

            if (!payload?.success) {
                throw new BadGatewayException(
                    payload?.error?.message ?? 'Respuesta inválida del proveedor de facturación',
                );
            }

            return payload.data;
        } catch (error: any) {
            if (error instanceof BadGatewayException) {
                throw error;
            }

            if (error?.name === 'AbortError') {
                throw new ServiceUnavailableException(
                    'Timeout al consumir el proveedor de facturación electrónica',
                );
            }

            throw new ServiceUnavailableException(
                'No se pudo conectar con el proveedor de facturación electrónica',
            );
        } finally {
            clearTimeout(timeout);
        }
    }
}
