-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "billingApiKey" TEXT,
ADD COLUMN     "billingApiSecret" TEXT,
ADD COLUMN     "billingEmissionPointCode" TEXT DEFAULT '001',
ADD COLUMN     "billingEstablishmentCode" TEXT DEFAULT '001';
