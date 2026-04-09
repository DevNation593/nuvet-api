-- Add persisted electronic invoice metadata to POS tickets
ALTER TABLE "pos_tickets"
    ADD COLUMN "providerInvoiceId" TEXT,
    ADD COLUMN "invoiceStatus" TEXT,
    ADD COLUMN "invoiceNumber" TEXT,
    ADD COLUMN "invoiceAccessKey" TEXT,
    ADD COLUMN "invoiceIssuedAt" TIMESTAMP(3),
    ADD COLUMN "invoiceAuthorizedAt" TIMESTAMP(3);

CREATE INDEX "pos_tickets_tenantId_providerInvoiceId_idx"
    ON "pos_tickets"("tenantId", "providerInvoiceId");
