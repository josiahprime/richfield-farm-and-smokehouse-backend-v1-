-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "displayLabel" TEXT,
ADD COLUMN     "isVariableWeight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minOrderQuantity" DOUBLE PRECISION,
ADD COLUMN     "unitType" TEXT NOT NULL DEFAULT 'piece';
