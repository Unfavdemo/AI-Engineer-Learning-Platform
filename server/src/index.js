import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { pool } from './db/connection.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import skillsRoutes from './routes/skills.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';
import conceptsRoutes from './routes/concepts.js';
import resumesRoutes from './routes/resumes.js';
import practiceRoutes from './routes/practice.js';
import { authenticateToken } from './middleware/auth.js';
import OpenAI from 'openai';

// Load .env from project root (two levels up from server/src)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');
dotenv.config({ path: join(projectRoot, '.env') });

// Initialize OpenAI model detection on startup
async function initializeModelDetection() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  OPENAI_API_KEY not set, skipping model detection');
    return;
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

    console.log('🔍 Detecting available OpenAI models on startup...');
    
    for (const model of MODEL_PRIORITY) {
      try {
        await openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        console.log(`✅ Detected available model: ${model}`);
        // Store in a way that the AI route can access
        process.env.DETECTED_MODEL = model;
        return;
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
    process.env.DETECTED_MODEL = 'gpt-3.5-turbo';
  } catch (error) {
    console.error('❌ Error detecting models:', error.message);
    process.env.DETECTED_MODEL = 'gpt-3.5-turbo';
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Routes
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

// Start server with port conflict handling
function startServer(port, maxAttempts = 10, attempt = 0) {
  if (attempt >= maxAttempts) {
    console.error(`❌ Could not find an available port after ${maxAttempts} attempts`);
    process.exit(1);
    return;
  }

  const server = createServer(app);
  
  server.listen(port, async () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    if (port !== parseInt(PORT)) {
      console.log(`⚠️  Port ${PORT} was in use, using port ${port} instead`);
      console.log(`⚠️  Update your .env file with PORT=${port} or stop the process using port ${PORT}`);
    }
    
    // Initialize model detection after server starts
    await initializeModelDetection();
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is in use, trying port ${port + 1}...`);
      server.close();
      // Try next port
      startServer(port + 1, maxAttempts, attempt + 1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

startServer(parseInt(PORT));
