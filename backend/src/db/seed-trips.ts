/**
 * Seeds a synthetic trip group with transactions for local development, so the
 * trips tab has data to render. Idempotent: re-running replaces the seeded trip.
 * Execute with: tsx src/db/seed-trips.ts
 */

import "dotenv/config";
import { pool } from "../db";

const TRIP_NAME = "Greece Trip 2026";
const COUNTRY = "Greece";
const SOURCE_FORMAT = "seed";

// Transactions to create, keyed by category name (parent or child). Amounts are
// expenses (positive, matching the app's sign convention) in the home currency.
const SEED_TRANSACTIONS: { date: string; description: string; amount: number; category: string }[] = [
  { date: "2026-06-01", description: "Flights YYZ-ATH", amount: 1840.0, category: "Uncategorized" },
  { date: "2026-06-01", description: "Airport taxi", amount: 42.5, category: "Uncategorized" },
  { date: "2026-06-01", description: "Hotel Athens — 3 nights", amount: 612.0, category: "Uncategorized" },
  { date: "2026-06-02", description: "Acropolis tickets", amount: 48.0, category: "Entertainment" },
  { date: "2026-06-02", description: "Taverna dinner", amount: 76.4, category: "Restaurants" },
  { date: "2026-06-03", description: "Supermarket snacks", amount: 31.2, category: "Groceries" },
  { date: "2026-06-03", description: "Wine tasting tour", amount: 120.0, category: "Entertainment" },
  { date: "2026-06-04", description: "Ferry to Santorini", amount: 88.0, category: "Uncategorized" },
  { date: "2026-06-04", description: "FX transaction fee", amount: 6.75, category: "Fees" },
  { date: "2026-06-05", description: "Santorini villa — 4 nights", amount: 980.0, category: "Uncategorized" },
  { date: "2026-06-05", description: "Seaside lunch", amount: 54.9, category: "Restaurants" },
  { date: "2026-06-06", description: "Catamaran cruise", amount: 210.0, category: "Entertainment" },
  { date: "2026-06-07", description: "Local bakery", amount: 18.3, category: "Groceries" },
  { date: "2026-06-07", description: "Sunset dinner Oia", amount: 142.0, category: "Restaurants" },
  { date: "2026-06-08", description: "Scooter rental", amount: 65.0, category: "Entertainment" },
  { date: "2026-06-09", description: "Ferry back to Athens", amount: 88.0, category: "Uncategorized" },
  { date: "2026-06-09", description: "Souvenirs", amount: 73.5, category: "Uncategorized" },
  { date: "2026-06-10", description: "Farewell dinner", amount: 98.6, category: "Restaurants" },
];

async function seedTrips() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: userRows } = await client.query<{ id: string }>(
      `SELECT id FROM "user" ORDER BY "createdAt" LIMIT 1`
    );
    if (userRows.length === 0) {
      throw new Error("No user found — create a user before seeding trip data.");
    }
    const userId = userRows[0].id;

    const { rows: catRows } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM categories WHERE user_id = $1`,
      [userId]
    );
    const categoryIdByName = new Map(catRows.map((c) => [c.name, c.id]));

    const missing = [...new Set(SEED_TRANSACTIONS.map((t) => t.category))].filter(
      (name) => !categoryIdByName.has(name)
    );
    if (missing.length > 0) {
      throw new Error(`Missing categories for this user: ${missing.join(", ")}`);
    }

    // Replace any prior seeding so the script is safe to re-run.
    await client.query(
      `DELETE FROM groups WHERE user_id = $1 AND name = $2 AND group_type = 'trip'`,
      [userId, TRIP_NAME]
    );

    const { rows: groupRows } = await client.query<{ id: string }>(
      `INSERT INTO groups (user_id, name, group_type)
       VALUES ($1, $2, 'trip')
       RETURNING id`,
      [userId, TRIP_NAME]
    );
    const groupId = groupRows[0].id;

    for (const t of SEED_TRANSACTIONS) {
      await client.query(
        `INSERT INTO transactions
           (user_id, group_id, date, description, amount_home, category_id,
            category_source, country, source_format, raw)
         VALUES ($1, $2, $3, $4, $5, $6, 'user', $7, $8, $9)`,
        [
          userId,
          groupId,
          t.date,
          t.description,
          t.amount,
          categoryIdByName.get(t.category),
          COUNTRY,
          SOURCE_FORMAT,
          JSON.stringify({ seed: true }),
        ]
      );
    }

    await client.query("COMMIT");
    console.log(
      `Seeded "${TRIP_NAME}" with ${SEED_TRANSACTIONS.length} transactions for user ${userId}`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTrips().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
