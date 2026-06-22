import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  const sql = neon(process.env.DATABASE_URL);

  console.log('Dropping partially created tables...');
  
  await sql`DROP TABLE IF EXISTS "audit_logs" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "expense_categories" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "expenses" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "income" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "product_categories" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "products" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "sales_channels" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "settings" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "users" CASCADE;`;
  
  // also drop the drizzle metadata tables to reset migration state
  await sql`DROP TABLE IF EXISTS "drizzle_migrations" CASCADE;`;

  console.log('✅ Tables dropped');
  process.exit(0);
}

main();
