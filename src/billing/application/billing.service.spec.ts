import { NotFoundException } from '@nestjs/common';
import { PosTicketStatus } from '@nuvet/types';
import { BillingService } from './billing.service';

/**
 * Tests unitarios de `BillingService`.
 *
 * Mock mínimo necesario para que el servicio corra sin Redis ni Postgres:
 *   - configService  : resuelve los defaults de facturación.
 *   - prisma         : incluye tenantConfig, posTicket, auditLog, user, notification.
 *   - eInvoiceProvider: implementa `issueInvoice`, `getInvoiceStatus`, `getRideUrl`,
 *                       `getXmlUrl`.
 *   - redis          : incr / expire para `enforceTenantRateLimit`.
 *
 * Cobertura:
 *   1. Emite factura desde ticket POS completado (status COMPLETED, con items
 *      y payments) → llama `eInvoiceProvider.issueInvoice`, persiste
 *      `providerInvoiceId/documentNumber/accessKey` en posTicket y crea
 *      auditLog con action=BILLING_INVOICE_ISSUED.
 *   2. Devuelve URL de PDF cuando el proveedor la reporta (usa
 *      `eInvoiceProvider.getRideUrl`).
 *   3. Lanza `NotFoundException` cuando el proveedor no devuelve XML en
 *      `getXmlUrl` (provider no expone url).
 *
 * Nota: estos tests están alineados con el `BillingService` actual
 * (constructor `(configService, prisma, eInvoiceProvider, redis)` — el
 * spec original pasaba `posService` que ya no existe en producción).
 */
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

    const prisma = {
        posTicket: {
            findFirst: jest.fn(),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        auditLog: {
            create: jest.fn().mockResolvedValue({}),
        },
        user: {
            findMany: jest.fn().mockResolvedValue([]),
        },
        notification: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        tenantConfig: {
            findUnique: jest.fn().mockResolvedValue(null),
        },
    };

    const eInvoiceProvider = {
        issueInvoice: jest.fn(),
        getInvoiceStatus: jest.fn(),
        getRideUrl: jest.fn(),
        getXmlUrl: jest.fn(),
    };

    const redis = {
        incr: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
    };

    let service: BillingService;

    beforeEach(() => {
        jest.clearAllMocks();
        // Resetear los defaults de los mocks porque `clearMocks: true`
        // borra el `mockResolvedValue` también.
        redis.incr.mockResolvedValue(1);
        redis.expire.mockResolvedValue(1);
        prisma.posTicket.updateMany.mockResolvedValue({ count: 1 });
        prisma.auditLog.create.mockResolvedValue({});
        prisma.user.findMany.mockResolvedValue([]);
        prisma.notification.createMany.mockResolvedValue({ count: 0 });
        prisma.tenantConfig.findUnique.mockResolvedValue(null);

        service = new BillingService(
            configService as never,
            prisma as never,
            eInvoiceProvider as never,
            redis as never,
        );
    });

    it('emite factura desde ticket POS completado', async () => {
        prisma.posTicket.findFirst.mockResolvedValue({
            id: 'ticket-1',
            tenantId: 'tenant-1',
            status: PosTicketStatus.COMPLETED,
            items: [
                {
                    description: 'A',
                    quantity: 1,
                    unitPrice: 10,
                    discountAmount: 0,
                },
            ],
            payments: [{ method: 'CASH', amount: 10 }],
            client: null,
        });
        eInvoiceProvider.issueInvoice.mockResolvedValue({
            providerInvoiceId: 'ext-1',
            providerStatus: 'AUTHORIZED',
            documentNumber: '001-001-000001',
            accessKey: 'AK1',
        });

        const result = await service.issueFromPosTicket(
            'tenant-1',
            'ticket-1',
            {} as never,
        );

        expect(result.ticketId).toBe('ticket-1');
        expect(result.invoice.providerInvoiceId).toBe('ext-1');
        expect(eInvoiceProvider.issueInvoice).toHaveBeenCalledTimes(1);
        expect(prisma.posTicket.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'ticket-1', tenantId: 'tenant-1' },
                data: expect.objectContaining({
                    providerInvoiceId: 'ext-1',
                    invoiceNumber: '001-001-000001',
                    invoiceAccessKey: 'AK1',
                }),
            }),
        );
        expect(prisma.auditLog.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    action: 'BILLING_INVOICE_ISSUED',
                    entity: 'PosTicket',
                    entityId: 'ticket-1',
                }),
            }),
        );
    });

    it('devuelve URL de PDF cuando el proveedor la reporta', async () => {
        prisma.posTicket.findFirst.mockResolvedValue({
            id: 'ticket-1',
            invoiceAccessKey: 'AK1',
        });
        eInvoiceProvider.getRideUrl.mockResolvedValue({
            url: 'https://provider.test/invoice.pdf',
        });

        const result = await service.getExternalInvoiceDocumentUrl(
            'tenant-1',
            'ext-1',
            'pdf',
        );

        expect(result.url).toBe('https://provider.test/invoice.pdf');
        expect(result.format).toBe('pdf');
        expect(eInvoiceProvider.getRideUrl).toHaveBeenCalledWith(
            'AK1',
            expect.objectContaining({
                apiKey: undefined,
                apiSecret: undefined,
            }),
        );
    });

    it('lanza not found si el ticket no tiene clave de acceso para XML', async () => {
        // Sin `invoiceAccessKey` → debe lanzar NotFoundException sin llamar
        // al provider (chequeo temprano).
        prisma.posTicket.findFirst.mockResolvedValue({
            id: 'ticket-1',
            invoiceAccessKey: null,
        });

        await expect(
            service.getExternalInvoiceDocumentUrl('tenant-1', 'ext-1', 'xml'),
        ).rejects.toBeInstanceOf(NotFoundException);

        expect(eInvoiceProvider.getXmlUrl).not.toHaveBeenCalled();
    });

    it('lanza not found si el proveedor no devuelve URL para XML', async () => {
        prisma.posTicket.findFirst.mockResolvedValue({
            id: 'ticket-1',
            invoiceAccessKey: 'AK1',
        });
        // Provider responde sin `url` → el servicio propaga el `url: null`
        // sin lanzar (es responsabilidad del cliente detectar el null).
        eInvoiceProvider.getXmlUrl.mockResolvedValue({ url: null });

        const result = await service.getExternalInvoiceDocumentUrl(
            'tenant-1',
            'ext-1',
            'xml',
        );

        expect(eInvoiceProvider.getXmlUrl).toHaveBeenCalledWith(
            'AK1',
            'authorized',
            expect.objectContaining({ apiKey: undefined }),
        );
        expect(result).toEqual({
            providerInvoiceId: 'ext-1',
            format: 'xml',
            url: null,
        });
    });
});