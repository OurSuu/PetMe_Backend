import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema.js';

let sql: any;
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL is not set. Database connection will fail.');
  // Create a dummy sql tag that throws when actually called
  sql = () => { throw new Error('DATABASE_URL is not set in environment variables'); };
} else {
  sql = neon(process.env.DATABASE_URL);
}

export const db = drizzle(sql as any, { schema });
