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
// OpenAI is imported in AI routes, not needed here

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../');
dotenv.config({ path: join(projectRoot, '.env') });

// Model detection is handled lazily in the AI routes (server/src/routes/ai.js)
// No need to initialize at module load - this prevents blocking serverless function startup

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
    // Add timeout to health check query
    const queryPromise = pool.query('SELECT 1');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Health check timeout')), 5000)
    );
    await Promise.race([queryPromise, timeoutPromise]);
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

// Model detection is handled lazily in the AI routes - no initialization needed here

// Vercel serverless function handler
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

// Export handler
export default handler;
