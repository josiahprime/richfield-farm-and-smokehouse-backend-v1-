import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

const cleanExpiredDiscounts = async () => {
  try {
    console.log("🔁 Running expired discount cleanup...");

    // Find all products whose discount endDate has passed
    const expiredProducts = await prisma.product.findMany({
      where: {
        discount: { endDate: { lt: new Date() } },
      },
      include: { discount: true },
    });

    if (!expiredProducts.length) {
      console.log("⚠️ No expired discounts found.");
      return;
    }

    for (const product of expiredProducts) {
      // Remove discount from product
      await prisma.product.update({
        where: { id: product.id },
        data: { discountId: null },
      });

      // Set discount as inactive if it exists
      if (product.discount?.id) {
        await prisma.discount.update({
          where: { id: product.discount.id },
          data: { isActive: false },
        });
      }

      console.log(`✅ Removed expired discount from product ${product.productName}`);
    }
  } catch (err) {
    console.error("❌ Error cleaning expired discounts:", err);
  }
};

// Run once on server start
cleanExpiredDiscounts();

// Schedule to run every hour
cron.schedule("0 * * * *", cleanExpiredDiscounts);
