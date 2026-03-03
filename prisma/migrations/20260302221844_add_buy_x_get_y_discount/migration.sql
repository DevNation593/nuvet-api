-- AlterEnum
ALTER TYPE "DiscountType" ADD VALUE 'BUY_X_GET_Y';

-- AlterTable
ALTER TABLE "discounts"
  ALTER COLUMN "value" SET DEFAULT 0,
  ADD COLUMN "buyQuantity" INTEGER,
  ADD COLUMN "getQuantity" INTEGER;
