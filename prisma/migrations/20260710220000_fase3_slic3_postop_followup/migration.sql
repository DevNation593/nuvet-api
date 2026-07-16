-- CreateEnum
CREATE TYPE "PostOpPlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PostOpCheckinStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'FLAGGED');

-- CreateTable
CREATE TABLE "postop_plans" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "surgeryId" TEXT,
    "vetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "checkinIntervalDays" INTEGER NOT NULL DEFAULT 2,
    "status" "PostOpPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postop_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postop_checkins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerNote" TEXT,
    "photoUrls" TEXT[],
    "weightKg" DOUBLE PRECISION,
    "appetite" TEXT,
    "energyLevel" TEXT,
    "concernsFlag" BOOLEAN NOT NULL DEFAULT false,
    "vetNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "status" "PostOpCheckinStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postop_checkins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "postop_plans_tenantId_status_idx" ON "postop_plans"("tenantId", "status");

-- CreateIndex
CREATE INDEX "postop_plans_tenantId_petId_idx" ON "postop_plans"("tenantId", "petId");

-- CreateIndex
CREATE INDEX "postop_plans_ownerId_idx" ON "postop_plans"("ownerId");

-- CreateIndex
CREATE INDEX "postop_plans_vetId_idx" ON "postop_plans"("vetId");

-- CreateIndex
CREATE INDEX "postop_plans_surgeryId_idx" ON "postop_plans"("surgeryId");

-- CreateIndex
CREATE INDEX "postop_plans_endDate_idx" ON "postop_plans"("endDate");

-- CreateIndex
CREATE INDEX "postop_checkins_tenantId_idx" ON "postop_checkins"("tenantId");

-- CreateIndex
CREATE INDEX "postop_checkins_planId_idx" ON "postop_checkins"("planId");

-- CreateIndex
CREATE INDEX "postop_checkins_ownerId_idx" ON "postop_checkins"("ownerId");

-- CreateIndex
CREATE INDEX "postop_checkins_status_idx" ON "postop_checkins"("status");

-- CreateIndex
CREATE INDEX "postop_checkins_submittedAt_idx" ON "postop_checkins"("submittedAt");

-- AddForeignKey
ALTER TABLE "postop_plans" ADD CONSTRAINT "postop_plans_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_plans" ADD CONSTRAINT "postop_plans_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_plans" ADD CONSTRAINT "postop_plans_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_plans" ADD CONSTRAINT "postop_plans_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_plans" ADD CONSTRAINT "postop_plans_surgeryId_fkey" FOREIGN KEY ("surgeryId") REFERENCES "surgeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_checkins" ADD CONSTRAINT "postop_checkins_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_checkins" ADD CONSTRAINT "postop_checkins_planId_fkey" FOREIGN KEY ("planId") REFERENCES "postop_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_checkins" ADD CONSTRAINT "postop_checkins_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postop_checkins" ADD CONSTRAINT "postop_checkins_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

