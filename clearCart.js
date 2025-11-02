// clearCart.js
import { prisma } from "./src/lib/prisma.js";

async function clearCart() {
  try {
    const deleted = await prisma.cartItem.deleteMany({});
    console.log(`🧹 Cleared ${deleted.count} items from cart.`);
  } catch (err) {
    console.error("❌ Error clearing cart:", err);
  } finally {
    await prisma.$disconnect();
  }
}

clearCart();
