import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PosTicketStatus } from '@nuvet/types';
import { PosService } from '../../pos/application/pos.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ELECTRONIC_INVOICE_PROVIDER,
    IElectronicInvoiceProvider,
    ElectronicInvoicePayload,
} from '../domain/electronic-invoice.provider';
import { IssuePosTicketInvoiceDto } from './dto/billing.dto';

@Injectable()
export class BillingService {
    private readonly defaultTaxCode: string;
    private readonly defaultIvaRateCode: string;
    private readonly keyMode: 'POINT' | 'COMPANY';
    private readonly defaultEstablishmentCode?: string;
    private readonly defaultEmissionPointCode?: string;
    private readonly defaultAsyncEmission: boolean;

    constructor(
        private readonly configService: ConfigService,
        private readonly posService: PosService,
        private readonly prisma: PrismaService,
        @Inject(ELECTRONIC_INVOICE_PROVIDER)
        private readonly eInvoiceProvider: IElectronicInvoiceProvider,
    ) {
        this.defaultTaxCode = this.configService.get<string>('billing.fakturTaxCode') ?? '2';
        this.defaultIvaRateCode = this.configService.get<string>('billing.fakturIvaRateCode') ?? '2';
        this.keyMode = (this.configService.get<string>('billing.fakturKeyMode') ?? 'POINT') as 'POINT' | 'COMPANY';
        this.defaultEstablishmentCode = this.configService.get<string>('billing.fakturEstablishmentCode');
        this.defaultEmissionPointCode = this.configService.get<string>('billing.fakturEmissionPointCode');
        this.defaultAsyncEmission = this.configService.get<boolean>('billing.fakturAsyncEmission') ?? false;
    }

    async issueFromPosTicket(
        tenantId: string,
        ticketId: string,
        dto: IssuePosTicketInvoiceDto,
    ) {
        const ticket = (await this.posService.findTicket(tenantId, ticketId)) as any;

        if (ticket.status !== PosTicketStatus.COMPLETED) {
            throw new BadRequestException('Solo se puede facturar tickets POS completados');
        }

        if (!ticket.items?.length) {
            throw new BadRequestException('El ticket POS no tiene items para facturar');
        }

        if (!ticket.payments?.length) {
            throw new BadRequestException('El ticket POS no tiene pagos registrados');
        }

        const payload = this.buildInvoicePayload(ticket, dto);
        const result = await this.eInvoiceProvider.issueInvoice(payload);

        await this.prisma.posTicket.updateMany({
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

        return {
            ticketId,
            invoice: result,
        };
    }

    async getExternalInvoiceStatus(tenantId: string, providerInvoiceId: string) {
        if (!providerInvoiceId) {
            throw new NotFoundException('Debe enviar el identificador de factura externa');
        }

        const ticket = await this.prisma.posTicket.findFirst({
            where: { tenantId, providerInvoiceId },
            select: { id: true },
        });

        if (!ticket) {
            throw new NotFoundException('No existe factura asociada a un ticket del tenant actual');
        }

        const status = await this.eInvoiceProvider.getInvoiceStatus(providerInvoiceId);

        await this.prisma.posTicket.updateMany({
            where: { id: ticket.id, tenantId },
            data: {
                invoiceStatus: status.providerStatus,
                invoiceNumber: status.documentNumber,
                invoiceAccessKey: status.accessKey,
                invoiceAuthorizedAt: status.authorizedAt ? new Date(status.authorizedAt) : null,
            },
        });

        return status;
    }

    async getTicketInvoiceStatus(tenantId: string, ticketId: string) {
        const ticket = await this.prisma.posTicket.findFirst({
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
        });

        if (!ticket) {
            throw new NotFoundException('Ticket POS no encontrado');
        }

        if (!ticket.providerInvoiceId) {
            throw new NotFoundException('El ticket POS no tiene factura electrónica asociada');
        }

        const external = await this.getExternalInvoiceStatus(tenantId, ticket.providerInvoiceId);

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

    private buildInvoicePayload(
        ticket: any,
        dto: IssuePosTicketInvoiceDto,
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
                mainCode: item.productId ?? `POS-LINE-${index + 1}`,
                description: item.description,
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

        const payments = Array.isArray(ticket.payments)
            ? ticket.payments
                  .filter((payment: any) => Number(payment.amount) > 0)
                  .map((payment: any) => ({
                      method: String(payment.method ?? 'OTHER'),
                      amount: +payment.amount,
                      reference: payment.reference ? String(payment.reference) : undefined,
                  }))
            : undefined;

        const establishmentCode = dto.establishmentCode ?? this.defaultEstablishmentCode;
        const emissionPointCode = dto.emissionPointCode ?? this.defaultEmissionPointCode;

        if (this.keyMode === 'COMPANY' && (!establishmentCode || !emissionPointCode)) {
            throw new BadRequestException(
                'Con API Key tipo COMPANY debes enviar establishmentCode y emissionPointCode (3 dígitos)',
            );
        }

        return {
            internalReference: ticket.id,
            issueDate: new Date().toISOString().slice(0, 10),
            establishmentCode,
            emissionPointCode,
            asyncEmission: dto.asyncEmission ?? this.defaultAsyncEmission,
            buyer,
            items,
            payments,
        };
    }

    private resolveBuyerIdType(taxId: string): '04' | '05' | '06' | '07' | '08' {
        if (taxId === '9999999999999') return '07';
        if (/^\d{10}$/.test(taxId)) return '05';
        if (/^\d{13}$/.test(taxId)) return '04';
        return '06';
    }
}
