import { Module } from '@nestjs/common';
import { BillingController } from './infrastructure/http/billing.controller';
import { BillingService } from './application/billing.service';
import { PosModule } from '../pos/pos.module';
import { ELECTRONIC_INVOICE_PROVIDER } from './domain/electronic-invoice.provider';
import { ElectronicInvoiceHttpProvider } from './infrastructure/external/electronic-invoice-http.provider';

@Module({
    imports: [PosModule],
    controllers: [BillingController],
    providers: [
        BillingService,
        {
            provide: ELECTRONIC_INVOICE_PROVIDER,
            useClass: ElectronicInvoiceHttpProvider,
        },
    ],
    exports: [BillingService],
})
export class BillingModule {}
