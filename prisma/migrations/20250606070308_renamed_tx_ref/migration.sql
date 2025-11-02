/*
  Warnings:

  - You are about to drop the column `txRef` on the `Order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[tx_ref]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tx_ref` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Order_txRef_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "txRef",
ADD COLUMN     "tx_ref" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_tx_ref_key" ON "Order"("tx_ref");
