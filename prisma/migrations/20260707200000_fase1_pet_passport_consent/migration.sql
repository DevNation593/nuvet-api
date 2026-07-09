-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentScope" AS ENUM ('PASSPORT_READ', 'MEDICAL_RECORDS_READ');

-- CreateEnum
CREATE TYPE "ConsentAuditAction" AS ENUM ('CREATED', 'GRANTED', 'REVOKED', 'ACCESSED', 'SHARE_CREATED', 'SHARE_REVOKED', 'SHARE_ACCESSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentTokenScope" AS ENUM ('READ', 'FULL');

-- CreateEnum
CREATE TYPE "ConsentTokenStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentAccessAction" AS ENUM ('VALIDATE', 'READ', 'REVOKE');

-- CreateTable
CREATE TABLE "pet_consents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceTenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetTenantId" TEXT NOT NULL,
    "targetClinicName" TEXT,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "scopes" "ConsentScope"[] DEFAULT ARRAY['PASSPORT_READ']::"ConsentScope"[],
    "message" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_consent_shares" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_consent_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet_consent_audits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consentId" TEXT,
    "shareId" TEXT,
    "action" "ConsentAuditAction" NOT NULL,
    "actorUserId" TEXT,
    "actorTenantId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pet_consent_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_tokens" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "granteeEmail" TEXT NOT NULL,
    "granteeTenantId" TEXT,
    "scope" "ConsentTokenScope" NOT NULL DEFAULT 'READ',
    "petIds" TEXT[],
    "status" "ConsentTokenStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "auditReason" TEXT,

    CONSTRAINT "consent_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_access_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consentTokenId" TEXT NOT NULL,
    "accessedByUserId" TEXT NOT NULL,
    "accessedByTenantId" TEXT,
    "action" "ConsentAccessAction" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pet_consents_tenantId_idx" ON "pet_consents"("tenantId");

-- CreateIndex
CREATE INDEX "pet_consents_petId_idx" ON "pet_consents"("petId");

-- CreateIndex
CREATE INDEX "pet_consents_ownerId_idx" ON "pet_consents"("ownerId");

-- CreateIndex
CREATE INDEX "pet_consents_targetTenantId_idx" ON "pet_consents"("targetTenantId");

-- CreateIndex
CREATE INDEX "pet_consents_status_idx" ON "pet_consents"("status");

-- CreateIndex
CREATE INDEX "pet_consents_expiresAt_idx" ON "pet_consents"("expiresAt");

-- CreateIndex
CREATE INDEX "pet_consents_petId_targetTenantId_status_idx" ON "pet_consents"("petId", "targetTenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pet_consent_shares_token_key" ON "pet_consent_shares"("token");

-- CreateIndex
CREATE INDEX "pet_consent_shares_tenantId_idx" ON "pet_consent_shares"("tenantId");

-- CreateIndex
CREATE INDEX "pet_consent_shares_petId_idx" ON "pet_consent_shares"("petId");

-- CreateIndex
CREATE INDEX "pet_consent_shares_ownerId_idx" ON "pet_consent_shares"("ownerId");

-- CreateIndex
CREATE INDEX "pet_consent_shares_expiresAt_idx" ON "pet_consent_shares"("expiresAt");

-- CreateIndex
CREATE INDEX "pet_consent_audits_tenantId_idx" ON "pet_consent_audits"("tenantId");

-- CreateIndex
CREATE INDEX "pet_consent_audits_consentId_idx" ON "pet_consent_audits"("consentId");

-- CreateIndex
CREATE INDEX "pet_consent_audits_shareId_idx" ON "pet_consent_audits"("shareId");

-- CreateIndex
CREATE INDEX "pet_consent_audits_action_idx" ON "pet_consent_audits"("action");

-- CreateIndex
CREATE INDEX "pet_consent_audits_createdAt_idx" ON "pet_consent_audits"("createdAt");

-- CreateIndex
CREATE INDEX "consent_tokens_tenantId_ownerUserId_idx" ON "consent_tokens"("tenantId", "ownerUserId");

-- CreateIndex
CREATE INDEX "consent_tokens_tenantId_granteeEmail_idx" ON "consent_tokens"("tenantId", "granteeEmail");

-- CreateIndex
CREATE INDEX "consent_tokens_tenantId_status_idx" ON "consent_tokens"("tenantId", "status");

-- CreateIndex
CREATE INDEX "consent_tokens_expiresAt_idx" ON "consent_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "consent_access_logs_tenantId_idx" ON "consent_access_logs"("tenantId");

-- CreateIndex
CREATE INDEX "consent_access_logs_consentTokenId_idx" ON "consent_access_logs"("consentTokenId");

-- CreateIndex
CREATE INDEX "consent_access_logs_accessedByUserId_idx" ON "consent_access_logs"("accessedByUserId");

-- CreateIndex
CREATE INDEX "consent_access_logs_tenantId_action_idx" ON "consent_access_logs"("tenantId", "action");

-- CreateIndex
CREATE INDEX "consent_access_logs_createdAt_idx" ON "consent_access_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "pet_consents" ADD CONSTRAINT "pet_consents_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consents" ADD CONSTRAINT "pet_consents_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consents" ADD CONSTRAINT "pet_consents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_shares" ADD CONSTRAINT "pet_consent_shares_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_shares" ADD CONSTRAINT "pet_consent_shares_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_shares" ADD CONSTRAINT "pet_consent_shares_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_audits" ADD CONSTRAINT "pet_consent_audits_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "pet_consents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_audits" ADD CONSTRAINT "pet_consent_audits_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "pet_consent_shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_audits" ADD CONSTRAINT "pet_consent_audits_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet_consent_audits" ADD CONSTRAINT "pet_consent_audits_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_tokens" ADD CONSTRAINT "consent_tokens_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_tokens" ADD CONSTRAINT "consent_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_consentTokenId_fkey" FOREIGN KEY ("consentTokenId") REFERENCES "consent_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_accessedByUserId_fkey" FOREIGN KEY ("accessedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

