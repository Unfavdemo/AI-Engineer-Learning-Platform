// Vercel Serverless Function wrapper for Express app
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import serverless from 'serverless-http';
import { pool } from '../server/src/db/connection.js';
import authRoutes from '../server/src/routes/auth.js';
import projectsRoutes from '../server/src/routes/projects.js';
import skillsRoutes from '../server/src/routes/skills.js';
import aiRoutes from '../server/src/routes/ai.js';
import dashboardRoutes from '../server/src/routes/dashboard.js';
import conceptsRoutes from '../server/src/routes/concepts.js';
import resumesRoutes from '../server/src/routes/resumes.js';
import practiceRoutes from '../server/src/routes/practice.js';
import { authenticateToken } from '../server/src/middleware/auth.js';
import OpenAI from 'openai';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../');
dotenv.config({ path: join(projectRoot, '.env') });

// Initialize OpenAI model detection (cache in global scope for serverless)
let detectedModel = null;

async function initializeModelDetection() {
  if (detectedModel) {
    return detectedModel;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set, skipping model detection');
    detectedModel = 'gpt-3.5-turbo';
    return detectedModel;
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const MODEL_PRIORITY = [
      'gpt-4o',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-4o-mini',
      'gpt-3.5-turbo',
    ];

    console.log('🔍 Detecting available OpenAI models...');
    
    for (const model of MODEL_PRIORITY) {
      try {
        await openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        console.log(`✅ Detected available model: ${model}`);
        detectedModel = model;
        process.env.DETECTED_MODEL = model;
        return model;
      } catch (error) {
        if (error.status === 404 || error.code === 'model_not_found' || 
            error.message?.toLowerCase().includes('model') ||
            error.message?.toLowerCase().includes('not found')) {
          continue;
        }
        throw error;
      }
    }
    
    console.log('⚠️  No models detected, will use gpt-3.5-turbo as fallback');
    detectedModel = 'gpt-3.5-turbo';
    process.env.DETECTED_MODEL = 'gpt-3.5-turbo';
    return detectedModel;
  } catch (error) {
    console.error('❌ Error detecting models:', error.message);
    detectedModel = 'gpt-3.5-turbo';
    process.env.DETECTED_MODEL = 'gpt-3.5-turbo';
    return detectedModel;
  }
}

const app = express();

// Get the frontend URL for CORS
const getFrontendUrl = () => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

// Middleware
app.use(cors({
  origin: getFrontendUrl(),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handler for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('JSON parsing error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

// Initialize routesMounted variable
let routesMounted = false;

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Serverless function is working',
    timestamp: new Date().toISOString(),
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasOpenAiKey: !!process.env.OPENAI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelUrl: process.env.VERCEL_URL,
    },
    routesMounted,
  });
});

// Debug endpoint
app.post('/api/auth/debug', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Auth route is accessible',
    body: req.body,
    hasPool: !!pool,
    hasJwtSecret: !!process.env.JWT_SECRET,
    routesMounted,
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ 
        status: 'error', 
        database: 'not_configured', 
        error: 'DATABASE_URL is not set' 
      });
    }
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message,
      code: error.code 
    });
  }
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.path}`, {
    originalUrl: req.originalUrl,
    url: req.url,
    hasBody: !!req.body,
    routesMounted,
  });
  next();
});

// Mount routes
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', authenticateToken, aiRoutes);
  app.use('/api/projects', authenticateToken, projectsRoutes);
  app.use('/api/skills', authenticateToken, skillsRoutes);
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  app.use('/api/concepts', authenticateToken, conceptsRoutes);
  app.use('/api/resumes', authenticateToken, resumesRoutes);
  app.use('/api/practice', authenticateToken, practiceRoutes);
  routesMounted = true;
  console.log('✅ All routes mounted successfully');
} catch (error) {
  console.error('❌ Error mounting routes:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
  });
  routesMounted = false;
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    path: req.path,
  });
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development'
      ? err.message || 'Internal server error'
      : 'Internal server error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
  });
});

// Initialize model detection (non-blocking)
initializeModelDetection().catch((err) => {
  console.error('Failed to initialize model detection:', err.message);
});

// Vercel serverless function handler
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

// Export handler
export default handler;
