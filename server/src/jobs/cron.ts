import cron from 'node-cron';
import { db } from '../db/index.js';
import { income, expenses } from '../db/schema.js';
import { sql, eq } from 'drizzle-orm';
import { sendWebhook } from '../services/webhook.js';

export function initCronJobs() {
  // Run daily at 21:00 (9 PM)
  cron.schedule('0 21 * * *', async () => {
    try {
      console.log('Running daily digest cron job...');
      
      const today = new Date().toISOString().split('T')[0];

      // Calculate total daily income
      const incomeRes = await db
        .select({ total: sql<number>`sum(net_amount)` })
        .from(income)
        .where(eq(income.saleDate, today));
      const totalIncome = Number(incomeRes[0]?.total || 0);

      // Calculate total daily expenses
      const expensesRes = await db
        .select({ total: sql<number>`sum(amount * quantity)` })
        .from(expenses)
        .where(eq(expenses.expenseDate, today));
      const totalExpenses = Number(expensesRes[0]?.total || 0);

      const netProfit = totalIncome - totalExpenses;

      await sendWebhook({
        title: '📊 PetMe Daily Finance Digest',
        description: `Here is the summary of today's financial activities (${today}):`,
        color: netProfit >= 0 ? 3066993 : 15158332, // Green if profit, Red if loss
        fields: [
          { name: '💰 Total Income', value: `฿${totalIncome.toFixed(2)}`, inline: true },
          { name: '📉 Total Expenses', value: `฿${totalExpenses.toFixed(2)}`, inline: true },
          { name: '💵 Net Profit', value: `฿${netProfit.toFixed(2)}`, inline: false }
        ]
      }, false);
      
    } catch (err) {
      console.error('Failed to run daily digest cron:', err);
    }
  });
  
  console.log('Cron jobs initialized');
}
