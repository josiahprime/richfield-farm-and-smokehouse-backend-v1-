import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

async function runDailyDealsJob() {
  console.log("🛠 Running Daily Deals Job");

  try {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // expires at midnight

    // 1️⃣ Fetch products that qualify as daily deals
    const dailyDealProducts = await prisma.product.findMany({
      where: {
        displayLabel: "DAILY_DEAL",
        discount: {
          isActive: true,
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          ],
        },
      },
      include: {
        discount: true,
        images: { select: { url: true, index: true } },
      },
    });

    if (dailyDealProducts.length === 0) {
      console.log("⚠️ No active daily deal products found.");
      return;
    }

    // 2️⃣ Shuffle and select top 10 deals
    const shuffledDeals = dailyDealProducts.sort(() => Math.random() - 0.5);
    const selectedDeals = shuffledDeals.slice(0, 10);

    console.log(`✅ Selected ${selectedDeals.length} daily deals for today.`);

    // 3️⃣ Clear old daily deals
    await prisma.dailyDeal.deleteMany({
      where: { dealDate: { lt: now } },
    });

    // 4️⃣ Save new daily deals to table
    for (const deal of selectedDeals) {
      await prisma.dailyDeal.create({
        data: {
          productId: deal.id,
          dealDate: now,
          expiresAt: tomorrow,
        },
      });
    }

    console.log("💾 Daily deals saved successfully!");
  } catch (err) {
    console.error("❌ Error in Daily Deals Job:", err);
  }
}

// Run once on startup
runDailyDealsJob();

// Run every day at midnight
cron.schedule("0 0 * * *", runDailyDealsJob);
