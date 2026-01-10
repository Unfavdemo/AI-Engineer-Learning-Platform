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
  // Use shorter timeout for serverless (3 seconds) to prevent gateway timeouts
  let connectionString = process.env.DATABASE_URL;
  const statementTimeout = process.env.VERCEL ? 3000 : 5000;
  if (!connectionString.includes('statement_timeout')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}statement_timeout=${statementTimeout}`;
  }
  
  _pool = new Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    // Connection pool settings optimized for serverless
    max: process.env.VERCEL ? 1 : 20, // Use 1 connection in serverless to avoid connection limits
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // 2 seconds - fail very fast if DB is unreachable (for serverless)
    // For serverless, we want to close connections quickly
    ...(process.env.VERCEL && {
      allowExitOnIdle: true,
    }),
  });
  
  // Set up event listeners
  setupPoolListeners(_pool);
  
  // Wrap query method to always enforce timeout (3 seconds max for serverless)
  // Shorter timeout for Vercel to prevent gateway timeouts
  const originalQuery = _pool.query.bind(_pool);
  _pool.query = function(text, params, callback) {
    // Handle callback-style queries (pg supports both callback and promise)
    if (typeof params === 'function') {
      callback = params;
      params = undefined;
    }
    
    // Aggressive timeout for serverless: 3 seconds max
    // This prevents the 60s gateway timeout by failing fast
    const QUERY_TIMEOUT = process.env.VERCEL ? 3000 : 5000;
    
    const queryPromise = originalQuery(text, params);
    
    // If callback is provided, we need to handle it differently
    // But pg returns a promise even when callback is used
    if (callback) {
      queryPromise
        .then(result => callback(null, result))
        .catch(err => callback(err, null));
    }
    
    // Wrap in timeout for all promise-based queries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`Database query timeout after ${QUERY_TIMEOUT}ms - database may be unreachable, paused, or experiencing issues`);
        timeoutError.code = 'ETIMEDOUT';
        reject(timeoutError);
      }, QUERY_TIMEOUT);
    });
    
    return Promise.race([queryPromise, timeoutPromise]).catch(err => {
      // Enhance error with timeout code
      if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
        err.code = 'ETIMEDOUT';
        err.message = err.message || `Database query timeout after ${QUERY_TIMEOUT}ms`;
      }
      throw err;
    });
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
