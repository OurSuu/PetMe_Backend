import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function alter() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;`;
  console.log('Column is_archived added');
}
alter().catch(console.error);
