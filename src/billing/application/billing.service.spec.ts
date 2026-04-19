import { NotFoundException } from '@nestjs/common';
import { PosTicketStatus } from '@nuvet/types';
import { BillingService } from './billing.service';

describe('BillingService', () => {
    const configService = {
        get: jest.fn((key: string) => {
            const defaults: Record<string, unknown> = {
                'billing.fakturTaxCode': '2',
                'billing.fakturIvaRateCode': '2',
                'billing.fakturKeyMode': 'POINT',
                'billing.fakturAsyncEmission': false,
            };
            return defaults[key];
        }),
    };

    const posService = {
        findTicket: jest.fn(),
    };

    const prisma = {
        posTicket: {
            findFirst: jest.fn(),
            updateMany: jest.fn(),
        },
        auditLog: {
            create: jest.fn(),
        },
        user: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        notification: {
            createMany: jest.fn(),
        },
    };

    const eInvoiceProvider = {
        issueInvoice: jest.fn(),
        getInvoiceStatus: jest.fn(),
    };

    let service: BillingService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new BillingService(
            configService as never,
            posService as never,
            prisma as never,
            eInvoiceProvider as never,
        );
    });

    it('emite factura desde ticket POS completado', async () => {
        posService.findTicket.mockResolvedValue({
            id: 'ticket-1',
            status: PosTicketStatus.COMPLETED,
            items: [{ description: 'A', quantity: 1, unitPrice: 10, discountAmount: 0 }],
            payments: [{ method: 'CASH', amount: 10 }],
        });
        eInvoiceProvider.issueInvoice.mockResolvedValue({
            providerInvoiceId: 'ext-1',
            providerStatus: 'AUTHORIZED',
            documentNumber: '001-001-000001',
            accessKey: 'AK1',
        });

        const result = await service.issueFromPosTicket('tenant-1', 'ticket-1', {} as never);

        expect(result.ticketId).toBe('ticket-1');
        expect(result.invoice.providerInvoiceId).toBe('ext-1');
        expect(prisma.posTicket.updateMany).toHaveBeenCalled();
    });

    it('devuelve URL de PDF cuando el proveedor la reporta', async () => {
        prisma.posTicket.findFirst.mockResolvedValue({ id: 'ticket-1' });
        eInvoiceProvider.getInvoiceStatus.mockResolvedValue({
            providerInvoiceId: 'ext-1',
            providerStatus: 'AUTHORIZED',
            pdfUrl: 'https://provider.test/invoice.pdf',
        });

        const result = await service.getExternalInvoiceDocumentUrl('tenant-1', 'ext-1', 'pdf');

        expect(result.url).toBe('https://provider.test/invoice.pdf');
        expect(result.format).toBe('pdf');
    });

    it('lanza not found si el proveedor no devuelve XML', async () => {
        prisma.posTicket.findFirst.mockResolvedValue({ id: 'ticket-1' });
        eInvoiceProvider.getInvoiceStatus.mockResolvedValue({
            providerInvoiceId: 'ext-1',
            providerStatus: 'AUTHORIZED',
        });

        await expect(
            service.getExternalInvoiceDocumentUrl('tenant-1', 'ext-1', 'xml'),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});
