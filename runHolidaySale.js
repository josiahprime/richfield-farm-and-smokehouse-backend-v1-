import { prisma } from "./src/lib/prisma.js";

const runHolidaySale = async () => {
  try {
    console.log("🎄 Starting one-time Holiday Sale setup...");

    const SALE_LABEL = "HOLIDAY_SALE_2025";

    // Check if the sale already exists
    const existing = await prisma.discount.findFirst({
      where: { label: "HOLIDAY_SALE_2025" },
    });


    if (existing) {
      console.log("✅ Holiday Sale already created. Skipping.");
      return;
    }

    // Pick 6 products without discount
    const products = await prisma.product.findMany({
      where: { discountId: null },
      orderBy: { createdAt: "desc" },
      take: 6
    });

    if (products.length === 0) {
      console.log("⚠️ No products available for Holiday Sale.");
      return;
    }

    // Create the holiday discount
    const holidayDiscount = await prisma.discount.create({
      data: {
        label: SALE_LABEL,
        type: "PERCENTAGE",
        value: 30,
        startDate: new Date(),
        endDate: new Date("2025-12-31T23:59:59.000Z"),
        isActive: true
      }
    });

    console.log("✅ Holiday Discount created.");

    // Attach the discount to all selected products
    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { discountId: holidayDiscount.id }
      });

      console.log(`🎁 Applied Holiday Sale to: ${product.productName}`);
    }

    console.log("✅ Holiday Sale setup complete!");

  } catch (err) {
    console.error("❌ Holiday Sale Error:", err);
  } finally {
    await prisma.$disconnect();
  }
};

runHolidaySale();
