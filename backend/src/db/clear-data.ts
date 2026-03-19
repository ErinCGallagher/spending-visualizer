/** Truncates all app data tables, leaving BetterAuth tables intact. Execute with: tsx src/db/clear-data.ts */

import "dotenv/config";
import { pool } from "../db";

async function clearData() {
  const client = await pool.connect();
  try {
    await client.query(
      "TRUNCATE transaction_splits, travellers, transactions, categories, uploads CASCADE"
    );
    console.log("App data cleared");
  } finally {
    client.release();
    await pool.end();
  }
}

clearData().catch((err) => {
  console.error("Failed to clear data:", err);
  process.exit(1);
});
