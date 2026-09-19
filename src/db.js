require('dotenv').config();
const { Pool } = require('pg');

// Local Postgres (localhost) uses no SSL; hosted Postgres
// (Neon / Supabase / Vercel Postgres) requires SSL via ?sslmode=require.
// Vercel Postgres exposes POSTGRES_URL (pooled); local dev uses DATABASE_URL.
// Accept either so `vercel connect` works with zero renames.
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
