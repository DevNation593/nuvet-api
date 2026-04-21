import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PosTicketStatus } from '@nuvet/types';
import Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import {
    ELECTRONIC_INVOICE_PROVIDER,
    IElectronicInvoiceProvider,
    ElectronicInvoicePayload,
} from '../domain/electronic-invoice.provider';
import { IssuePosTicketInvoiceDto, InvoiceListFilterDto } from './dto/billing.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../../common/dto/pagination.dto';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);
    private readonly defaultTaxCode: string;
    private readonly defaultIvaRateCode: string;
    private readonly keyMode: 'POINT' | 'COMPANY';
    private readonly defaultEstablishmentCode?: string;
    private readonly defaultEmissionPointCode?: string;
    private readonly defaultAsyncEmission: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        @Inject(ELECTRONIC_INVOICE_PROVIDER)
        private readonly eInvoiceProvider: IElectronicInvoiceProvider,
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
    ) {
        this.defaultTaxCode = this.configService.get<string>('billing.fakturTaxCode') ?? '2';
        this.defaultIvaRateCode = this.configService.get<string>('billing.fakturIvaRateCode') ?? '2';
        this.keyMode = (this.configService.get<string>('billing.fakturKeyMode') ?? 'POINT') as 'POINT' | 'COMPANY';
        this.defaultEstablishmentCode = this.configService.get<string>('billing.fakturEstablishmentCode');
        this.defaultEmissionPointCode = this.configService.get<string>('billing.fakturEmissionPointCode');
        this.defaultAsyncEmission = this.configService.get<boolean>('billing.fakturAsyncEmission') ?? false;
    }

    async listInvoices(
        tenantId: string,
        query: PaginationQueryDto,
        filter: InvoiceListFilterDto,
    ) {
        const { skip, take, page, limit } = buildPaginationArgs(query);

        const where: Record<string, unknown> = {
            tenantId,
            providerInvoiceId: { not: null },
        };

        if (filter.invoiceStatus) {
            where.invoiceStatus = filter.invoiceStatus;
        }

        if (filter.dateFrom || filter.dateTo) {
            const createdAt: Record<string, Date> = {};
            if (filter.dateFrom) createdAt.gte = new Date(filter.dateFrom);
            if (filter.dateTo) {
                const end = new Date(filter.dateTo);
                end.setUTCHours(23, 59, 59, 999);
                createdAt.lte = end;
            }
            where.createdAt = createdAt;
        }

        if (filter.paymentMethod) {
            where.payments = { some: { method: filter.paymentMethod } };
        }

        if (filter.search?.trim()) {
            const term = filter.search.trim();
            where.OR = [
                { invoiceNumber: { contains: term, mode: 'insensitive' } },
                { providerInvoiceId: { contains: term, mode: 'insensitive' } },
                { invoiceAccessKey: { contains: term, mode: 'insensitive' } },
                { client: { firstName: { contains: term, mode: 'insensitive' } } },
                { client: { lastName: { contains: term, mode: 'insensitive' } } },
                { client: { identification: { contains: term, mode: 'insensitive' } } },
            ];
        }

        if (filter.paymentMethod) {
            where.payments = { some: { method: filter.paymentMethod } };
        }

        const [data, total] = await Promise.all([
            (this.prisma.posTicket as any).findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    subtotal: true,
                    discount: true,
                    tax: true,
                    total: true,
                    status: true,
                    providerInvoiceId: true,
                    invoiceStatus: true,
                    invoiceNumber: true,
                    invoiceAccessKey: true,
                    invoiceIssuedAt: true,
                    invoiceAuthorizedAt: true,
                    createdAt: true,
                    notes: true,
                    client: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            identification: true,
                            email: true,
                        },
                    },
                    payments: {
                        select: { method: true, amount: true },
                    },
                    items: {
                        select: {
                            description: true,
                            quantity: true,
                            unitPrice: true,
                            total: true,
                            product: { select: { name: true } },
                        },
                    },
                },
            }),
            (this.prisma.posTicket as any).count({ where }),
        ]);

        const mapped = (data as any[]).map((ticket) => ({
            id: ticket.id,
            subtotal: ticket.subtotal,
            discount: ticket.discount,
            tax: ticket.tax,
            total: ticket.total,
            ticketStatus: ticket.status,
            invoiceStatus: ticket.invoiceStatus,
            invoiceNumber: ticket.invoiceNumber,
            providerInvoiceId: ticket.providerInvoiceId,
            accessKey: ticket.invoiceAccessKey,
            issuedAt: ticket.invoiceIssuedAt,
            authorizedAt: ticket.invoiceAuthorizedAt,
            createdAt: ticket.createdAt,
            notes: ticket.notes,
            client: ticket.client
                ? {
                      name: `${ticket.client.firstName ?? ''} ${ticket.client.lastName ?? ''}`.trim(),
                      identification: ticket.client.identification,
                      email: ticket.client.email,
                  }
                : null,
            paymentMethod: ticket.payments?.[0]?.method ?? 'OTHER',
            items: (ticket.items as any[]).map((item: any) => ({
                description: item.product?.name || item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.total,
            })),
        }));

        return buildPaginatedResponse(mapped, total, page, limit);
    }

    async issueFromPosTicket(
        tenantId: string,
        ticketId: string,
        dto: IssuePosTicketInvoiceDto,
    ) {
        await this.enforceTenantRateLimit(tenantId, 'billing.issue', 20, 60_000);
        const startedAt = Date.now();
        const ticket = (await (this.prisma.posTicket as any).findFirst({
            where: { id: ticketId, tenantId },
            include: {
                items: {
                    include: { product: { select: { name: true } } },
                },
                payments: true,
                client: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        identification: true,
                        email: true,
                    },
                },
            },
        })) as any;

        if (!ticket) {
            throw new NotFoundException('Ticket POS no encontrado');
        }

        if (ticket.status !== PosTicketStatus.COMPLETED) {
            throw new BadRequestException('Solo se puede facturar tickets POS completados');
        }

        if (!ticket.items?.length) {
            throw new BadRequestException('El ticket POS no tiene items para facturar');
        }

        if (!ticket.payments?.length) {
            throw new BadRequestException('El ticket POS no tiene pagos registrados');
        }

        const tenantBilling = await this.getTenantBillingConfig(tenantId);
        const payload = this.buildInvoicePayload(ticket, dto, tenantBilling);
        this.logBillingEvent('billing.issue.request', {
            tenantId,
            ticketId,
            asyncEmission: payload.asyncEmission,
        });
        const result = await this.eInvoiceProvider.issueInvoice(payload, tenantBilling);

        await (this.prisma.posTicket as any).updateMany({
            where: { id: ticketId, tenantId },
            data: {
                providerInvoiceId: result.providerInvoiceId,
                invoiceStatus: result.providerStatus,
                invoiceNumber: result.documentNumber,
                invoiceAccessKey: result.accessKey,
                invoiceAuthorizedAt: result.authorizedAt ? new Date(result.authorizedAt) : null,
                invoiceIssuedAt: new Date(),
            },
        });

        this.logBillingEvent('billing.issue.success', {
            tenantId,
            ticketId,
            providerInvoiceId: result.providerInvoiceId,
            providerStatus: result.providerStatus,
            durationMs: Date.now() - startedAt,
        });

        await this.createAuditLog(tenantId, null, {
            action: 'BILLING_INVOICE_ISSUED',
            entity: 'PosTicket',
            entityId: ticketId,
            newData: {
                providerInvoiceId: result.providerInvoiceId,
                providerStatus: result.providerStatus,
                documentNumber: result.documentNumber,
            },
        });

        if (String(result.providerStatus ?? '').toUpperCase() === 'PENDING') {
            await this.notifyTenantAdmins(
                tenantId,
                'Factura en estado pendiente',
                `La factura del ticket ${ticketId} fue emitida en estado PENDING.`,
                {
                    ticketId,
                    providerInvoiceId: result.providerInvoiceId,
                    providerStatus: result.providerStatus,
                },
            );
        }

        return {
            ticketId,
            invoice: result,
        };
    }

    async getExternalInvoiceStatus(tenantId: string, providerInvoiceId: string) {
        await this.enforceTenantRateLimit(tenantId, 'billing.status', 80, 60_000);
        const startedAt = Date.now();
        if (!providerInvoiceId) {
            throw new NotFoundException('Debe enviar el identificador de factura externa');
        }

        const ticket = await (this.prisma.posTicket as any).findFirst({
            where: { tenantId, providerInvoiceId },
            select: { id: true, invoiceIssuedAt: true },
        });

        if (!ticket) {
            throw new NotFoundException('No existe factura asociada a un ticket del tenant actual');
        }

        const status = await this.syncExternalInvoiceStatus(
            tenantId,
            ticket.id,
            providerInvoiceId,
            startedAt,
        );

        if (
            String(status.providerStatus ?? '').toUpperCase() === 'PENDING' &&
            ticket.invoiceIssuedAt &&
            Date.now() - new Date(ticket.invoiceIssuedAt).getTime() > 10 * 60_000
        ) {
            await this.notifyTenantAdmins(
                tenantId,
                'Factura sigue en estado pendiente',
                `La factura ${providerInvoiceId} continúa en estado PENDING en el proveedor.`,
                {
                    providerInvoiceId,
                    providerStatus: status.providerStatus,
                },
            );
        }

        return status;
    }

    async getExternalInvoiceDocumentUrl(
        tenantId: string,
        providerInvoiceId: string,
        format: 'pdf' | 'xml',
    ) {
        await this.enforceTenantRateLimit(tenantId, `billing.document.${format}`, 60, 60_000);

        const ticket = await (this.prisma.posTicket as any).findFirst({
            where: { tenantId, providerInvoiceId },
            select: { id: true, invoiceAccessKey: true },
        });

        if (!ticket) {
            throw new NotFoundException('No existe factura asociada a un ticket del tenant actual');
        }

        const accessKey = ticket.invoiceAccessKey;

        if (!accessKey) {
            throw new NotFoundException('La factura no tiene clave de acceso. Puede que aún no esté autorizada.');
        }

        let url: string;
        const tenantBilling = await this.getTenantBillingConfig(tenantId);
        if (format === 'pdf') {
            const result = await this.eInvoiceProvider.getRideUrl(accessKey, tenantBilling);
            url = result.url;
        } else {
            const result = await this.eInvoiceProvider.getXmlUrl(accessKey, 'authorized', tenantBilling);
            url = result.url;
        }

        this.logBillingEvent('billing.document.url', {
            tenantId,
            providerInvoiceId,
            format,
            accessKey,
        });

        await this.createAuditLog(tenantId, null, {
            action: 'BILLING_INVOICE_DOCUMENT_REQUESTED',
            entity: 'PosTicket',
            entityId: providerInvoiceId,
            newData: { providerInvoiceId, format },
        });

        return { providerInvoiceId, format, url };
    }

    async getTicketInvoiceStatus(tenantId: string, ticketId: string) {
        const ticket = (await (this.prisma.posTicket as any).findFirst({
            where: { id: ticketId, tenantId },
            select: {
                id: true,
                providerInvoiceId: true,
                invoiceStatus: true,
                invoiceNumber: true,
                invoiceAccessKey: true,
                invoiceAuthorizedAt: true,
                invoiceIssuedAt: true,
            },
        })) as any;

        if (!ticket) {
            throw new NotFoundException('Ticket POS no encontrado');
        }

        if (!ticket.providerInvoiceId) {
            throw new NotFoundException('El ticket POS no tiene factura electrónica asociada');
        }

        const external = await this.syncExternalInvoiceStatus(
            tenantId,
            ticket.id,
            ticket.providerInvoiceId,
            Date.now(),
        );

        return {
            ticketId: ticket.id,
            providerInvoiceId: ticket.providerInvoiceId,
            persisted: {
                status: ticket.invoiceStatus,
                documentNumber: ticket.invoiceNumber,
                accessKey: ticket.invoiceAccessKey,
                issuedAt: ticket.invoiceIssuedAt,
                authorizedAt: ticket.invoiceAuthorizedAt,
            },
            external,
        };
    }

    private async syncExternalInvoiceStatus(
        tenantId: string,
        ticketId: string,
        providerInvoiceId: string,
        startedAt: number,
    ) {
        const tenantBilling = await this.getTenantBillingConfig(tenantId);
        const status = await this.eInvoiceProvider.getInvoiceStatus(providerInvoiceId, tenantBilling);

        await (this.prisma.posTicket as any).updateMany({
            where: { id: ticketId, tenantId },
            data: {
                invoiceStatus: status.providerStatus,
                invoiceNumber: status.documentNumber,
                invoiceAccessKey: status.accessKey,
                invoiceAuthorizedAt: status.authorizedAt ? new Date(status.authorizedAt) : null,
            },
        });

        this.logBillingEvent('billing.status.success', {
            tenantId,
            providerInvoiceId,
            providerStatus: status.providerStatus,
            durationMs: Date.now() - startedAt,
        });

        await this.createAuditLog(tenantId, null, {
            action: 'BILLING_INVOICE_STATUS_CHECKED',
            entity: 'PosTicket',
            entityId: ticketId,
            newData: {
                providerInvoiceId,
                providerStatus: status.providerStatus,
                documentNumber: status.documentNumber,
            },
        });

        return status;
    }

    private logBillingEvent(event: string, payload: Record<string, unknown>) {
        this.logger.log(
            JSON.stringify({
                event,
                ...payload,
            }),
        );
    }

    private async enforceTenantRateLimit(
        tenantId: string,
        action: string,
        limit: number,
        windowMs: number,
    ) {
        const key = `ratelimit:${tenantId}:${action}`;
        const windowSec = Math.ceil(windowMs / 1000);

        const count = await this.redis.incr(key);
        if (count === 1) {
            await this.redis.expire(key, windowSec);
        }

        if (count > limit) {
            throw new HttpException(
                `Límite excedido para ${action}. Intenta nuevamente en unos segundos.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    private async createAuditLog(
        tenantId: string,
        userId: string | null,
        payload: {
            action: string;
            entity: string;
            entityId?: string;
            oldData?: unknown;
            newData?: unknown;
        },
    ) {
        await this.prisma.auditLog.create({
            data: {
                tenantId,
                userId: userId ?? undefined,
                action: payload.action,
                entity: payload.entity,
                entityId: payload.entityId,
                oldData: payload.oldData as any,
                newData: payload.newData as any,
            },
        });
    }

    private async notifyTenantAdmins(
        tenantId: string,
        title: string,
        body: string,
        data?: Record<string, unknown>,
    ) {
        const admins = await this.prisma.user.findMany({
            where: { tenantId, role: 'CLINIC_ADMIN', isActive: true },
            select: { id: true },
            take: 10,
        });

        if (!admins.length) return;

        await this.prisma.notification.createMany({
            data: admins.map((admin) => ({
                tenantId,
                userId: admin.id,
                title,
                body,
                channel: 'IN_APP',
                data: data as any,
            })),
        });
    }

    private async getTenantBillingConfig(tenantId: string) {
        const config = await (this.prisma as any).tenantConfig.findUnique({
            where: { tenantId },
            select: {
                billingApiKey: true,
                billingApiSecret: true,
                billingEstablishmentCode: true,
                billingEmissionPointCode: true,
            },
        });
        return {
            apiKey: config?.billingApiKey || this.configService.get<string>('billing.apiKey'),
            apiSecret: config?.billingApiSecret || this.configService.get<string>('billing.apiSecret'),
            establishmentCode: config?.billingEstablishmentCode || this.defaultEstablishmentCode,
            emissionPointCode: config?.billingEmissionPointCode || this.defaultEmissionPointCode,
        };
    }

    private buildInvoicePayload(
        ticket: any,
        dto: IssuePosTicketInvoiceDto,
        tenantBilling?: { establishmentCode?: string; emissionPointCode?: string },
    ): ElectronicInvoicePayload {
        const buyerTaxId = dto.buyer?.taxId || ticket.client?.identification || '9999999999999';
        const buyerIdType = dto.buyer?.idType ?? this.resolveBuyerIdType(buyerTaxId);
        const buyer = {
            idType: buyerIdType,
            id: buyerTaxId,
            name:
                dto.buyer?.legalName ||
                `${ticket.client?.firstName ?? ''} ${ticket.client?.lastName ?? ''}`.trim() ||
                'Consumidor Final',
            address: dto.buyer?.address,
            email: dto.buyer?.email || ticket.client?.email,
        };

        const items = ticket.items.map((item: any, index: number) => {
            return {
                mainCode: (item.productId ?? `POS-LINE-${index + 1}`).slice(0, 25),
                description: item.product?.name || item.description,
                quantity: +item.quantity,
                unitPrice: +item.unitPrice,
                discount: +(item.discountAmount ?? 0),
                taxes: [
                    {
                        taxCode: this.defaultTaxCode,
                        rateCode: this.defaultIvaRateCode,
                    },
                ],
            };
        });

        const primaryPayment = Array.isArray(ticket.payments) && ticket.payments.length > 0
            ? ticket.payments[0]
            : null;
        const paymentMethodCode = primaryPayment
            ? this.mapPaymentMethodToSriCode(primaryPayment.method)
            : '20';

        const establishmentCode = dto.establishmentCode || tenantBilling?.establishmentCode || this.defaultEstablishmentCode || '001';
        const emissionPointCode = dto.emissionPointCode || tenantBilling?.emissionPointCode || this.defaultEmissionPointCode || '001';

        return {
            internalReference: ticket.id,
            issueDate: dto.issueDate || new Date().toISOString().slice(0, 10),
            establishmentCode,
            emissionPointCode,
            asyncEmission: dto.asyncEmission ?? this.defaultAsyncEmission,
            buyer,
            items,
            paymentMethodCode,
        };
    }

    private resolveBuyerIdType(taxId: string): '04' | '05' | '06' | '07' | '08' {
        if (taxId === '9999999999999') return '07';
        if (/^\d{10}$/.test(taxId)) return '05';
        if (/^\d{13}$/.test(taxId)) return '04';
        return '06';
    }

    /** Maps internal PaymentMethod enum to SRI payment method codes used by Faktur */
    private mapPaymentMethodToSriCode(method: string | null | undefined): string {
        switch (method) {
            case 'CASH':       return '01';
            case 'CARD':       return '19';
            case 'TRANSFER':   return '20';
            default:           return '20';
        }
    }
}
