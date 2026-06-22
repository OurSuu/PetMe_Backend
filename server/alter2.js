import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

async function alter() {
  const sql = neon(process.env.DATABASE_URL);
  
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      role VARCHAR(20) NOT NULL DEFAULT 'staff',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;
  
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(255) NOT NULL,
      details JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `;

  await sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN NOT NULL DEFAULT FALSE;`;
  await sql`ALTER TABLE income ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN NOT NULL DEFAULT FALSE;`;
  
  // Seed an owner user for testing
  await sql`
    INSERT INTO users (username, role) 
    VALUES ('admin', 'owner') 
    ON CONFLICT (username) DO NOTHING;
  `;
  
  console.log('Migration completed successfully');
}
alter().catch(console.error);
