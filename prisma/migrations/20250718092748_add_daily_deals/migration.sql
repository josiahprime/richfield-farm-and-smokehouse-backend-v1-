-- CreateTable
CREATE TABLE "DailyDeal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "dealDate" TIMESTAMP(3) NOT NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyDeal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DailyDeal" ADD CONSTRAINT "DailyDeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
