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

// Create pool - Pool constructor doesn't block, only connects on first query
// But we'll wrap query() to ensure timeouts
let _pool = null;

function createPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  
  if (_pool) {
    return _pool;
  }
  
  // Add statement_timeout to connection string if not already present
  let connectionString = process.env.DATABASE_URL;
  if (!connectionString.includes('statement_timeout')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}statement_timeout=5000`;
  }
  
  _pool = new Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    // Connection pool settings optimized for serverless
    max: process.env.VERCEL ? 1 : 20, // Use 1 connection in serverless to avoid connection limits
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 3000, // 3 seconds - fail very fast if DB is unreachable
    // For serverless, we want to close connections quickly
    ...(process.env.VERCEL && {
      allowExitOnIdle: true,
    }),
  });
  
  // Set up event listeners
  setupPoolListeners(_pool);
  
  // Wrap query method to always enforce timeout (5 seconds max)
  const originalQuery = _pool.query.bind(_pool);
  _pool.query = function(text, params, callback) {
    // Handle callback-style queries
    if (typeof params === 'function') {
      callback = params;
      params = undefined;
    }
    
    const QUERY_TIMEOUT = 5000; // 5 seconds max for any query
    
    const queryPromise = originalQuery(text, params, callback);
    
    // If callback is provided, pg handles it differently - just return the promise
    if (callback) {
      return queryPromise;
    }
    
    // Wrap in timeout for promise-based queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms - database may be unreachable or paused`));
      }, QUERY_TIMEOUT);
    });
    
    return Promise.race([queryPromise, timeoutPromise]);
  };
  
  return _pool;
}

// Export pool - create on first access
export const pool = process.env.DATABASE_URL ? createPool() : null;

// Set up event listeners when pool is created
function setupPoolListeners(poolInstance) {
  if (!poolInstance) return;
  
  poolInstance.on('connect', () => {
    if (process.env.NODE_ENV !== 'test') {
      console.log('✅ Connected to PostgreSQL database');
    }
  });

  poolInstance.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
    if (err.message.includes('SSL')) {
      console.error('💡 Tip: Make sure your DATABASE_URL includes ?sslmode=require for Neon');
    }
    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
      console.error('💡 Tip: Check if your Neon project is paused. Go to https://console.neon.tech to resume it');
    }
  });
}

// Initialize pool if DATABASE_URL is available
if (process.env.DATABASE_URL) {
  createPool();
}
