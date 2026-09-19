require('dotenv').config();
const { Pool } = require('pg');

// Local Postgres (localhost) uses no SSL; hosted Postgres
// (Neon / Supabase / Vercel Postgres) requires SSL via ?sslmode=require.
// Vercel Postgres exposes POSTGRES_URL (pooled); local dev uses DATABASE_URL.
// Accept either so `vercel connect` works with zero renames.
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  // Fail loudly instead of silently falling back to pg defaults (localhost:5432),
  // which on Vercel surfaces as ECONNREFUSED 127.0.0.1:5432 + function timeout.
  console.error(
    'FATAL: neither DATABASE_URL nor POSTGRES_URL is set. ' +
      'Add one in Vercel Settings → Environment Variables and Redeploy.'
  );
}
const useSSL =
  connectionString &&
  (connectionString.includes('sslmode=require') ||
    process.env.PGSSL === 'true' ||
    process.env.NODE_ENV === 'production');

const pool = new Pool({
  connectionString,
  ...(useSSL ? { ssl: { rejectUnauthorized: false } } : {}),
  // Vercel serverless: many short-lived instances, keep per-instance pool small.
  max: parseInt(process.env.PGPOOL_MAX || '5', 10),
});

pool.on('error', (err) => console.error('PG pool error', err.message));

module.exports = pool;
