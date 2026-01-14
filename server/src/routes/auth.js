import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';
import { z } from 'zod';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Helper function to wrap operations with overall timeout
// This ensures operations complete within a reasonable time
function withOperationTimeout(promise, timeoutMs, operationName) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(`${operationName} timed out after ${timeoutMs}ms. The server took too long to process your request. This may indicate that your Neon database is paused or experiencing issues. Please check https://console.neon.tech and try again.`);
        timeoutError.code = 'ETIMEDOUT';
        timeoutError.operationTimeout = true;
        reject(timeoutError);
      }, timeoutMs);
    })
  ]);
}

// Test endpoint to verify route is accessible
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route is working',
    hasPool: !!pool,
    hasJwtSecret: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString(),
  });
});

// Register
router.post('/register', async (req, res) => {
  // Detect serverless environment for timeout configuration
  const isServerless = !!(
    process.env.VERCEL || 
    process.env.VERCEL_URL || 
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    (process.env.NODE_ENV === 'production' && !process.env.PORT)
  );
  
  // Overall operation timeout: 7 seconds for serverless (less than client timeout of 8s)
  // This ensures we fail before the client times out and way before Vercel's 60s timeout
  const OPERATION_TIMEOUT = isServerless ? 7000 : 15000;
  
  // Wrap entire register operation with timeout
  const registerOperation = async () => {
    // Early validation checks (synchronous - no timeout needed)
    // Check if database is configured
    if (!pool) {
      res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable.' 
      });
      return;
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      res.status(503).json({ 
        error: 'Server configuration error: JWT_SECRET is not set. Please configure it in Vercel environment variables.' 
      });
      return;
    }

    // Parse and validate request body (can throw ZodError)
    let email, password, name;
    try {
      const parsed = registerSchema.parse(req.body);
      email = parsed.email;
      password = parsed.password;
      name = parsed.name;
    } catch (zodError) {
      // Handle validation errors early (before async operations)
      if (zodError.name === 'ZodError') {
        res.status(400).json({ 
          error: 'Invalid input', 
          details: zodError.errors,
          received: req.body,
        });
        return;
      }
      throw zodError; // Re-throw if not a ZodError
    }

    // Check if user exists (async operation - protected by overall timeout)
    let existingUser;
    try {
      existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
    } catch (dbError) {
      console.error('Database query error in register (check existing user):', {
        message: dbError.message,
        code: dbError.code,
        name: dbError.name,
      });
      
      // Check for database connection errors
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT' || 
          dbError.message?.includes('timeout') || dbError.message?.includes('Connection terminated') ||
          dbError.message?.includes('connect ECONNREFUSED') || dbError.message?.includes('Database operation timeout') ||
          dbError.message?.includes('Neon database')) {
        res.status(503).json({ 
          error: dbError.message || 'Database connection failed. Please check your DATABASE_URL and ensure your Neon project is not paused. If it was paused, wait a few seconds and try again.',
          code: dbError.code || 'ETIMEDOUT',
        });
        return;
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }

    if (existingUser.rows.length > 0) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    // Hash password (async operation - protected by overall timeout)
    // Bcrypt can be slow on serverless, but should still complete in <3 seconds
    let passwordHash;
    try {
      passwordHash = await bcrypt.hash(password, 10);
    } catch (bcryptError) {
      console.error('Bcrypt hash error:', bcryptError);
      res.status(500).json({ error: 'Password hashing failed. Please try again.' });
      return;
    }

    // Create user (async operation - protected by overall timeout)
    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, passwordHash, name || null]
      );
    } catch (dbError) {
      console.error('Database query error in register (create user):', {
        message: dbError.message,
        code: dbError.code,
        name: dbError.name,
      });
      
      // Check for unique violation (user created between check and insert)
      if (dbError.code === '23505') {
        res.status(400).json({ error: 'User already exists' });
        return;
      }
      
      // Check for database connection errors
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT' || 
          dbError.message?.includes('timeout') || dbError.message?.includes('Connection terminated') ||
          dbError.message?.includes('connect ECONNREFUSED') || dbError.message?.includes('Database operation timeout') ||
          dbError.message?.includes('Neon database')) {
        res.status(503).json({ 
          error: dbError.message || 'Database connection failed. Please check your DATABASE_URL and ensure your Neon project is not paused. If it was paused, wait a few seconds and try again.',
          code: dbError.code || 'ETIMEDOUT',
        });
        return;
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }

    const user = result.rows[0];

    // Generate JWT with longer expiration if "remember me" is checked
    const expiresIn = req.body.rememberMe ? '30d' : '7d';
    let token;
    try {
      token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn }
      );
    } catch (jwtError) {
      console.error('JWT signing error:', jwtError);
      res.status(500).json({ error: 'Failed to generate authentication token' });
      return;
    }

    // Success - send response
    if (res.headersSent) {
      return; // Safety check - shouldn't happen
    }
    
    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  };
  
  // Execute register operation with overall timeout
  try {
    await withOperationTimeout(
      registerOperation(),
      OPERATION_TIMEOUT,
      'Register operation'
    );
  } catch (error) {
    // Handle overall operation timeout (this catches any hanging operations)
    if (error.operationTimeout || (error.code === 'ETIMEDOUT' && error.message?.includes('Register operation'))) {
      console.error('Register operation timeout:', {
        message: error.message,
        timeoutMs: OPERATION_TIMEOUT,
        hasPool: !!pool,
        hasJwtSecret: !!process.env.JWT_SECRET,
      });
      
      if (!res.headersSent) {
        return res.status(504).json({ 
          error: error.message || 'Register request timed out. The server took too long to respond. This may indicate that your Neon database is paused. Please check https://console.neon.tech and try again.',
          code: 'TIMEOUT',
        });
      }
      return;
    }
    
    // Log full error details for debugging
    console.error('Register error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      body: req.body,
      hasPool: !!pool,
      hasJwtSecret: !!process.env.JWT_SECRET,
    });
    
    // Check for database connection/query timeouts (from connection.js wrapper)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.message?.includes('timeout') || error.message?.includes('Connection terminated') ||
        error.message?.includes('connect ECONNREFUSED') || error.message?.includes('Database operation timeout') ||
        error.message?.includes('Neon database')) {
      console.error('Database connection/timeout error:', {
        code: error.code,
        message: error.message,
      });
      
      if (!res.headersSent) {
        const errorMessage = error.message?.includes('Neon') 
          ? error.message
          : 'Database connection failed or timed out. Your Neon database may be paused - please check https://console.neon.tech and resume it if needed. If it was paused, wait a few seconds after resuming and try again.';
        
        return res.status(503).json({ 
          error: errorMessage,
          code: error.code || 'ETIMEDOUT',
        });
      }
      return;
    }
    
    // Check for unique violation (race condition - user created between check and insert)
    if (error.code === '23505') {
      if (!res.headersSent) {
        return res.status(400).json({ error: 'User already exists' });
      }
      return;
    }
    
    // Check for PostgreSQL-specific errors
    if (error.code && (error.code.startsWith('2') || error.code.startsWith('3'))) {
      if (!res.headersSent) {
        return res.status(500).json({ 
          error: 'Database error occurred',
          code: error.code,
          message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
      }
      return;
    }
    
    // Always return a proper error response
    if (!res.headersSent) {
      const errorMessage = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development'
        ? `Failed to register user: ${error.message || 'Unknown error'}`
        : 'Failed to register user. Please try again later.';
      
      res.status(500).json({ error: errorMessage });
    }
  }
});

// Login
router.post('/login', async (req, res) => {
  // Detect serverless environment for timeout configuration
  const isServerless = !!(
    process.env.VERCEL || 
    process.env.VERCEL_URL || 
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.FUNCTION_TARGET ||
    (process.env.NODE_ENV === 'production' && !process.env.PORT)
  );
  
  // Overall operation timeout: 7 seconds for serverless (less than client timeout of 8s)
  // This ensures we fail before the client times out and way before Vercel's 60s timeout
  const OPERATION_TIMEOUT = isServerless ? 7000 : 15000;
  
  // Wrap entire login operation with timeout
  const loginOperation = async () => {
    const operationStartTime = Date.now();
    console.log(`[LOGIN] Operation started at ${operationStartTime}, timeout: ${OPERATION_TIMEOUT}ms, isServerless: ${isServerless}`);
    
    // Early validation checks (synchronous - no timeout needed)
    // Check if database is configured
    if (!pool) {
      res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable.' 
      });
      return;
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      res.status(503).json({ 
        error: 'Server configuration error: JWT_SECRET is not set. Please configure it in Vercel environment variables.' 
      });
      return;
    }

    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({ error: 'Invalid request body' });
      return;
    }

    // Parse and validate request body (can throw ZodError)
    let email, password;
    try {
      const parsed = loginSchema.parse(req.body);
      email = parsed.email;
      password = parsed.password;
    } catch (zodError) {
      // Handle validation errors early (before async operations)
      if (zodError.name === 'ZodError') {
        res.status(400).json({ 
          error: 'Invalid input', 
          details: zodError.errors,
          received: req.body,
        });
        return;
      }
      throw zodError; // Re-throw if not a ZodError
    }

    // Find user (async operation - protected by overall timeout)
    let result;
    let queryStartTime = Date.now();
    try {
      // Query user directly (timeout is handled by pool wrapper - 4 seconds max for serverless)
      // This includes connection establishment + query execution
      result = await pool.query(
        'SELECT id, email, password_hash, name FROM users WHERE email = $1',
        [email]
      );
      let queryEndTime = Date.now();
      console.log(`Database query execution time: ${queryEndTime - queryStartTime}ms`);
    } catch (dbError) {
      let queryEndTime = Date.now();
      console.error(`Database query failed after ${queryEndTime - queryStartTime}ms`, dbError);
      
      // Check for database connection errors
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'ETIMEDOUT' || 
          dbError.message?.includes('timeout') || dbError.message?.includes('Connection terminated') ||
          dbError.message?.includes('connect ECONNREFUSED') || dbError.code === '57P01' ||
          dbError.message?.includes('Neon database')) {
        res.status(503).json({ 
          error: dbError.message || 'Database connection failed. Please check your DATABASE_URL and ensure your Neon project is not paused.',
          code: dbError.code || 'ETIMEDOUT',
        });
        return;
      }
      
      // Check for table doesn't exist errors
      if (dbError.code === '42P01' || dbError.message?.includes('does not exist')) {
        res.status(503).json({ 
          error: 'Database tables not found. Please run database migrations.',
          code: dbError.code,
        });
        return;
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    // Check if password_hash exists
    if (!user.password_hash) {
      console.error('User found but password_hash is missing:', user.id);
      res.status(500).json({ error: 'User account error. Please contact support.' });
      return;
    }

    // Verify password (async operation - protected by overall timeout)
    let isValid;
    const bcryptStartTime = Date.now();
    try {
      isValid = await bcrypt.compare(password, user.password_hash);
      const bcryptEndTime = Date.now();
      console.log(`[LOGIN] Bcrypt comparison took ${bcryptEndTime - bcryptStartTime}ms`);
    } catch (bcryptError) {
      const bcryptEndTime = Date.now();
      console.error(`[LOGIN] Bcrypt comparison failed after ${bcryptEndTime - bcryptStartTime}ms:`, bcryptError);
      res.status(500).json({ error: 'Password verification failed' });
      return;
    }

    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT with longer expiration if "remember me" is checked
    const expiresIn = req.body.rememberMe ? '30d' : '7d';
    let token;
    try {
      token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn }
      );
    } catch (jwtError) {
      console.error('JWT signing error:', jwtError);
      res.status(500).json({ error: 'Failed to generate authentication token' });
      return;
    }

    // Success - send response
    const operationEndTime = Date.now();
    const totalTime = operationEndTime - operationStartTime;
    console.log(`[LOGIN] Operation completed successfully in ${totalTime}ms`);
    
    if (res.headersSent) {
      return; // Safety check - shouldn't happen
    }
    
    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  };
  
  // Execute login operation with overall timeout
  const overallStartTime = Date.now();
  try {
    await withOperationTimeout(
      loginOperation(),
      OPERATION_TIMEOUT,
      'Login operation'
    );
    const overallEndTime = Date.now();
    console.log(`[LOGIN] Overall operation (including timeout wrapper) took ${overallEndTime - overallStartTime}ms`);
  } catch (error) {
    // Log full error details for debugging
    console.error('Login error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      body: req.body,
      hasPool: !!pool,
      hasJwtSecret: !!process.env.JWT_SECRET,
    });
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors,
        received: req.body,
      });
    }
    
    // Handle overall operation timeout (this catches any hanging operations)
    if (error.operationTimeout || (error.code === 'ETIMEDOUT' && error.message?.includes('Login operation'))) {
      const overallEndTime = Date.now();
      const totalTime = overallEndTime - overallStartTime;
      console.error(`[LOGIN] Operation timeout after ${totalTime}ms (configured timeout: ${OPERATION_TIMEOUT}ms):`, {
        message: error.message,
        timeoutMs: OPERATION_TIMEOUT,
        actualTime: totalTime,
        hasPool: !!pool,
        hasJwtSecret: !!process.env.JWT_SECRET,
        isServerless,
      });
      
      if (!res.headersSent) {
        return res.status(504).json({ 
          error: error.message || 'Login request timed out. The server took too long to respond. This may indicate that your Neon database is paused. Please check https://console.neon.tech and try again.',
          code: 'TIMEOUT',
        });
      }
      return;
    }
    
    // Check for database connection/query timeouts (from connection.js wrapper)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || 
        error.message?.includes('timeout') || error.message?.includes('Connection terminated') ||
        error.message?.includes('connect ECONNREFUSED') || error.message?.includes('Database operation timeout') ||
        error.message?.includes('Neon database')) {
      console.error('Database connection/timeout error:', {
        code: error.code,
        message: error.message,
      });
      
      if (!res.headersSent) {
        // Provide helpful error message about Neon pause
        const errorMessage = error.message?.includes('Neon') 
          ? error.message
          : 'Database connection failed or timed out. Your Neon database may be paused - please check https://console.neon.tech and resume it if needed. If it was paused, wait a few seconds after resuming and try again.';
        
        return res.status(503).json({ 
          error: errorMessage,
          code: error.code || 'ETIMEDOUT',
        });
      }
      return;
    }
    
    // Check for PostgreSQL-specific errors
    if (error.code && error.code.startsWith('2') || error.code && error.code.startsWith('3')) {
      return res.status(500).json({ 
        error: 'Database error occurred',
        code: error.code,
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
    
    // Check for missing DATABASE_URL
    if (error.message?.includes('DATABASE_URL') || (!process.env.DATABASE_URL && !pool)) {
      return res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable in Vercel.' 
      });
    }
    
    // Always return a proper error response
    // In production, show generic message but log details
    const errorMessage = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development'
      ? `Failed to login: ${error.message || 'Unknown error'}`
      : 'Failed to login. Please try again later.';
    
    // Make sure we haven't already sent a response
    if (res.headersSent) {
      console.error('Response already sent, cannot send error response for login');
      return;
    }
    
    try {
      const errorResponse = { 
        error: errorMessage,
        ...(process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' ? { 
          details: {
            name: error.name,
            code: error.code,
            message: error.message,
          }
        } : {}),
      };
      
      res.status(500).json(errorResponse);
      console.log('Login error response sent:', { 
        statusCode: 500, 
        hasDetails: !!errorResponse.details 
      });
    } catch (responseError) {
      console.error('Failed to send login error response:', {
        message: responseError.message,
        name: responseError.name,
        originalError: error.message,
      });
      // Last resort - try to end the response
      if (!res.headersSent) {
        try {
          res.status(500).end('Internal server error');
        } catch (e) {
          console.error('Completely failed to send response:', e);
        }
      }
    }
  }
});

// Verify token endpoint (protected)
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // This route is protected by authenticateToken middleware
    // If we get here, the token is valid
    const userId = req.userId;
    
    // Get user info
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;
