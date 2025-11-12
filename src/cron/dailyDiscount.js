import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

const assignDailyDiscounts = async () => {
  try {
    console.log("🔁 Running daily discount assignment...");

    const today = new Date().toISOString().slice(0, 10);

    // Check last run
    // const tracker = await prisma.dailyTaskTracker.findFirst(); 
    const tracker = await prisma.dailyTaskTracker.findUnique({
      where: { id: 1 }
    });


    if (tracker?.lastDiscountRun?.toISOString().slice(0, 10) === today) {
      console.log("✅ Daily discounts already assigned today. Skipping.");
      return;
    }

    // Pick 5–6 random products that currently don't have a discount
    const products = await prisma.product.findMany({
      where: { discountId: null },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    if (!products.length) {
      console.log("⚠️ No eligible products found for discounts today.");
      return;
    }

    for (const product of products) {
      const label = `DAILY_${today}_${product.id.slice(0, 6)}`;
      const discountValue = Math.floor(Math.random() * 21) + 5;

      const discount = await prisma.discount.create({
        data: {
          label,
          type: "PERCENTAGE",
          value: discountValue,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isActive: true,
          products: { connect: { id: product.id } },
        },
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { discountId: discount.id },
      });

      console.log(`✅ Discount ${discount.label} applied to ${product.productName}`);
    }

    // Update task tracker
    await prisma.dailyTaskTracker.update({
      where: { id: tracker.id },
      data: { lastDiscountRun: new Date() },
    });

  } catch (err) {
    console.error("❌ Error assigning daily discounts:", err);
  }
};


// Run once on server start
assignDailyDiscounts();

// Schedule to run every day at midnight
cron.schedule("0 0 * * *", assignDailyDiscounts);
