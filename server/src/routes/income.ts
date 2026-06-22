import { Router } from 'express';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { income } from '../db/schema.js';
import { validateBody, incomeSchema } from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';

const router = Router();

/** GET /api/income — list all with product & channel relations, optional date filtering */
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };

    const conditions: ReturnType<typeof eq>[] = [];
    if (startDate) {
      conditions.push(gte(income.saleDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(income.saleDate, endDate));
    }

    const rows = await db.query.income.findMany({
      with: { product: true, channel: true },
      where: conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined,
      orderBy: (income, { desc }) => [desc(income.saleDate)],
    });

    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch income:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/income — create */
router.post('/', validateBody(incomeSchema), auditLog('Create Income'), async (req, res) => {
  try {
    const [created] = await db.insert(income).values(req.body).returning();
    res.status(201).json(created);
  } catch (err) {
    console.error('Failed to create income:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/income/:id — update */
router.put('/:id', requireRole(['owner']), validateBody(incomeSchema), auditLog('Update Income'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [updated] = await db
      .update(income)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(income.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Income record not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    console.error('Failed to update income:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** DELETE /api/income/:id — delete */
router.delete('/:id', requireRole(['owner']), auditLog('Delete Income'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [deleted] = await db
      .delete(income)
      .where(eq(income.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: 'Income record not found' });
      return;
    }
    res.json({ message: 'Income record deleted', data: deleted });
  } catch (err) {
    console.error('Failed to delete income:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
