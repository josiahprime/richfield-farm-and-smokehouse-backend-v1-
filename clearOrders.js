import { prisma } from "./src/lib/prisma.js";

async function main() {
  await prisma.order.deleteMany({});
  console.log('✅ All orders deleted.');
}

main()
  .catch((e) => {
    console.error('❌ Error deleting orders:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
