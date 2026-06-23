import { Router } from 'express';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { db } from '../db/index.js';
import { income, products, productCategories, salesChannels } from '../db/schema.js';
import { validateBody, incomeSchema } from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';
import { sendDiscordNotification } from '../utils/discord.js';

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

/** POST /api/income/sync — Sync preorders from the shared Order table */
router.post('/sync', requireRole(['owner']), auditLog('Sync Preorders'), async (req, res) => {
  try {
    const preorderDbUrl = process.env.PREORDER_DB_URL || process.env.DATABASE_URL!;
    const sqlPreorder = neon(preorderDbUrl);
    
    // The Neon driver returns an array of rows directly
    const allOrders = await sqlPreorder('SELECT * FROM "Order"');

    if (!Array.isArray(allOrders) || allOrders.length === 0) {
      res.json({ message: 'No preorders to sync.', count: 0 });
      return;
    }

    let channelId: number;
    const existingChannel = await db.query.salesChannels.findFirst({
      where: (ch, { ilike }) => ilike(ch.name, 'Preorder Website')
    });

    if (existingChannel) {
      channelId = existingChannel.id;
    } else {
      const [newChannel] = await db.insert(salesChannels).values({
        name: 'Preorder Website'
      }).returning();
      channelId = newChannel.id;
    }

    let syncedCount = 0;
    for (const order of allOrders) {
      const colorPart = order.color ? ` - ${order.color}` : '';
      const sizePart = order.size ? ` - ${order.size}` : '';
      const fullProductName = `${order.productName}${colorPart}${sizePart}`.trim();

      let productId: number;
      const existingProduct = await db.query.products.findFirst({
        where: (prod, { ilike }) => ilike(prod.name, fullProductName)
      });

      if (existingProduct) {
        productId = existingProduct.id;
      } else {
        let categoryId: number | null = null;
        const existingCategory = await db.query.productCategories.findFirst({
          where: (cat, { ilike }) => ilike(cat.name, 'Preorder')
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

        const [newProduct] = await db.insert(products).values({
          name: fullProductName,
          categoryId: categoryId,
          baseCost: '0'
        }).returning();
        productId = newProduct.id;
      }

      const existingIncome = await db.query.income.findFirst({
        where: (inc, { eq }) => eq(inc.preorderId, order.id)
      });

      const orderDate = order.createdAt ? new Date(String(order.createdAt)).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

      if (!existingIncome) {
        await db.insert(income).values({
          preorderId: order.id,
          productId,
          channelId,
          quantity: Number(order.quantity) || 1,
          fullPrice: String(order.totalPrice || 0),
          netAmount: String(order.totalPrice || 0),
          cashFlowStatus: order.status === 'paid' ? 'cleared' : 'pending',
          isCleared: order.status === 'paid',
          saleDate: orderDate
        });
        syncedCount++;
      }
    }

    res.json({ message: `Successfully synced ${syncedCount} new preorders.`, count: syncedCount });
  } catch (err) {
    console.error('Failed to sync orders:', err);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
});

/** POST /api/income — create */
router.post('/', validateBody(incomeSchema), auditLog('Create Income'), async (req, res) => {
  try {
    const values: Record<string, unknown> = { ...req.body };
    
    // Auto-create product if productName is provided
    let finalProductId = values.productId;
    if (values.productName && typeof values.productName === 'string' && values.productName.trim() !== '') {
      const pName = values.productName.trim();
      const existingProduct = await db.query.products.findFirst({
        where: (prod, { ilike }) => ilike(prod.name, pName)
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

    const [created] = await db.insert(income).values(values as any).returning();

    // Send Discord Notification
    try {
      const channel = await db.query.salesChannels.findFirst({ where: eq(salesChannels.id, created.channelId) });
      let pName = values.productName || 'Unknown Product';
      if (!values.productName) {
        const prod = await db.query.products.findFirst({ where: eq(products.id, finalProductId) });
        if (prod) pName = prod.name;
      }
      await sendDiscordNotification({
        title: '💰 New Manual Income Logged',
        description: `Income received from **${channel?.name || 'Manual Entry'}**`,
        color: 5814783,
        fields: [
          { name: 'Product', value: String(pName), inline: true },
          { name: 'Quantity', value: String(created.quantity), inline: true },
          { name: 'Net Amount', value: `฿${Number(created.netAmount).toLocaleString()}`, inline: true }
        ]
      });
    } catch (e) { console.error('Failed discord income notif:', e); }

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
    const values: Record<string, unknown> = { ...req.body };
    
    let finalProductId = values.productId;
    if (values.productName && typeof values.productName === 'string' && values.productName.trim() !== '') {
      const pName = values.productName.trim();
      const existingProduct = await db.query.products.findFirst({
        where: (prod, { ilike }) => ilike(prod.name, pName)
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
      .update(income)
      .set({ ...values, updatedAt: new Date() } as any)
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
