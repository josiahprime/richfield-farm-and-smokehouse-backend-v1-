// scripts/initDailyTracker.js
import { prisma } from "./src/lib/prisma.js";

async function main() {
  try {
    console.log("Creating DailyTaskTracker row...");

    // ensure it doesn't already exist
    const existing = await prisma.dailyTaskTracker.findUnique({
      where: { id: 1 }
    });

    if (existing) {
      console.log("Row already exists. Nothing to do.");
      return;
    }

    await prisma.dailyTaskTracker.create({
      data: {
        id: 1,
        lastDiscountRun: null
      }
    });

    console.log("DailyTaskTracker initialized successfully.");
  } catch (err) {
    console.error("Error creating DailyTaskTracker row:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
