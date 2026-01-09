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
// In Vercel, environment variables are automatically available
// But we still need to configure dotenv for local development
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
    // Vercel provides this automatically
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

// Simple test endpoint (no dependencies)
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
    }
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

// Request logging middleware (for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes - Vercel rewrites /api/* to /api, so we need to handle /api prefix
// The request path will be like /api/auth/login, so we mount at /api
// Wrap routes in try-catch to handle any import/initialization errors
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/ai', authenticateToken, aiRoutes);
  app.use('/api/projects', authenticateToken, projectsRoutes);
  app.use('/api/skills', authenticateToken, skillsRoutes);
  app.use('/api/dashboard', authenticateToken, dashboardRoutes);
  app.use('/api/concepts', authenticateToken, conceptsRoutes);
  app.use('/api/resumes', authenticateToken, resumesRoutes);
  app.use('/api/practice', authenticateToken, practiceRoutes);
} catch (error) {
  console.error('Error mounting routes:', error);
  // Add a fallback route to show the error
  app.use('/api/*', (req, res) => {
    res.status(500).json({
      error: 'Route initialization failed',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  });
}

// Error handling middleware - must be last
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' 
      ? err.message || 'Internal server error'
      : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize model detection on module load (for serverless cold starts)
// Wrap in try-catch to prevent module load failures
try {
  initializeModelDetection().catch((err) => {
    console.error('Failed to initialize model detection:', err.message);
    // Don't throw - allow the server to start even if model detection fails
  });
} catch (err) {
  console.error('Error during model detection setup:', err.message);
}

// Vercel serverless function handler
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
});

// Export the handler - serverless-http handles async errors automatically
export default handler;
