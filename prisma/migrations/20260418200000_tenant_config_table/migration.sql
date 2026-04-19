-- CreateTable
CREATE TABLE "tenant_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billingApiKey" TEXT,
    "billingApiSecret" TEXT,
    "billingEstablishmentCode" TEXT DEFAULT '001',
    "billingEmissionPointCode" TEXT DEFAULT '001',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_configs_tenantId_key" ON "tenant_configs"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_configs" ADD CONSTRAINT "tenant_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data from tenants to tenant_configs
INSERT INTO "tenant_configs" ("id", "tenantId", "billingApiKey", "billingApiSecret", "billingEstablishmentCode", "billingEmissionPointCode", "updatedAt")
SELECT gen_random_uuid(), "id", "billingApiKey", "billingApiSecret", "billingEstablishmentCode", "billingEmissionPointCode", NOW()
FROM "tenants"
WHERE "billingApiKey" IS NOT NULL OR "billingApiSecret" IS NOT NULL;

-- AlterTable - drop old columns
ALTER TABLE "tenants" DROP COLUMN IF EXISTS "billingApiKey",
DROP COLUMN IF EXISTS "billingApiSecret",
DROP COLUMN IF EXISTS "billingEstablishmentCode",
DROP COLUMN IF EXISTS "billingEmissionPointCode";
