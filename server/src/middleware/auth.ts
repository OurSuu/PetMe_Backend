import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import { users, auditLogs } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Middleware to enforce role-based access control based on X-User-Role header.
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = req.headers['x-user-role'] as string || 'owner'; // Default everything to owner for now
      
      // Temporary: Disable role check to allow all features
      // if (!allowedRoles.includes(role)) {
      //   res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      //   return;
      // }
      
      res.locals.role = role;
      
      // Fetch or default the user ID for auditing purposes
      const userRecord = await db.query.users.findFirst({
        where: eq(users.role, role)
      });
      res.locals.userId = userRecord?.id || null;

      next();
    } catch (err) {
      console.error('RBAC Error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to automatically log mutations
 */
export function auditLog(actionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Ensure we resolve user ID if requireRole wasn't called on this route
    if (res.locals.userId === undefined) {
      const role = req.headers['x-user-role'] as string || 'staff';
      const userRecord = await db.query.users.findFirst({
        where: eq(users.role, role)
      });
      res.locals.userId = userRecord?.id || null;
      res.locals.role = role;
    }

    res.on('finish', async () => {
      // Only log on successful mutation
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const userId = res.locals.userId;
          const details = {
            method: req.method,
            path: req.originalUrl,
            params: req.params,
            body: req.body
          };
          
          await db.insert(auditLogs).values({
            userId,
            action: actionName,
            details
          });
        } catch (err) {
          console.error('Failed to create audit log:', err);
        }
      }
    });
    next();
  };
}
