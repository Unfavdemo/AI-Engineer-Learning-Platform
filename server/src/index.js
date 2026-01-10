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
  
  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    if (port !== parseInt(PORT)) {
      console.log(`⚠️  Port ${PORT} was in use, using port ${port} instead`);
      console.log(`⚠️  Update your .env file with PORT=${port} or stop the process using port ${PORT}`);
    }
    console.log(`🤖 Using OpenAI model: ${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`);
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
