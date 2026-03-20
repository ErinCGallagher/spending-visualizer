/** Runs database migrations. Execute with: tsx src/db/migrate.ts */

import "dotenv/config";
import { pool } from "../db";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // BetterAuth tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id              text primary key,
        name            text not null,
        email           text not null unique,
        "emailVerified" boolean not null default false,
        image           text,
        "createdAt"     timestamp not null default now(),
        "updatedAt"     timestamp not null default now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        id              text primary key,
        "userId"        text not null references "user"(id) on delete cascade,
        token           text not null unique,
        "expiresAt"     timestamp not null,
        "ipAddress"     text,
        "userAgent"     text,
        "createdAt"     timestamp not null default now(),
        "updatedAt"     timestamp not null default now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS account (
        id                        text primary key,
        "userId"                  text not null references "user"(id) on delete cascade,
        "accountId"               text not null,
        "providerId"              text not null,
        "accessToken"             text,
        "refreshToken"            text,
        "accessTokenExpiresAt"    timestamp,
        "refreshTokenExpiresAt"   timestamp,
        scope                     text,
        "idToken"                 text,
        password                  text,
        "createdAt"               timestamp not null default now(),
        "updatedAt"               timestamp not null default now(),
        unique("userId", "providerId")
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification (
        id            text primary key,
        identifier    text not null,
        value         text not null,
        "expiresAt"   timestamp not null,
        "createdAt"   timestamp not null default now(),
        "updatedAt"   timestamp not null default now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS uploads (
        id            uuid primary key default gen_random_uuid(),
        user_id       text not null,
        uploaded_at   timestamptz not null default now(),
        filename      text,
        source_format text not null,
        home_currency text not null
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id        uuid primary key default gen_random_uuid(),
        user_id   text not null,
        name      text not null,
        parent_id uuid references categories(id) on delete set null,
        unique(user_id, name)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id                  uuid primary key default gen_random_uuid(),
        upload_id           uuid references uploads(id) on delete cascade,
        user_id             text not null,
        date                date not null,
        description         text not null,
        amount_home         numeric(12,2) not null,
        amount_local        numeric(12,2),
        local_currency      text,
        category_id         uuid references categories(id) on delete set null,
        category_source     text check (category_source in ('csv', 'ai', 'user')),
        category_confidence numeric(4,3),
        payment_method      text,
        country             text,
        payer               text,
        source_format       text not null,
        raw                 jsonb not null
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS travellers (
        id          uuid primary key default gen_random_uuid(),
        upload_id   uuid references uploads(id) on delete cascade,
        user_id     text not null,
        name        text not null
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transaction_splits (
        id              uuid primary key default gen_random_uuid(),
        transaction_id  uuid references transactions(id) on delete cascade,
        traveller_name  text not null,
        amount_home     numeric(12,2) not null
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id          uuid primary key default gen_random_uuid(),
        user_id     text not null,
        name        text not null,
        group_type  text not null check (group_type in ('trip', 'daily', 'business')),
        created_at  timestamptz not null default now()
      )
    `);

    await client.query(`
      ALTER TABLE uploads ADD COLUMN IF NOT EXISTS group_id uuid references groups(id)
    `);

    await client.query(`
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS group_id uuid references groups(id)
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_date
        ON transactions(user_id, date)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_category
        ON transactions(user_id, category_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_splits_transaction
        ON transaction_splits(transaction_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_user
        ON categories(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_groups_user
        ON groups(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_group
        ON transactions(group_id)
    `);

    await client.query("COMMIT");
    console.log("Migration complete");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
