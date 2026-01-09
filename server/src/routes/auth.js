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

// Register
router.post('/register', async (req, res) => {
  try {
    // Check if database is configured
    if (!pool) {
      return res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ 
        error: 'Server configuration error: JWT_SECRET is not set. Please configure it in Vercel environment variables.' 
      });
    }

    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, passwordHash, name || null]
    );

    const user = result.rows[0];

    // Generate JWT with longer expiration if "remember me" is checked
    const expiresIn = req.body.rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Register error:', error);
    
    // Check for common database errors
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Provide more helpful error messages in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to register user: ${error.message || 'Unknown error'}`
      : 'Failed to register user. Please try again later.';
    
    res.status(500).json({ error: errorMessage });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    // Check if database is configured
    if (!pool) {
      return res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable.' 
      });
    }

    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      return res.status(503).json({ 
        error: 'Server configuration error: JWT_SECRET is not set. Please configure it in Vercel environment variables.' 
      });
    }

    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT with longer expiration if "remember me" is checked
    const expiresIn = req.body.rememberMe ? '30d' : '7d';
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Login error:', error);
    
    
    // Check for database connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('timeout') || error.message?.includes('Connection terminated')) {
      return res.status(503).json({ 
        error: 'Database connection failed. Please check your DATABASE_URL and ensure your Neon project is not paused.' 
      });
    }
    
    // Check for missing DATABASE_URL
    if (error.message?.includes('DATABASE_URL') || !process.env.DATABASE_URL) {
      return res.status(503).json({ 
        error: 'Database is not configured. Please set DATABASE_URL environment variable in Vercel.' 
      });
    }
    
    // Provide more helpful error messages in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? `Failed to login: ${error.message || 'Unknown error'}`
      : 'Failed to login. Please try again later.';
    
    res.status(500).json({ error: errorMessage });
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
    
    res.json({
      user: result.rows[0],
      valid: true,
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

export default router;
