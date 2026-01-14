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
  
  // Detect serverless environment (Vercel, Netlify, etc.)
  // VERCEL env var is set automatically by Vercel
  // Also check for common serverless indicators
  const isServerless = !!(
    process.env.VERCEL || 
    process.env.VERCEL_URL || 
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    (process.env.NODE_ENV === 'production' && !process.env.PORT)
  );
  
  // Add statement_timeout to connection string if not already present
  // Use shorter timeout for serverless to prevent gateway timeouts
  let connectionString = process.env.DATABASE_URL;
  const statementTimeout = isServerless ? 3000 : 5000; // 3s for serverless, 5s for local
  if (!connectionString.includes('statement_timeout')) {
    const separator = connectionString.includes('?') ? '&' : '?';
    connectionString = `${connectionString}${separator}statement_timeout=${statementTimeout}`;
  }
  
  // More aggressive timeouts for serverless environments
  const connectionTimeout = isServerless ? 2000 : 3000; // 2s for serverless, 3s for local
  
  _pool = new Pool({
    connectionString: connectionString,
    ssl: sslConfig,
    // Connection pool settings optimized for serverless
    max: process.env.VERCEL ? 1 : 20, // Use 1 connection in serverless to avoid connection limits
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: connectionTimeout, // Aggressive timeout for serverless
    // For serverless, we want to close connections quickly
    ...(process.env.VERCEL && {
      allowExitOnIdle: true,
    }),
  });
  
  // Set up event listeners
  setupPoolListeners(_pool);
  
  // Wrap query method to always enforce timeout (aggressive for serverless)
  // This wraps BOTH connection establishment AND query execution
  const originalQuery = _pool.query.bind(_pool);
  _pool.query = function(text, params, callback) {
    // Handle callback-style queries
    if (typeof params === 'function') {
      callback = params;
      params = undefined;
    }
    
    // Detect serverless environment for timeout configuration
    const isServerless = !!(
      process.env.VERCEL || 
      process.env.VERCEL_URL || 
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.FUNCTION_TARGET ||
      (process.env.NODE_ENV === 'production' && !process.env.PORT)
    );
    
    // More aggressive timeout for serverless to prevent gateway timeouts
    // Reduced to 3 seconds to ensure we fail well before Vercel's 60s timeout
    // This ensures we fail before client timeout (8s) and well before Vercel timeout (60s)
    const QUERY_TIMEOUT = isServerless ? 3000 : 5000; // 3s for serverless (includes connection), 5s for local
    
    // Start timeout BEFORE calling query - this ensures timeout fires even if query hangs
    let timeoutId;
    let queryCompleted = false;
    const timeoutError = new Error(`Database operation timeout after ${QUERY_TIMEOUT}ms. Connection establishment or query execution took too long. Your Neon database may be paused - please check https://console.neon.tech and resume it if needed.`);
    timeoutError.code = 'ETIMEDOUT';
    
    // Create timeout promise that will reject after QUERY_TIMEOUT
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!queryCompleted) {
          queryCompleted = true;
          console.error(`[DB] Query timeout triggered after ${QUERY_TIMEOUT}ms`);
          reject(timeoutError);
        }
      }, QUERY_TIMEOUT);
    });
    
    // Now call the actual query
    const queryPromise = originalQuery(text, params, callback);
    
    // Mark as completed when query finishes (success or error)
    const wrappedQueryPromise = Promise.resolve(queryPromise)
      .then(result => {
        if (!queryCompleted) {
          queryCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
        }
        return result;
      })
      .catch(err => {
        if (!queryCompleted) {
          queryCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
        }
        throw err;
      });
    
    // If callback is provided, wrap it with timeout handling
    if (callback) {
      const wrappedCallback = (err, result) => {
        if (!queryCompleted) {
          queryCompleted = true;
          if (timeoutId) clearTimeout(timeoutId);
        }
        callback(err, result);
      };
      
      // Race the query against the timeout for callback-based queries too
      Promise.race([wrappedQueryPromise, timeoutPromise])
        .then(result => wrappedCallback(null, result))
        .catch(err => wrappedCallback(err, null));
      
      return queryPromise;
    }
    
    // Use Promise.race to ensure timeout fires even if query hangs
    return Promise.race([wrappedQueryPromise, timeoutPromise]).catch(err => {
      // Enhance error with timeout code if it's a timeout
      if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
        err.code = 'ETIMEDOUT';
        // Preserve the enhanced error message
        if (!err.message.includes('Neon database')) {
          err.message = `Database operation timeout: ${err.message}`;
        }
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
