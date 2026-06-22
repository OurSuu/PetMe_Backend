import { db } from '../db/index.js';
import { settings } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface WebhookPayload {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  content?: string;
}

export const webhookService = {
  dispatchAlert: async (message: string, isCritical: boolean = false) => {
    try {
      const urlSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'webhook_url') });
      const modeSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'webhook_mode') });

      const webhookUrl = urlSetting?.value as string;
      const webhookMode = (modeSetting?.value as string) || 'disabled';

      if (!webhookUrl || webhookMode === 'disabled') {
        return false;
      }

      if (!isCritical && webhookMode === 'critical_only') {
        return false;
      }

      return await webhookService.sendTestWebhook(webhookUrl, message);
    } catch (err) {
      console.error('Failed to dispatch webhook:', err);
      return false;
    }
  },

  sendTestWebhook: async (url: string, message: string) => {
    try {
      const body = {
        content: message
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error(`Webhook fetch failed: ${response.status} ${response.statusText}`);
        return { success: false, error: `${response.status} ${response.statusText}` };
      }
      return { success: true };
    } catch (err) {
      console.error('Failed to send test webhook:', err);
      return { success: false, error: (err as Error).message };
    }
  },

  sendWebhook: async (payload: WebhookPayload, isCritical: boolean = false) => {
    try {
      const urlSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'webhook_url') });
      const modeSetting = await db.query.settings.findFirst({ where: eq(settings.key, 'webhook_mode') });

      const webhookUrl = urlSetting?.value as string;
      const webhookMode = (modeSetting?.value as string) || 'disabled';

      if (!webhookUrl || webhookMode === 'disabled') {
        return;
      }

      if (!isCritical && webhookMode === 'critical_only') {
        return;
      }

      const body = {
        content: payload.content,
        embeds: payload.title ? [{
          title: payload.title,
          description: payload.description,
          color: payload.color || 3447003,
          fields: payload.fields || [],
          timestamp: new Date().toISOString()
        }] : undefined
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (err) {
      console.error('Failed to dispatch webhook:', err);
    }
  }
};

export const sendWebhook = webhookService.sendWebhook;
