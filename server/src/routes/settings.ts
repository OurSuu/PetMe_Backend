import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { validateBody, settingSchema } from '../middleware/validation.js';
import { requireRole, auditLog } from '../middleware/auth.js';
import { webhookService } from '../services/webhook.js';

const router = Router();

/** GET /api/settings — list all settings */
router.get('/', requireRole(['owner']), async (_req, res) => {
  try {
    const rows = await db.select().from(settings).orderBy(settings.key);
    res.json(rows);
  } catch (err) {
    console.error('Failed to fetch settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /api/settings/webhook-test — trigger a test webhook */
router.post('/webhook-test', requireRole(['owner']), async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    if (!webhookUrl) {
      res.status(400).json({ error: 'Missing webhookUrl' });
      return;
    }

    const result = await webhookService.sendTestWebhook(webhookUrl, '🔔 Test Notification from PetMe Dashboard!');
    
    if (result.success) {
      res.json({ message: 'Webhook test dispatched successfully' });
    } else {
      res.status(500).json({ error: result.error || 'Failed to dispatch webhook' });
    }
  } catch (err) {
    console.error('Failed to trigger webhook test:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /api/settings/:key — get single setting by key */
router.get('/:key', requireRole(['owner']), async (req, res) => {
  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, req.params.key as string),
    });

    if (!row) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }
    res.json(row);
  } catch (err) {
    console.error('Failed to fetch setting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** PUT /api/settings/:key — upsert setting value */
router.put('/:key', requireRole(['owner']), auditLog('Update Setting'), async (req, res) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;

    if (value === undefined) {
      res.status(400).json({ error: 'Missing "value" in request body' });
      return;
    }

    // Check if the setting exists
    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      res.json(updated);
    } else {
      // Insert new setting
      const [created] = await db
        .insert(settings)
        .values({ key, value })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    console.error('Failed to update setting:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
