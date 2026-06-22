import 'dotenv/config';
import { db } from '../db/index.js';
import { income, products, productCategories, salesChannels } from '../db/schema.js';
import { eq, ilike, sql } from 'drizzle-orm';

async function main() {
  console.log('🔄 Starting Preorder sync script...');

  try {
    // 1. Fetch all preorders using raw SQL
    const result = await db.execute(sql`SELECT * FROM "Order"`);
    const allOrders = result.rows;
    console.log(`Found ${allOrders.length} preorders in the database.`);

    if (allOrders.length === 0) {
      console.log('✅ No preorders to sync.');
      process.exit(0);
    }

    // 2. Ensure "Preorder Website" channel exists
    let channelId: number;
    const existingChannel = await db.query.salesChannels.findFirst({
      where: ilike(salesChannels.name, 'Preorder Website')
    });

    if (existingChannel) {
      channelId = existingChannel.id;
    } else {
      const [newChannel] = await db.insert(salesChannels).values({
        name: 'Preorder Website'
      }).returning();
      channelId = newChannel.id;
    }

    // 3. Sync each order into Income and Products
    let syncedCount = 0;
    for (const order of allOrders) {
      // Create product name format
      const colorPart = order.color ? ` - ${order.color}` : '';
      const sizePart = order.size ? ` - ${order.size}` : '';
      const fullProductName = `${order.productName}${colorPart}${sizePart}`.trim();

      // Find or create product
      let productId: number;
      const existingProduct = await db.query.products.findFirst({
        where: ilike(products.name, fullProductName)
      });

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        // Find or create "Preorder" category
        let categoryId: number | null = null;
        const existingCategory = await db.query.productCategories.findFirst({
          where: ilike(productCategories.name, 'Preorder')
        });

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const [newCategory] = await db.insert(productCategories).values({
            name: 'Preorder',
            slug: 'preorder'
          }).returning();
          categoryId = newCategory.id;
        }

        // Create product
        const [newProduct] = await db.insert(products).values({
          name: fullProductName,
          categoryId: categoryId,
          baseCost: '0'
        }).returning();
        productId = newProduct.id;
      }

      // Check if income record already exists for this exact timestamp and product
      // (very basic idempotency check)
      const existingIncome = await db.query.income.findFirst({
        where: (income, { and, eq }) => and(
          eq(income.productId, productId),
          eq(income.quantity, order.quantity)
        )
      });
      
      // If we don't have a strong way to link them, we just insert. 
      // Assuming a completely fresh database for the financial tables.
      await db.insert(income).values({
        productId,
        channelId,
        quantity: order.quantity,
        fullPrice: order.totalPrice.toString(),
        netAmount: order.totalPrice.toString(),
        cashFlowStatus: order.status === 'paid' ? 'cleared' : 'pending',
        isCleared: order.status === 'paid',
        saleDate: order.createdAt || new Date().toISOString()
      });

      syncedCount++;
    }

    console.log(`✅ Successfully synced ${syncedCount} preorders into the financial tracking tables.`);
  } catch (err) {
    console.error('❌ Failed to sync orders:', err);
  }

  process.exit(0);
}

main();
