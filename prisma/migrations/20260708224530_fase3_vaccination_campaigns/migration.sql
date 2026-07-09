-- CreateEnum
CREATE TYPE "VaccinationCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VaccinationRegistrationStatus" AS ENUM ('REGISTERED', 'ATTENDED', 'NO_SHOW', 'CANCELLED');

-- CreateTable
CREATE TABLE "vaccination_campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "vaccineName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "capacity" INTEGER,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "VaccinationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccination_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccination_registrations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "status" "VaccinationRegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "attendedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccination_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vaccination_campaigns_tenantId_status_idx" ON "vaccination_campaigns"("tenantId", "status");

-- CreateIndex
CREATE INDEX "vaccination_campaigns_tenantId_startsAt_idx" ON "vaccination_campaigns"("tenantId", "startsAt");

-- CreateIndex
CREATE INDEX "vaccination_registrations_tenantId_idx" ON "vaccination_registrations"("tenantId");

-- CreateIndex
CREATE INDEX "vaccination_registrations_campaignId_status_idx" ON "vaccination_registrations"("campaignId", "status");

-- CreateIndex
CREATE INDEX "vaccination_registrations_petId_idx" ON "vaccination_registrations"("petId");

-- CreateIndex
CREATE INDEX "vaccination_registrations_ownerId_idx" ON "vaccination_registrations"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "vaccination_registrations_campaignId_petId_key" ON "vaccination_registrations"("campaignId", "petId");

-- AddForeignKey
ALTER TABLE "vaccination_campaigns" ADD CONSTRAINT "vaccination_campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_campaigns" ADD CONSTRAINT "vaccination_campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_registrations" ADD CONSTRAINT "vaccination_registrations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "vaccination_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_registrations" ADD CONSTRAINT "vaccination_registrations_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_registrations" ADD CONSTRAINT "vaccination_registrations_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccination_registrations" ADD CONSTRAINT "vaccination_registrations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

