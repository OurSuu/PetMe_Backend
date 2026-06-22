import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function wipe() {
  const sql = neon(process.env.DATABASE_URL);
  await sql`DROP SCHEMA public CASCADE;`;
  await sql`CREATE SCHEMA public;`;
  console.log('Database wiped');
}
wipe().catch(console.error);
