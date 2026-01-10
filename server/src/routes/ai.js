import express from 'express';
import OpenAI from 'openai';
import { pool } from '../db/connection.js';
import { z } from 'zod';

const router = express.Router();

// Fixed model - no detection needed
const MODEL = 'gpt-4o-mini';

// Get the model to use - always returns gpt-4o-mini (configurable via env var if needed)
const getModel = () => {
  // Allow override via environment variable if needed
  return process.env.OPENAI_MODEL || MODEL;
};

// Lazy initialization of OpenAI client - only create when API key is available
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set. Please configure it in your .env file.');
  }
  return new OpenAI({
    apiKey: apiKey,
  });
};

const chatSchema = z.object({
  message: z.string().min(1),
});

// Get model info endpoint
router.get('/model', async (req, res) => {
  try {
    const model = getModel();
    res.json({ 
      model,
      fixed: true, // Model is fixed, not detected
    });
  } catch (error) {
    console.error('Get model info error:', error);
    res.status(500).json({ error: 'Failed to get model info' });
  }
});

// Get chat history
router.get('/messages', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT id, role, content, created_at 
       FROM ai_messages 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    res.json({ messages: result.rows.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message and get AI response
router.post('/chat', async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = chatSchema.parse(req.body);

    // Save user message
    await pool.query(
      'INSERT INTO ai_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'user', message]
    );

    // Get recent conversation history for context
    const historyResult = await pool.query(
      `SELECT role, content 
       FROM ai_messages 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    const conversationHistory = historyResult.rows.reverse().map((msg) => ({
      role: msg.role === 'mentor' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Call OpenAI API
    const openai = getOpenAIClient();
    const systemPrompt = `You are an AI mentor helping engineers learn and grow. You provide:
- Clear, practical explanations of technical concepts
- Code review and best practices
- Interview preparation advice
- Career guidance
- Project architecture suggestions

Be encouraging, detailed, and focus on helping them become better engineers.`;

    // Get the configured model (gpt-4o-mini by default)
    const model = getModel();
    
    // Make the API call with the configured model
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiResponse = completion.choices[0].message.content || 'I apologize, but I could not generate a response.';

    // Save AI response
    await pool.query(
      'INSERT INTO ai_messages (user_id, role, content) VALUES ($1, $2, $3)',
      [userId, 'mentor', aiResponse]
    );

    res.json({
      message: aiResponse,
      role: 'mentor',
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Chat error:', error);
    
    // Handle OpenAI API errors gracefully
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    if (error.status === 401 || error.response?.status === 401) {
      return res.status(500).json({ error: 'OpenAI API key is invalid. Please check your OPENAI_API_KEY in the .env file.' });
    }
    
    // Handle model not found errors
    if (error.status === 404 || 
        error.response?.status === 404 ||
        error.code === 'model_not_found' ||
        error.message?.toLowerCase().includes('model') ||
        error.message?.toLowerCase().includes('not found') ||
        error.message?.toLowerCase().includes('does not exist')) {
      return res.status(500).json({ 
        error: `The model "${getModel()}" is unavailable. Please check your OpenAI API key has access to this model.` 
      });
    }
    
    // Handle rate limiting
    if (error.status === 429 || error.response?.status === 429) {
      return res.status(429).json({ error: 'OpenAI API rate limit exceeded. Please try again later.' });
    }
    
    // Handle insufficient quota
    if (error.status === 402 || error.response?.status === 402 || error.message?.includes('quota')) {
      return res.status(402).json({ 
        error: 'Insufficient OpenAI API credits. Please add credits to your OpenAI account.' 
      });
    }
    
    // Handle other OpenAI errors
    if (error.response?.status) {
      return res.status(500).json({ 
        error: `OpenAI API error: ${error.response?.statusText || error.message || 'Unknown error'}` 
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: error.message || 'Failed to get AI response. Please try again.' 
    });
  }
});

export default router;
