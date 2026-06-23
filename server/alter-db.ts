import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const result = await sql`ALTER TABLE income ADD COLUMN is_shipped boolean DEFAULT true NOT NULL;`;
    console.log(result);
  } catch (e) {
    console.error(e);
  }
}
run();
