import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, income, expenses, stockAdjustments } from '../db/schema.js';
import { requireRole, auditLog } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/inventory
 *
 * Returns each product with:
 * - product info
 * - totalSold
 * - totalAdjusted
 * - currentStock (null, because frontend calculates it, or we could calculate it)
 */
router.get('/', async (_req, res) => {
  try {
    const allProducts = await db.query.products.findMany({
      with: { category: true },
      orderBy: (products, { asc }) => [asc(products.name)],
    });

    const soldAggregation = await db
      .select({
        productId: income.productId,
        totalSold: sql<number>`COALESCE(SUM(${income.quantity}), 0)`.as('total_sold'),
      })
      .from(income)
      .where(eq(income.isShipped, true))
      .groupBy(income.productId);

    const soldMap = new Map<number, number>();
    for (const row of soldAggregation) {
      soldMap.set(row.productId, Number(row.totalSold));
    }

    const adjustAggregation = await db
      .select({
        productId: stockAdjustments.productId,
        totalAdjusted: sql<number>`COALESCE(SUM(${stockAdjustments.quantity}), 0)`.as('total_adjusted'),
      })
      .from(stockAdjustments)
      .groupBy(stockAdjustments.productId);

    const adjustMap = new Map<number, number>();
    for (const row of adjustAggregation) {
      adjustMap.set(row.productId, Number(row.totalAdjusted));
    }

    const prodExpensesRes = await db
      .select({
        productId: expenses.productId,
        expenseDate: expenses.expenseDate,
      })
      .from(expenses)
      .where(sql`${expenses.productId} IS NOT NULL`);

    const today = new Date();

    const inventory = allProducts.map((product) => {
      const totalSold = soldMap.get(product.id) ?? 0;
      const totalAdjusted = adjustMap.get(product.id) ?? 0;
      
      let daysAged = null;
      const matchingExpenses = prodExpensesRes.filter(e => e.productId === product.id);
      
      if (matchingExpenses.length > 0) {
        const oldestDate = new Date(Math.min(...matchingExpenses.map(e => new Date(e.expenseDate).getTime())));
        daysAged = Math.floor((today.getTime() - oldestDate.getTime()) / (1000 * 3600 * 24));
      }

      return {
        product,
        totalSold,
        totalAdjusted,
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

/**
 * POST /api/inventory/adjust
 */
router.post('/adjust', requireRole(['owner', 'staff']), auditLog('Adjust Stock'), async (req, res) => {
  try {
    const { productId, quantity, reason } = req.body;
    
    if (!productId || typeof quantity !== 'number' || quantity === 0) {
      res.status(400).json({ error: 'Invalid parameters' });
      return;
    }

    const [adjustment] = await db.insert(stockAdjustments).values({
      productId: Number(productId),
      quantity: Number(quantity),
      reason: reason ? String(reason).substring(0, 255) : null,
    }).returning();

    res.status(201).json({ message: 'Stock adjusted successfully', adjustment });
  } catch (err) {
    console.error('Failed to adjust stock:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
