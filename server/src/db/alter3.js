import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/petme';
const sql = neon(connectionString);

async function main() {
  console.log('Starting migration...');
  
  try {
    await sql`ALTER TABLE expenses ADD COLUMN product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;`;
    console.log('Added product_id to expenses table.');
  } catch (error) {
    if (error.message?.includes('already exists')) {
      console.log('Column product_id already exists.');
    } else {
      console.error('Error adding column:', error);
    }
  }

  console.log('Migration complete.');
  process.exit(0);
}

main();
