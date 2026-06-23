import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function check() {
  try {
    const preorderDbUrl = process.env.PREORDER_DB_URL;
    const sql = neon(preorderDbUrl!);
    const res = await sql(`SELECT * FROM "Order"`);
    console.log("Orders found:", res.length);
    console.log(res);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
check();
