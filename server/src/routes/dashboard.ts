import { Router } from 'express';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  income,
  expenses,
  products,
  productCategories,
  settings,
} from '../db/schema.js';

const router = Router();

// ============================================================
// Helpers
// ============================================================

/**
 * Resolve start / end dates from the `period` or explicit date range.
 */
function resolveDateRange(query: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): { start: string; end: string } {
  const now = new Date();
  let start: string;
  let end: string = now.toISOString().slice(0, 10); // YYYY-MM-DD

  switch (query.period) {
    case 'today':
      start = end;
      break;
    case 'week': {
      const day = now.getDay(); // 0=Sun
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(now);
      monday.setDate(diff);
      start = monday.toISOString().slice(0, 10);
      break;
    }
    case 'month':
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    case 'year':
      start = `${now.getFullYear()}-01-01`;
      break;
    case 'custom':
      start = query.startDate ?? end;
      end = query.endDate ?? end;
      break;
    default:
      // No period specified — default to current month
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      break;
  }

  return { start, end };
}

// ============================================================
// GET /api/dashboard
// ============================================================

router.get('/', async (req, res) => {
  try {
    const { start, end } = resolveDateRange(req.query as any);

    // ── Revenue aggregation ─────────────────────────────────
    const [revenueRow] = await db
      .select({
        totalRevenue: sql<string>`COALESCE(SUM(${income.netAmount}), 0)`,
        totalDiscounts: sql<string>`COALESCE(SUM(${income.discountAmount}), 0)`,
      })
      .from(income)
      .where(and(gte(income.saleDate, start), lte(income.saleDate, end), eq(income.isRefunded, false)));

    const totalRevenue = Number(revenueRow.totalRevenue);
    const totalDiscounts = Number(revenueRow.totalDiscounts);

    // ── Expenses aggregation ────────────────────────────────
    const [expenseRow] = await db
      .select({
        totalExpenses: sql<string>`COALESCE(SUM(${expenses.amount} * ${expenses.quantity}), 0)`,
      })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)));

    const totalExpenses = Number(expenseRow.totalExpenses);

    // ── Profit calculations ─────────────────────────────────
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // ── Tax provision from settings ─────────────────────────
    let taxRate = 0;
    try {
      const taxSetting = await db.query.settings.findFirst({
        where: eq(settings.key, 'tax_provision'),
      });
      if (taxSetting?.value != null) {
        const taxConfig = taxSetting.value as { enabled?: boolean; rate?: number };
        if (taxConfig.enabled && taxConfig.rate) {
          taxRate = taxConfig.rate; // stored as decimal e.g. 0.03 = 3%
        }
      }
    } catch {
      // silently default to 0
    }
    const taxProvision = Math.max(netProfit, 0) * taxRate;

    // ── Expenses by type (for pie chart) ────────────────
    const expensesByCategory = await db
      .select({
        name: sql<string>`CASE WHEN ${expenses.productId} IS NOT NULL THEN 'Product Costs' ELSE 'General Expenses' END`,
        group: sql<string>`CASE WHEN ${expenses.productId} IS NOT NULL THEN 'Production' ELSE 'General' END`,
        value: sql<string>`COALESCE(SUM(${expenses.amount} * ${expenses.quantity}), 0)`,
      })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, start), lte(expenses.expenseDate, end)))
      .groupBy(sql`CASE WHEN ${expenses.productId} IS NOT NULL THEN 'Product Costs' ELSE 'General Expenses' END`, sql`CASE WHEN ${expenses.productId} IS NOT NULL THEN 'Production' ELSE 'General' END`);

    // ── Sales by product category (for bar chart) ───────────
    const salesByCategory = await db
      .select({
        category: productCategories.name,
        sales: sql<string>`COALESCE(SUM(${income.netAmount}), 0)`,
      })
      .from(income)
      .innerJoin(products, eq(income.productId, products.id))
      .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(gte(income.saleDate, start), lte(income.saleDate, end), eq(income.isRefunded, false)))
      .groupBy(productCategories.name);

    // ── Daily summary (today's cash flow) ───────────────────
    const today = new Date().toISOString().slice(0, 10);

    const [cashInRow] = await db
      .select({
        cashIn: sql<string>`COALESCE(SUM(${income.netAmount}), 0)`,
      })
      .from(income)
      .where(
        and(
          eq(income.saleDate, today),
          eq(income.cashFlowStatus, 'cleared'),
          eq(income.isRefunded, false),
        ),
      );

    const [cashOutRow] = await db
      .select({
        cashOut: sql<string>`COALESCE(SUM(${expenses.amount} * ${expenses.quantity}), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.expenseDate, today));

    const cashIn = Number(cashInRow.cashIn);
    const cashOut = Number(cashOutRow.cashOut);

    // ── Break-even calculations ─────────────────────────────
    const totalFixedExpenses = expensesByCategory
      .filter(e => e.group !== 'Production' && e.group !== 'Packaging')
      .reduce((sum, e) => sum + Number(e.value), 0);
    
    const breakEvenRevenue = profitMargin > 0 ? totalFixedExpenses / (profitMargin / 100) : 0;

    // ── Response ────────────────────────────────────────────
    res.json({
      period: { start, end },
      metrics: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        totalDiscounts,
        taxProvision: Math.round(taxProvision * 100) / 100,
        totalFixedExpenses,
        breakEvenRevenue: Math.round(breakEvenRevenue * 100) / 100,
      },
      expensesByCategory: expensesByCategory.map((r) => ({
        name: r.name,
        value: Number(r.value),
        group: r.group,
      })),
      salesByCategory: salesByCategory.map((r) => ({
        category: r.category,
        sales: Number(r.sales),
        // profit per category would need cost data; omitted for MVP
        profit: null,
      })),
      dailySummary: {
        cashIn,
        cashOut,
        netCashFlow: cashIn - cashOut,
      },
    });
  } catch (err) {
    console.error('Failed to build dashboard:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
