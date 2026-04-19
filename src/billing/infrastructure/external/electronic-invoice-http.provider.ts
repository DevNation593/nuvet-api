import {
    BadGatewayException,
    Injectable,
    Logger,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    IElectronicInvoiceProvider,
    ElectronicInvoicePayload,
    IssueElectronicInvoiceResult,
    ElectronicInvoiceStatusResult,
    DocumentUrlResult,
    TenantBillingCredentials,
} from '../../domain/electronic-invoice.provider';

@Injectable()
export class ElectronicInvoiceHttpProvider implements IElectronicInvoiceProvider {
    private readonly logger = new Logger(ElectronicInvoiceHttpProvider.name);
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

    async issueInvoice(payload: ElectronicInvoicePayload, credentials?: TenantBillingCredentials): Promise<IssueElectronicInvoiceResult> {
        const startedAt = Date.now();
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

        const query = payload.asyncEmission ? '?async=true' : '';
        const data = await this.request(`/v1/documents/invoices${query}`, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {
                'Idempotency-Key': payload.internalReference,
            },
        }, credentials);

        this.logger.log(
            JSON.stringify({
                event: 'billing.provider.issue.success',
                internalReference: payload.internalReference,
                providerInvoiceId: data?.id,
                durationMs: Date.now() - startedAt,
            }),
        );

        return {
            providerInvoiceId: data.id,
            providerStatus: data.status,
            documentNumber: data.documentNumber,
            accessKey: data.accessKey,
            authorizationCode: data.sriResponse?.authorizationNumber,
            authorizedAt: data.sriResponse?.authorizedAt,
            pdfUrl: this.pickPdfUrl(data),
            xmlUrl: this.pickXmlUrl(data),
            raw: data,
        };
    }

    async getInvoiceStatus(providerInvoiceId: string): Promise<ElectronicInvoiceStatusResult> {
        const startedAt = Date.now();
        const data = await this.request(`/v1/documents/${providerInvoiceId}`, {
            method: 'GET',
        });

        this.logger.log(
            JSON.stringify({
                event: 'billing.provider.status.success',
                providerInvoiceId,
                providerStatus: data?.status,
                durationMs: Date.now() - startedAt,
            }),
        );

        return {
            providerInvoiceId: data.id,
            providerStatus: data.status,
            documentNumber: data.documentNumber,
            accessKey: data.accessKey,
            authorizedAt: data.sriResponse?.authorizedAt,
            rejectedReason: data.errorDetail,
            pdfUrl: this.pickPdfUrl(data),
            xmlUrl: this.pickXmlUrl(data),
            raw: data,
        };
    }

    async getRideUrl(accessKey: string): Promise<DocumentUrlResult> {
        return {
            url: `${this.baseUrl}/v1/documents/ride/${accessKey}`,
            filename: `ride-${accessKey}.pdf`,
        };
    }

    async getXmlUrl(accessKey: string, type: 'authorized' | 'signed' | 'unsigned' = 'authorized'): Promise<DocumentUrlResult> {
        const data = await this.request(`/v1/documents/xml/${accessKey}/${type}`, { method: 'GET' });
        return {
            url: data?.xml ? `data:application/xml;base64,${Buffer.from(data.xml).toString('base64')}` : '',
            filename: data?.filename ?? `${accessKey}-${type}.xml`,
        };
    }

    private pickPdfUrl(data: any): string | undefined {
        return (
            data?.pdfUrl ??
            data?.pdf?.url ??
            data?.documents?.pdf?.url ??
            data?.files?.pdf ??
            undefined
        );
    }

    private pickXmlUrl(data: any): string | undefined {
        return (
            data?.xmlUrl ??
            data?.xml?.url ??
            data?.documents?.xml?.url ??
            data?.files?.xml ??
            undefined
        );
    }

    private async request(path: string, init: RequestInit, credentials?: TenantBillingCredentials): Promise<any> {
        const effectiveKey = credentials?.apiKey || this.apiKey;
        const effectiveSecret = credentials?.apiSecret || this.apiSecret;

        if (!effectiveKey || !effectiveSecret) {
            throw new ServiceUnavailableException('Faltan credenciales de facturación. Configure API Key y API Secret en Ajustes o en variables de entorno.');
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-API-Key': effectiveKey,
                'X-API-Secret': effectiveSecret,
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
                this.logger.warn(
                    JSON.stringify({
                        event: 'billing.provider.http.error',
                        path,
                        status: response.status,
                        message,
                    }),
                );
                throw new BadGatewayException(
                    message ??
                        `Error al consumir proveedor de facturación (HTTP ${response.status})`,
                );
            }

            if (!payload?.success) {
                this.logger.warn(
                    JSON.stringify({
                        event: 'billing.provider.invalid-payload',
                        path,
                    }),
                );
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
                this.logger.warn(
                    JSON.stringify({
                        event: 'billing.provider.timeout',
                        path,
                        timeoutMs: this.timeoutMs,
                    }),
                );
                throw new ServiceUnavailableException(
                    'Timeout al consumir el proveedor de facturación electrónica',
                );
            }

            this.logger.error(
                JSON.stringify({
                    event: 'billing.provider.connection.error',
                    path,
                    message: error?.message,
                }),
            );

            throw new ServiceUnavailableException(
                'No se pudo conectar con el proveedor de facturación electrónica',
            );
        } finally {
            clearTimeout(timeout);
        }
    }
}
