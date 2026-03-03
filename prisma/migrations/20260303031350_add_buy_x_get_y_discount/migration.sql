-- AlterEnum
ALTER TYPE "DiscountType" ADD VALUE 'BUY_X_GET_Y';

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "buyQuantity" INTEGER,
ADD COLUMN     "getQuantity" INTEGER,
ALTER COLUMN "value" SET DEFAULT 0;
