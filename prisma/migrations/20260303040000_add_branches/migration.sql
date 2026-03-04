-- ─── Sucursales (Branches) ────────────────────────────────────────────────────
-- Migration: add_branches
-- Adds the Branch model and branchId to related models

-- CreateTable
CREATE TABLE "branches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- AddColumn: branchId to users
ALTER TABLE "users" ADD COLUMN "branchId" TEXT;

-- AddColumn: branchId to appointments
ALTER TABLE "appointments" ADD COLUMN "branchId" TEXT;

-- AddColumn: branchId to clinic_hours
ALTER TABLE "clinic_hours" ADD COLUMN "branchId" TEXT;

-- AddColumn: branchId to staff_schedules
ALTER TABLE "staff_schedules" ADD COLUMN "branchId" TEXT;

-- AddColumn: branchId to blocks
ALTER TABLE "blocks" ADD COLUMN "branchId" TEXT;

-- AddColumn: branchId to holidays
ALTER TABLE "holidays" ADD COLUMN "branchId" TEXT;

-- CreateIndex: branches
CREATE INDEX "branches_tenantId_idx" ON "branches"("tenantId");
CREATE INDEX "branches_tenantId_isActive_idx" ON "branches"("tenantId", "isActive");

-- CreateIndex: branchId on related tables
CREATE INDEX "users_branchId_idx" ON "users"("branchId");
CREATE INDEX "appointments_branchId_idx" ON "appointments"("branchId");
CREATE INDEX "clinic_hours_branchId_idx" ON "clinic_hours"("branchId");
CREATE INDEX "staff_schedules_branchId_idx" ON "staff_schedules"("branchId");
CREATE INDEX "blocks_branchId_idx" ON "blocks"("branchId");
CREATE INDEX "holidays_branchId_idx" ON "holidays"("branchId");

-- DropIndex (old unique constraints replaced by branch-aware ones)
DROP INDEX "clinic_hours_tenantId_dayOfWeek_key";
DROP INDEX "staff_schedules_tenantId_userId_dayOfWeek_key";
DROP INDEX "holidays_tenantId_date_key";

-- CreateIndex (new unique constraints)
CREATE UNIQUE INDEX "clinic_hours_tenantId_branchId_dayOfWeek_key" ON "clinic_hours"("tenantId", "branchId", "dayOfWeek");
CREATE UNIQUE INDEX "staff_schedules_tenantId_branchId_userId_dayOfWeek_key" ON "staff_schedules"("tenantId", "branchId", "userId", "dayOfWeek");
CREATE UNIQUE INDEX "holidays_tenantId_branchId_date_key" ON "holidays"("tenantId", "branchId", "date");

-- AddForeignKey
ALTER TABLE "branches" ADD CONSTRAINT "branches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinic_hours" ADD CONSTRAINT "clinic_hours_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
