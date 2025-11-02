/*
  Warnings:

  - The values [outForDelivery] on the enum `FulfillmentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FulfillmentStatus_new" AS ENUM ('Processing', 'Shipped', 'OutForDelivery', 'Delivered');
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" TYPE "FulfillmentStatus_new" USING ("fulfillmentStatus"::text::"FulfillmentStatus_new");
ALTER TYPE "FulfillmentStatus" RENAME TO "FulfillmentStatus_old";
ALTER TYPE "FulfillmentStatus_new" RENAME TO "FulfillmentStatus";
DROP TYPE "FulfillmentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'Processing';
COMMIT;
