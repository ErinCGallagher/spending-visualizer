/**
 * Creates a user record in the database so the given Google account is
 * recognised on first sign-in. BetterAuth links an incoming OAuth login to an
 * existing user row when the email matches.
 *
 * Usage:
 *   pnpm tsx scripts/setup-admin.ts --email you@example.com --name "Your Name"
 */

import "dotenv/config";
import { Pool } from "pg";

function parseArgs(): { email: string; name: string } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : undefined;
  };

  const email = get("--email");
  const name = get("--name");

  if (!email || !name) {
    console.error("Usage: pnpm tsx scripts/setup-admin.ts --email <email> --name <name>");
    process.exit(1);
  }

  return { email, name };
}

async function main() {
  const { email, name } = parseArgs();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // BetterAuth's pg adapter stores users in a table called "user"
    const result = await pool.query<{ id: string }>(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, false, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE
         SET name = EXCLUDED.name, "updatedAt" = NOW()
       RETURNING id`,
      [name, email]
    );

    const userId = result.rows[0].id;
    console.log(`User ready:`);
    console.log(`  id:    ${userId}`);
    console.log(`  name:  ${name}`);
    console.log(`  email: ${email}`);
    console.log();
    console.log(`Sign in with Google using ${email} to activate the account.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
