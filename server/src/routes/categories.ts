import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  products,
  productCategories,
  expenseCategories,
  salesChannels,
  expenses,
} from '../db/schema.js';
import {
  validateBody,
  productCategorySchema,
  salesChannelSchema,
} from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';

const router = Router();

// ============================================================
// Product Categories
// ============================================================

/** GET /api/product-categories — list all */
router.get('/api/product-categories', async (_req, res) => {
  try {
    const rows = await db.select().from(productCategories).orderBy(productCategories.name);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch product categories:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/product-categories — create */
router.post('/api/product-categories', requireRole(['owner']), validateBody(productCategorySchema), auditLog('Create Product Category'), async (req, res) => {
  try {
    const [created] = await db.insert(productCategories).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'A product category with that name or slug already exists' });
      return;
    }
    console.error('Failed to create product category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/product-categories/:id — update */
router.put('/api/product-categories/:id', requireRole(['owner']), validateBody(productCategorySchema), auditLog('Update Product Category'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(productCategories)
      .set(req.body)
      .where(eq(productCategories.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Product category not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'A product category with that name or slug already exists' });
      return;
    }
    console.error('Failed to update product category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/product-categories/:id — delete */
router.delete('/api/product-categories/:id', requireRole(['owner']), auditLog('Delete Product Category'), async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Check if category is in use by products
    const productCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(eq(products.categoryId, id));

    if (productCount[0].count > 0) {
      res.status(409).json({ error: 'Cannot delete: Category is in use by existing products' });
      return;
    }

    const [deleted] = await db
      .delete(productCategories)
      .where(eq(productCategories.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Product category not found' });
      return;
    }
    res.json({ message: 'Product category deleted', data: deleted });
  } catch (err) {
    console.error('Failed to delete product category:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// ============================================================
// Sales Channels
// ============================================================

/** GET /api/sales-channels — list all */
router.get('/api/sales-channels', async (_req, res) => {
  try {
    const rows = await db.select().from(salesChannels).orderBy(salesChannels.name);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch sales channels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/sales-channels — create */
router.post('/api/sales-channels', requireRole(['owner']), validateBody(salesChannelSchema), auditLog('Create Sales Channel'), async (req, res) => {
  try {
    const [created] = await db.insert(salesChannels).values(req.body).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'A sales channel with that name already exists' });
      return;
    }
    console.error('Failed to create sales channel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/sales-channels/:id — update */
router.put('/api/sales-channels/:id', requireRole(['owner']), validateBody(salesChannelSchema), auditLog('Update Sales Channel'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(salesChannels)
      .set(req.body)
      .where(eq(salesChannels.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Sales channel not found' });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'A sales channel with that name already exists' });
      return;
    }
    console.error('Failed to update sales channel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/sales-channels/:id — delete */
router.delete('/api/sales-channels/:id', requireRole(['owner']), auditLog('Delete Sales Channel'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(salesChannels)
      .where(eq(salesChannels.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Sales channel not found' });
      return;
    }
    res.json({ message: 'Sales channel deleted', data: deleted });
  } catch (err) {
    console.error('Failed to delete sales channel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
