import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

const refreshPopularProducts = async () => {
  console.log("🔁 Refreshing popular products...");

  try {
    // Fetch a larger pool of products to shuffle
    const products = await prisma.product.findMany({
      take: 50, // pool size (adjust as needed)
    });

    if (products.length === 0) {
      console.log("⚠️ No products found to refresh.");
      return;
    }

    // Shuffle and select top 10
    const shuffled = products.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    const selectedIds = selected.map((p) => p.id);

    // Atomic transaction
    await prisma.$transaction([
      // Mark selected as popular
      prisma.product.updateMany({
        where: { id: { in: selectedIds } },
        data: {
          isPopular: true,
          popularAt: new Date(),
        },
      }),
      // Mark others as not popular
      prisma.product.updateMany({
        where: { id: { notIn: selectedIds } },
        data: {
          isPopular: false,
          popularAt: null,
        },
      }),
    ]);

    console.log("✅ Popular products refreshed.");
  } catch (err) {
    console.error("❌ Error refreshing popular products:", err);
  }
};

// Run once at startup
refreshPopularProducts();


cron.schedule("0 0 * * *", refreshPopularProducts);
