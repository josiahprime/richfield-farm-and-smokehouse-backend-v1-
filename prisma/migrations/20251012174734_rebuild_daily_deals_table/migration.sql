/*
  Warnings:

  - The primary key for the `DailyDeal` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `discountPercentage` on the `DailyDeal` table. All the data in the column will be lost.
  - You are about to drop the column `isExpired` on the `DailyDeal` table. All the data in the column will be lost.
  - The `id` column on the `DailyDeal` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `expiresAt` to the `DailyDeal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyDeal" DROP CONSTRAINT "DailyDeal_pkey",
DROP COLUMN "discountPercentage",
DROP COLUMN "isExpired",
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "dealDate" SET DEFAULT CURRENT_TIMESTAMP,
ADD CONSTRAINT "DailyDeal_pkey" PRIMARY KEY ("id");
