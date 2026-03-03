-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "DiscountTargetType" AS ENUM ('PRODUCT', 'PRODUCT_CATEGORY', 'SERVICE', 'ALL_PRODUCTS', 'ALL_SERVICES');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "targetType" "DiscountTargetType" NOT NULL,
    "targetId" TEXT,
    "category" TEXT,
    "serviceType" TEXT,
    "minAmount" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_usages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discountId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "savedAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discounts_tenantId_idx" ON "discounts"("tenantId");

-- CreateIndex
CREATE INDEX "discounts_tenantId_startAt_idx" ON "discounts"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "discounts_tenantId_isActive_idx" ON "discounts"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "discount_usages_tenantId_idx" ON "discount_usages"("tenantId");

-- CreateIndex
CREATE INDEX "discount_usages_discountId_idx" ON "discount_usages"("discountId");

-- CreateIndex
CREATE INDEX "discount_usages_orderId_idx" ON "discount_usages"("orderId");

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "discounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
