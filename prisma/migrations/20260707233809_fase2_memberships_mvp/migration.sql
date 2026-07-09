-- CreateEnum
CREATE TYPE "MembershipBillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "MembershipSubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED', 'PAST_DUE');

-- CreateEnum
CREATE TYPE "BillingAttemptStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "BillingProviderKind" AS ENUM ('MOCK', 'STRIPE', 'PAYPHONE');

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingPeriod" "MembershipBillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "includedBenefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicableSpecies" "PetSpecies"[] DEFAULT ARRAY[]::"PetSpecies"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceTenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "MembershipSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingAt" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethodToken" TEXT,
    "canceledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "lastChargedAt" TIMESTAMP(3),
    "lastChargeTxId" TEXT,
    "providerKind" "BillingProviderKind" NOT NULL DEFAULT 'MOCK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_attempts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" "BillingProviderKind" NOT NULL,
    "transactionId" TEXT,
    "status" "BillingAttemptStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_plans_tenantId_isActive_idx" ON "membership_plans"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tenantId_slug_key" ON "membership_plans"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "membership_subscriptions_tenantId_idx" ON "membership_subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "membership_subscriptions_sourceTenantId_idx" ON "membership_subscriptions"("sourceTenantId");

-- CreateIndex
CREATE INDEX "membership_subscriptions_ownerId_idx" ON "membership_subscriptions"("ownerId");

-- CreateIndex
CREATE INDEX "membership_subscriptions_status_idx" ON "membership_subscriptions"("status");

-- CreateIndex
CREATE INDEX "membership_subscriptions_nextBillingAt_idx" ON "membership_subscriptions"("nextBillingAt");

-- CreateIndex
CREATE UNIQUE INDEX "membership_subscriptions_petId_planId_key" ON "membership_subscriptions"("petId", "planId");

-- CreateIndex
CREATE INDEX "billing_attempts_tenantId_idx" ON "billing_attempts"("tenantId");

-- CreateIndex
CREATE INDEX "billing_attempts_subscriptionId_idx" ON "billing_attempts"("subscriptionId");

-- CreateIndex
CREATE INDEX "billing_attempts_status_idx" ON "billing_attempts"("status");

-- CreateIndex
CREATE INDEX "billing_attempts_createdAt_idx" ON "billing_attempts"("createdAt");

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership_subscriptions" ADD CONSTRAINT "membership_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_attempts" ADD CONSTRAINT "billing_attempts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_attempts" ADD CONSTRAINT "billing_attempts_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "membership_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

