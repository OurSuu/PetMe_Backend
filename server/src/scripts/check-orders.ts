import 'dotenv/config';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function check() {
  try {
    const res = await db.execute(sql`SELECT * FROM "Order"`);
    console.log("Orders found:", res.rows.length);
    console.log(res.rows);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
check();
