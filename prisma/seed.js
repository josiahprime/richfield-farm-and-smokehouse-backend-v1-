// seed.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

// Needed for __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load JSON from file
const filePath = path.join(__dirname, '../data/shippingFees.json');
const shippingData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

async function main() {
  const insertData = [];

  for (const state in shippingData) {
    const cities = shippingData[state];
    for (const city in cities) {
      insertData.push({
        state,
        city,
        fee: cities[city],
        method: 'standard'
      });
    }
  }

  await prisma.shippingRate.createMany({ data: insertData });

  console.log('✅ Shipping rates seeded successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
