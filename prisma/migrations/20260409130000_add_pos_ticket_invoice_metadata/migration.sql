-- Add persisted electronic invoice metadata to POS tickets.
-- In some environments the POS tables were created outside migrations,
-- so we guard this patch to keep shadow database validation resilient.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'pos_tickets'
    ) THEN
        ALTER TABLE "pos_tickets"
            ADD COLUMN IF NOT EXISTS "providerInvoiceId" TEXT,
            ADD COLUMN IF NOT EXISTS "invoiceStatus" TEXT,
            ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
            ADD COLUMN IF NOT EXISTS "invoiceAccessKey" TEXT,
            ADD COLUMN IF NOT EXISTS "invoiceIssuedAt" TIMESTAMP(3),
            ADD COLUMN IF NOT EXISTS "invoiceAuthorizedAt" TIMESTAMP(3);

        CREATE INDEX IF NOT EXISTS "pos_tickets_tenantId_providerInvoiceId_idx"
            ON "pos_tickets"("tenantId", "providerInvoiceId");
    END IF;
END
$$;
