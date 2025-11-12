-- CreateTable
CREATE TABLE "DailyTaskTracker" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "lastDiscountRun" TIMESTAMP(3),

    CONSTRAINT "DailyTaskTracker_pkey" PRIMARY KEY ("id")
);
