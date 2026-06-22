import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log('Running manual schema updates...');
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "expense_categories" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "group_name" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log('expense_categories table ensured.');

    await sql`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "key" text NOT NULL,
        "value" jsonb NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log('settings table ensured.');

    try {
      await sql`ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'owner' NOT NULL;`;
      console.log('Added role column to users.');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('users role column error:', e.message);
      }
    }

    try {
      await sql`ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");`;
      console.log('Added unique constraint to users.username.');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('users username unique constraint error:', e.message);
      }
    }

    await sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "action" text NOT NULL,
        "details" text,
        "timestamp" timestamp DEFAULT now() NOT NULL
      );
    `;
    console.log('audit_logs table ensured.');

    try {
      await sql`ALTER TABLE "expenses" ADD COLUMN "product_id" integer;`;
      console.log('Added product_id column to expenses.');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('expenses product_id column error:', e.message);
      }
    }

    try {
      await sql`
        ALTER TABLE "expenses" ADD CONSTRAINT "expenses_product_id_products_id_fk" 
        FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") 
        ON DELETE set null ON UPDATE no action;
      `;
      console.log('Added foreign key for product_id on expenses.');
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log('expenses product_id foreign key error:', e.message);
      }
    }

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

run();
