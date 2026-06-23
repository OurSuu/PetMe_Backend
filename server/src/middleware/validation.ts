import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory: validates req.body against a Zod schema.
 */
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory: validates req.query against a Zod schema.
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    req.query = result.data;
    next();
  };
}

// ============================================================
// Shared Zod Schemas
// ============================================================

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(['today', 'week', 'month', 'year', 'custom']).optional(),
});

export const productCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
});

export const expenseCategorySchema = z.object({
  name: z.string().min(1).max(100),
  groupName: z.string().min(1).max(50),
});

export const salesChannelSchema = z.object({
  name: z.string().min(1).max(100),
});

export const productSchema = z.object({
  name: z.string().min(1).max(255),
  categoryId: z.number().int().positive().nullable().optional(),
  categoryName: z.string().optional(),
  baseCost: z.string().or(z.number()).transform(String).optional(),
});

export const expenseSchema = z.object({
  productId: z.number().int().positive().optional().nullable(),
  productName: z.string().optional(),
  description: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  amount: z.string().or(z.number()).transform(String),
  quantity: z.number().int().min(1).default(1),
  costPerUnit: z.string().or(z.number()).transform(String).optional().nullable(),
  expenseDate: z.string().optional(),
  isCleared: z.boolean().optional(),
});

export const incomeSchema = z.object({
  productId: z.number().int().positive().optional().nullable(),
  productName: z.string().optional(),
  channelId: z.number().int().positive(),
  quantity: z.number().int().min(1).default(1),
  fullPrice: z.string().or(z.number()).transform(String),
  discountPercent: z.string().or(z.number()).transform(String).default('0'),
  netAmount: z.string().or(z.number()).transform(String),
  discountAmount: z.string().or(z.number()).transform(String).default('0'),
  cashFlowStatus: z.enum(['pending', 'cleared']).default('pending'),
  isCleared: z.boolean().optional(),
  saleDate: z.string().optional(),
});

export const settingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
});
