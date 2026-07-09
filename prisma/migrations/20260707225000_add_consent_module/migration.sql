-- Migration: add_consent_module
-- Fase 2 del módulo consent/: tokens emitidos por email a terceros autorizados.
-- Complementa pet_consents (clinic-to-clinic) y pet_consent_shares (link público).
-- Sólo cambios aditivos: 3 enums, 2 tablas, índices, FKs. Sin backfill.

-- CreateEnum
CREATE TYPE "ConsentTokenScope" AS ENUM ('READ', 'FULL');

-- CreateEnum
CREATE TYPE "ConsentTokenStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConsentAccessAction" AS ENUM ('VALIDATE', 'READ', 'REVOKE');

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
ALTER TABLE "consent_tokens" ADD CONSTRAINT "consent_tokens_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_tokens" ADD CONSTRAINT "consent_tokens_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_consentTokenId_fkey" FOREIGN KEY ("consentTokenId") REFERENCES "consent_tokens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_access_logs" ADD CONSTRAINT "consent_access_logs_accessedByUserId_fkey" FOREIGN KEY ("accessedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DOWN: comandos inversos documentados (rollback completo, drop en orden inverso).
-- Esta migración es puramente aditiva (sin DEFAULT peligroso ni cambio de tipo), por lo que
-- un rollback es seguro siempre que no haya filas que dependan de ella (FKs CASCADE).
-- 1) DROP TABLE "consent_access_logs";
-- 2) DROP TABLE "consent_tokens";
-- 3) DROP TYPE "ConsentAccessAction";
-- 4) DROP TYPE "ConsentTokenStatus";
-- 5) DROP TYPE "ConsentTokenScope";
-- Orden de drop: primero las tablas hijas (consent_access_logs → consent_tokens) porque ambas
-- tienen FK hacia parents existentes (users, tenants); las tablas se dropean en orden inverso
-- a su creación. Los TYPEs PostgreSQL se dropean al final (no se referencian tras drop de tablas).
-- NOTA: este bloque DOWN es documentación. No se ejecuta automáticamente; aplicar manualmente
-- sólo si la migración debe revertirse antes de que haya datos productivos en estas tablas.