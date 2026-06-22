import { Router } from 'express';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { expenses } from '../db/schema.js';
import { validateBody, expenseSchema } from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { products, productCategories } from '../db/schema.js';

const router = Router();

/** GET /api/expenses — list all with category, optional date filtering */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    // Build where conditions for date filtering
    const conditions: ReturnType<typeof eq>[] = [];
    if (startDate) {
      conditions.push(gte(expenses.expenseDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(expenses.expenseDate, endDate));
    }

    if (conditions.length > 0) {
      const rows = await db.query.expenses.findMany({
        with: { product: true },
        where: conditions.length === 1 ? conditions[0] : and(...conditions),
        orderBy: (expenses, { desc }) => [desc(expenses.expenseDate)],
      });
      res.json(rows);
    } else {
      const rows = await db.query.expenses.findMany({
        with: { product: true },
        orderBy: (expenses, { desc }) => [desc(expenses.expenseDate)],
      });
      res.json(rows);
    }
  } catch (err) {
    console.error('Failed to fetch expenses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/expenses — create with optional receipt upload */
router.post('/', upload.single('receipt'), auditLog('Create Expense'), async (req, res) => {
  try {
    // Parse JSON fields that may come as strings from multipart/form-data
    const body = { ...req.body };
    if (typeof body.quantity === 'string') body.quantity = Number(body.quantity);

    const result = expenseSchema.safeParse(body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const values: Record<string, unknown> = { ...result.data };
    
    // Auto-create product if productName is provided
    let finalProductId = values.productId;
    if (values.productName && typeof values.productName === 'string' && values.productName.trim() !== '') {
      const pName = values.productName.trim();
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.name, pName)
      });
      
      if (existingProduct) {
        finalProductId = existingProduct.id;
      } else {
        // Create new product
        const [newProduct] = await db.insert(products).values({
          name: pName,
          baseCost: '0'
        }).returning();
        finalProductId = newProduct.id;
      }
    }
    
    // Remove productName before insert
    delete values.productName;
    values.productId = finalProductId;

    // Attach receipt path if file was uploaded
    if (req.file) {
      values.receiptPath = `/uploads/receipts/${req.file.filename}`;
    }

    const [created] = await db.insert(expenses).values(values as any).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/expenses/:id — update */
router.put('/:id', requireRole(['owner']), validateBody(expenseSchema), auditLog('Update Expense'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = expenseSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const values = { ...result.data };
    
    let finalProductId = values.productId;
    if (values.productName && typeof values.productName === 'string' && values.productName.trim() !== '') {
      const pName = values.productName.trim();
      const existingProduct = await db.query.products.findFirst({
        where: eq(products.name, pName)
      });
      
      if (existingProduct) {
        finalProductId = existingProduct.id;
      } else {
        const [newProduct] = await db.insert(products).values({
          name: pName,
          baseCost: '0'
        }).returning();
        finalProductId = newProduct.id;
      }
    }
    
    delete values.productName;
    values.productId = finalProductId;

    const [updated] = await db
      .update(expenses)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(expenses.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Failed to update expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/expenses/:id — delete */
router.delete('/:id', requireRole(['owner']), auditLog('Delete Expense'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(expenses)
      .where(eq(expenses.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }
    res.json({ message: 'Expense deleted', data: deleted });
  } catch (err) {
    console.error('Failed to delete expense:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
