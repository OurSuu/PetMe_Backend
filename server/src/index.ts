import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

// Route imports
import categoriesRouter from './routes/categories.js';
import productsRouter from './routes/products.js';
import expensesRouter from './routes/expenses.js';
import incomeRouter from './routes/income.js';
import inventoryRouter from './routes/inventory.js';
import dashboardRouter from './routes/dashboard.js';
import settingsRouter from './routes/settings.js';
import webhooksRouter from './routes/webhooks.js';
import { initCronJobs } from './jobs/cron.js';

// ── Directory setup ──────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadsDir = path.resolve(__dirname, '../../uploads/receipts');
try {
  fs.mkdirSync(uploadsDir, { recursive: true });
} catch (error) {
  console.warn('Could not create uploads directory (expected in serverless environments):', error);
}

// ── Express app ──────────────────────────────────────────────
const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors()); // allow all origins for dev
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Route mounting ───────────────────────────────────────────
app.use('/', categoriesRouter);           // handles /api/product-categories, /api/expense-categories, /api/sales-channels
app.use('/api/products', productsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/income', incomeRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/webhooks', webhooksRouter);

// ── Start server ─────────────────────────────────────────────
if (!process.env.VERCEL) {
  initCronJobs();
  app.listen(PORT, () => {
    console.log(`🐾 PetMe API server running on http://localhost:${PORT}`);
  });
}

export default app;
