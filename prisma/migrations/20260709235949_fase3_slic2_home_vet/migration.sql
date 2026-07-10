-- CreateEnum
CREATE TYPE "HomeVetBookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "home_vet_bookings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "vetId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "addressNotes" TEXT,
    "reason" TEXT NOT NULL,
    "status" "HomeVetBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "visitFeeCents" INTEGER NOT NULL DEFAULT 0,
    "travelFeeCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "visitNotes" TEXT,
    "diagnosis" TEXT,
    "internalNotes" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_vet_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "home_vet_bookings_tenantId_idx" ON "home_vet_bookings"("tenantId");

-- CreateIndex
CREATE INDEX "home_vet_bookings_tenantId_status_idx" ON "home_vet_bookings"("tenantId", "status");

-- CreateIndex
CREATE INDEX "home_vet_bookings_tenantId_scheduledAt_idx" ON "home_vet_bookings"("tenantId", "scheduledAt");

-- CreateIndex
CREATE INDEX "home_vet_bookings_ownerId_idx" ON "home_vet_bookings"("ownerId");

-- CreateIndex
CREATE INDEX "home_vet_bookings_petId_idx" ON "home_vet_bookings"("petId");

-- CreateIndex
CREATE INDEX "home_vet_bookings_vetId_idx" ON "home_vet_bookings"("vetId");

-- AddForeignKey
ALTER TABLE "home_vet_bookings" ADD CONSTRAINT "home_vet_bookings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_vet_bookings" ADD CONSTRAINT "home_vet_bookings_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_vet_bookings" ADD CONSTRAINT "home_vet_bookings_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "home_vet_bookings" ADD CONSTRAINT "home_vet_bookings_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

