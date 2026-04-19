-- Baseline migration for POS core objects.
-- This keeps migration history aligned with environments where POS objects were created manually.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CashRegisterStatus') THEN
        CREATE TYPE "CashRegisterStatus" AS ENUM ('OPEN', 'CLOSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PosTicketStatus') THEN
        CREATE TYPE "PosTicketStatus" AS ENUM ('OPEN', 'COMPLETED', 'REFUNDED', 'PARTIAL_REFUND', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PosItemType') THEN
        CREATE TYPE "PosItemType" AS ENUM ('PRODUCT', 'SERVICE');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "cash_registers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "openedById" TEXT NOT NULL,
    "closedById" TEXT,
    "status" "CashRegisterStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branchId" TEXT,
    "registerId" TEXT,
    "clientId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "providerInvoiceId" TEXT,
    "invoiceStatus" TEXT,
    "invoiceNumber" TEXT,
    "invoiceAccessKey" TEXT,
    "invoiceIssuedAt" TIMESTAMP(3),
    "invoiceAuthorizedAt" TIMESTAMP(3),
    "notes" TEXT,
    "status" "PosTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pos_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_ticket_items" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "type" "PosItemType" NOT NULL,
    "productId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "pos_ticket_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_payments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pos_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pos_refunds" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "refundedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pos_refunds_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "pos_tickets"
    ADD COLUMN IF NOT EXISTS "providerInvoiceId" TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceStatus" TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceAccessKey" TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceIssuedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "invoiceAuthorizedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "cash_registers_tenantId_idx" ON "cash_registers"("tenantId");
CREATE INDEX IF NOT EXISTS "cash_registers_tenantId_status_idx" ON "cash_registers"("tenantId", "status");

CREATE INDEX IF NOT EXISTS "pos_tickets_tenantId_idx" ON "pos_tickets"("tenantId");
CREATE INDEX IF NOT EXISTS "pos_tickets_tenantId_status_idx" ON "pos_tickets"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "pos_tickets_tenantId_clientId_idx" ON "pos_tickets"("tenantId", "clientId");
CREATE INDEX IF NOT EXISTS "pos_tickets_registerId_idx" ON "pos_tickets"("registerId");
CREATE INDEX IF NOT EXISTS "pos_tickets_tenantId_providerInvoiceId_idx" ON "pos_tickets"("tenantId", "providerInvoiceId");

CREATE INDEX IF NOT EXISTS "pos_ticket_items_ticketId_idx" ON "pos_ticket_items"("ticketId");
CREATE INDEX IF NOT EXISTS "pos_payments_ticketId_idx" ON "pos_payments"("ticketId");
CREATE INDEX IF NOT EXISTS "pos_refunds_tenantId_idx" ON "pos_refunds"("tenantId");
CREATE INDEX IF NOT EXISTS "pos_refunds_ticketId_idx" ON "pos_refunds"("ticketId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_tenantId_fkey') THEN
        ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_branchId_fkey') THEN
        ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_branchId_fkey"
            FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_openedById_fkey') THEN
        ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_openedById_fkey"
            FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_registers_closedById_fkey') THEN
        ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_closedById_fkey"
            FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_tickets_tenantId_fkey') THEN
        ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_tickets_branchId_fkey') THEN
        ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_branchId_fkey"
            FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_tickets_registerId_fkey') THEN
        ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_registerId_fkey"
            FOREIGN KEY ("registerId") REFERENCES "cash_registers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_tickets_clientId_fkey') THEN
        ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_tickets_createdById_fkey') THEN
        ALTER TABLE "pos_tickets" ADD CONSTRAINT "pos_tickets_createdById_fkey"
            FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_ticket_items_ticketId_fkey') THEN
        ALTER TABLE "pos_ticket_items" ADD CONSTRAINT "pos_ticket_items_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "pos_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_ticket_items_productId_fkey') THEN
        ALTER TABLE "pos_ticket_items" ADD CONSTRAINT "pos_ticket_items_productId_fkey"
            FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_payments_ticketId_fkey') THEN
        ALTER TABLE "pos_payments" ADD CONSTRAINT "pos_payments_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "pos_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_refunds_ticketId_fkey') THEN
        ALTER TABLE "pos_refunds" ADD CONSTRAINT "pos_refunds_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "pos_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_refunds_tenantId_fkey') THEN
        ALTER TABLE "pos_refunds" ADD CONSTRAINT "pos_refunds_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pos_refunds_refundedById_fkey') THEN
        ALTER TABLE "pos_refunds" ADD CONSTRAINT "pos_refunds_refundedById_fkey"
            FOREIGN KEY ("refundedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END
$$;
