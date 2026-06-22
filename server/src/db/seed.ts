import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  productCategories,
  expenseCategories,
  salesChannels,
  products,
  settings,
} from './schema.js';

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('🌱 Seeding database...\n');

  // ── Product Categories ──────────────────────────────────
  console.log('  📦 Inserting product categories...');
  const categories = await db
    .insert(productCategories)
    .values([
      { name: 'T-Shirt', slug: 't-shirt' },
      { name: 'Hoodie', slug: 'hoodie' },
      { name: 'Cap', slug: 'cap' },
      { name: 'Tote Bag', slug: 'tote-bag' },
      { name: 'Sticker', slug: 'sticker' },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${categories.length} categories inserted`);

  // ── Expense Categories ──────────────────────────────────
  console.log('  💸 Inserting expense categories...');
  const expCats = await db
    .insert(expenseCategories)
    .values([
      // Production
      { name: 'Blank garment cost', groupName: 'Production' },
      { name: 'Screen printing cost', groupName: 'Production' },
      { name: 'Embroidery cost', groupName: 'Production' },
      { name: 'DTF printing cost', groupName: 'Production' },
      // Packaging
      { name: 'Poly mailer bags', groupName: 'Packaging' },
      { name: 'Boxes / Cartons', groupName: 'Packaging' },
      { name: 'Stickers / Labels', groupName: 'Packaging' },
      { name: 'Thank-you cards', groupName: 'Packaging' },
      // Shipping
      { name: 'Incoming / Purchased goods', groupName: 'Shipping' },
      { name: 'Outgoing / To customer', groupName: 'Shipping' },
      // Fees & Taxes
      { name: 'Platform commission', groupName: 'Fees & Taxes' },
      { name: 'Payment gateway fee', groupName: 'Fees & Taxes' },
      { name: 'Country tax', groupName: 'Fees & Taxes' },
      // Marketing
      { name: 'Social media ads', groupName: 'Marketing' },
      { name: 'Influencer payment', groupName: 'Marketing' },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${expCats.length} expense categories inserted`);

  // ── Sales Channels ──────────────────────────────────────
  console.log('  🛒 Inserting sales channels...');
  const channels = await db
    .insert(salesChannels)
    .values([
      { name: 'Shopee' },
      { name: 'TikTok Shop' },
      { name: 'Lazada' },
      { name: 'LINE Shopping' },
      { name: 'Direct / Walk-in' },
      { name: 'Instagram DM' },
      { name: 'Website' },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${channels.length} sales channels inserted`);

  // ── Products ────────────────────────────────────────────
  console.log('  👕 Inserting sample products...');
  const tshirtCat = categories.find((c) => c.slug === 't-shirt');
  const hoodieCat = categories.find((c) => c.slug === 'hoodie');
  const capCat = categories.find((c) => c.slug === 'cap');

  const prods = await db
    .insert(products)
    .values([
      { name: 'PetMe Classic Tee - Black', categoryId: tshirtCat?.id, baseCost: '120.00' },
      { name: 'PetMe Classic Tee - White', categoryId: tshirtCat?.id, baseCost: '120.00' },
      { name: 'PetMe Oversized Tee - Cream', categoryId: tshirtCat?.id, baseCost: '150.00' },
      { name: 'PetMe Pullover Hoodie - Black', categoryId: hoodieCat?.id, baseCost: '280.00' },
      { name: 'PetMe Pullover Hoodie - Gray', categoryId: hoodieCat?.id, baseCost: '280.00' },
      { name: 'PetMe Dad Cap - Black', categoryId: capCat?.id, baseCost: '85.00' },
    ])
    .onConflictDoNothing()
    .returning();
  console.log(`    ✓ ${prods.length} products inserted`);

  // ── Settings ────────────────────────────────────────────
  console.log('  ⚙️  Inserting default settings...');
  await db
    .insert(settings)
    .values([
      {
        key: 'tax_provision',
        value: { enabled: true, rate: 0.03, label: 'Online Merchant Tax (3%)' },
      },
      {
        key: 'currency',
        value: { code: 'THB', symbol: '฿', locale: 'th-TH' },
      },
    ])
    .onConflictDoNothing();
  console.log('    ✓ Default settings inserted');

  console.log('\n✅ Seed complete!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
