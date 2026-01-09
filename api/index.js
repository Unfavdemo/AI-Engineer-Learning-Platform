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

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

// Routes - Vercel rewrites /api/* to /api, so we need to handle /api prefix
// The request path will be like /api/auth/login, so we mount at /api
app.use('/api/auth', authRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/projects', authenticateToken, projectsRoutes);
app.use('/api/skills', authenticateToken, skillsRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/concepts', authenticateToken, conceptsRoutes);
app.use('/api/resumes', authenticateToken, resumesRoutes);
app.use('/api/practice', authenticateToken, practiceRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Initialize model detection on module load (for serverless cold starts)
initializeModelDetection().catch(console.error);

// Vercel serverless function handler
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
});

export default handler;
