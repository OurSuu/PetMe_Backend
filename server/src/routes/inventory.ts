import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, income, expenses } from '../db/schema.js';

const router = Router();

/**
 * GET /api/inventory
 *
 * Returns each product with:
 * - product info (name, category via relation)
 * - totalSold: SUM of income.quantity for that product
 * - currentStock: derived metric (future: add stock-in tracking)
 */
router.get('/', async (_req, res) => {
  try {
    // Fetch all products with their category
    const allProducts = await db.query.products.findMany({
      with: { category: true },
      orderBy: (products, { asc }) => [asc(products.name)],
    });

    // Aggregate sold quantities per product from the income table
    const soldAggregation = await db
      .select({
        productId: income.productId,
        totalSold: sql<number>`COALESCE(SUM(${income.quantity}), 0)`.as('total_sold'),
      })
      .from(income)
      .groupBy(income.productId);

    // Build a lookup map for quick access
    const soldMap = new Map<number, number>();
    for (const row of soldAggregation) {
      soldMap.set(row.productId, Number(row.totalSold));
    }

    // Fetch production expenses to calculate aging (expenses with a productId)
    const prodExpensesRes = await db
      .select({
        productId: expenses.productId,
        expenseDate: expenses.expenseDate,
      })
      .from(expenses)
      .where(sql`${expenses.productId} IS NOT NULL`);

    const today = new Date();

    // Compose the inventory response
    const inventory = allProducts.map((product) => {
      const totalSold = soldMap.get(product.id) ?? 0;
      
      let daysAged = null;
      const matchingExpenses = prodExpensesRes.filter(e => e.productId === product.id);
      
      if (matchingExpenses.length > 0) {
        // Find the oldest production date for this product
        const oldestDate = new Date(Math.min(...matchingExpenses.map(e => new Date(e.expenseDate).getTime())));
        daysAged = Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 3600 * 24));
      }

      return {
        product,
        totalSold,
        currentStock: null as number | null,
        daysAged
      };
    });

    res.json(inventory);
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
