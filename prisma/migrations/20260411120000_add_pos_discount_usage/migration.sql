-- Add POS support for discount usage traceability
ALTER TABLE "discount_usages"
ADD COLUMN IF NOT EXISTS "posTicketId" TEXT;

ALTER TABLE "discount_usages"
ALTER COLUMN "orderId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discount_usages_posTicketId_fkey'
  ) THEN
    ALTER TABLE "discount_usages"
    ADD CONSTRAINT "discount_usages_posTicketId_fkey"
    FOREIGN KEY ("posTicketId") REFERENCES "pos_tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "discount_usages_posTicketId_idx"
ON "discount_usages"("posTicketId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'discount_usages_reference_check'
  ) THEN
    ALTER TABLE "discount_usages"
    ADD CONSTRAINT "discount_usages_reference_check"
    CHECK ("orderId" IS NOT NULL OR "posTicketId" IS NOT NULL);
  END IF;
END $$;
