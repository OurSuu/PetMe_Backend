import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { products, income } from '../db/schema.js';
import { validateBody, productSchema } from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';

const router = Router();

/** GET /api/products — list all with category relation */
router.get('/', async (_req, res) => {
  try {
    const rows = await db.query.products.findMany({
      with: { category: true },
      orderBy: (products, { asc }) => [asc(products.name)],
    });
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/products — create */
router.post('/', requireRole(['owner']), validateBody(productSchema), auditLog('Create Product'), async (req, res) => {
  try {
    const [created] = await db.insert(products).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/products/:id — update */
router.put('/:id', requireRole(['owner']), validateBody(productSchema), auditLog('Update Product'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(products)
      .set(req.body)
      .where(eq(products.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Failed to update product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/products/:id — delete or archive */
router.delete('/:id', requireRole(['owner']), auditLog('Delete Product'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const transactionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(income)
      .where(eq(income.productId, id));

    if (transactionCount[0].count > 0) {
      const [archived] = await db
        .update(products)
        .set({ isArchived: true })
        .where(eq(products.id, id))
        .returning();

      if (!archived) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ message: 'Product archived due to existing transactions', data: archived, archived: true });
    } else {
      const [deleted] = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning();

      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ message: 'Product deleted permanently', data: deleted, archived: false });
    }
  } catch (err) {
    console.error('Failed to delete/archive product:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
