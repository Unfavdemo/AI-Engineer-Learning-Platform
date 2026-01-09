import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env from project root (three levels up from server/src/db)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../');
dotenv.config({ path: join(projectRoot, '.env') });

const { Pool } = pg;

// Determine SSL configuration
// Neon always requires SSL, local PostgreSQL typically doesn't
const isNeon = process.env.DATABASE_URL?.includes('neon.tech');
const sslConfig = isNeon 
  ? { rejectUnauthorized: false } // Neon requires SSL
  : process.env.NODE_ENV === 'production' 
  ? { rejectUnauthorized: false } 
  : false;

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please add DATABASE_URL to your .env file');
  // Don't exit in serverless environments - let the error be caught by route handlers
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    process.exit(1);
  }
}

// Only create pool if DATABASE_URL is available
export const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  // Connection pool settings optimized for serverless
  max: process.env.VERCEL ? 1 : 20, // Use 1 connection in serverless to avoid connection limits
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Reduced to 5 seconds - fail fast if DB is unreachable
  statement_timeout: 10000, // 10 second query timeout
  query_timeout: 10000, // 10 second query timeout
  // For serverless, we want to close connections quickly
  ...(process.env.VERCEL && {
    allowExitOnIdle: true,
  }),
}) : null;

if (pool) {
  pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Connected to PostgreSQL database');
    }
  });

  pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
    if (err.message.includes('SSL')) {
      console.error('💡 Tip: Make sure your DATABASE_URL includes ?sslmode=require for Neon');
    }
    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
      console.error('💡 Tip: Check if your Neon project is paused. Go to https://console.neon.tech to resume it');
    }
  });
}
