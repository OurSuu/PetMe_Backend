import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  timestamp,
  date,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================
// Auth & Security Tables
// ============================================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  role: varchar('role', { length: 20 }).default('staff').notNull(), // 'owner' | 'staff'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 255 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// Master Data Tables
// ============================================================

/** Product categories (e.g., T-Shirt, Hoodie, Cap) */
export const productCategories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Expense categories grouped by type */
export const expenseCategories = pgTable('expense_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  groupName: varchar('group_name', { length: 50 }).notNull(), // Production, Packaging, Shipping, Fees & Taxes
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Sales channels (e.g., Shopee, TikTok, Direct) */
export const salesChannels = pgTable('sales_channels', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// Core Data Tables
// ============================================================

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  categoryId: integer('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
  baseCost: decimal('base_cost', { precision: 12, scale: 2 }).default('0').notNull(),
  isArchived: boolean('is_archived').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Expense transactions */
export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  description: text('description'),
  note: text('note'),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  costPerUnit: decimal('cost_per_unit', { precision: 12, scale: 2 }),
  receiptPath: varchar('receipt_path', { length: 500 }),
  isCleared: boolean('is_cleared').default(false).notNull(),
  expenseDate: date('expense_date').defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Income / Sales transactions */
export const income = pgTable('income', {
  id: serial('id').primaryKey(),
  preorderId: integer('preorder_id'), // To prevent duplicate syncing from preorder web
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }).notNull(),
  channelId: integer('channel_id').references(() => salesChannels.id, { onDelete: 'set null' }).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  fullPrice: decimal('full_price', { precision: 12, scale: 2 }).notNull(),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0').notNull(),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).default('0').notNull(),
  cashFlowStatus: varchar('cash_flow_status', { length: 20 }).default('pending').notNull(), // 'pending' | 'cleared'
  isCleared: boolean('is_cleared').default(false).notNull(),
  saleDate: date('sale_date').defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** System settings (key-value store with JSONB) */
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Manual stock adjustments */
export const stockAdjustments = pgTable('stock_adjustments', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: integer('quantity').notNull(), // positive or negative
  reason: varchar('reason', { length: 255 }),
  date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// Relations
// ============================================================

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  incomeEntries: many(income),
  expenses: many(expenses),
  stockAdjustments: many(stockAdjustments),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  product: one(products, {
    fields: [expenses.productId],
    references: [products.id],
  }),
}));

export const salesChannelsRelations = relations(salesChannels, ({ many }) => ({
  incomeEntries: many(income),
}));

export const incomeRelations = relations(income, ({ one }) => ({
  product: one(products, {
    fields: [income.productId],
    references: [products.id],
  }),
  channel: one(salesChannels, {
    fields: [income.channelId],
    references: [salesChannels.id],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  product: one(products, {
    fields: [stockAdjustments.productId],
    references: [products.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// ============================================================
// TypeScript types inferred from schema
// ============================================================

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;

export type SalesChannel = typeof salesChannels.$inferSelect;
export type NewSalesChannel = typeof salesChannels.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;

export type Income = typeof income.$inferSelect;
export type NewIncome = typeof income.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type StockAdjustment = typeof stockAdjustments.$inferSelect;
export type NewStockAdjustment = typeof stockAdjustments.$inferInsert;
