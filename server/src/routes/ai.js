import express from 'express';
import OpenAI from 'openai';
import { pool } from '../db/connection.js';
import { z } from 'zod';

const router = express.Router();

// Model priority list (best to worst)
const MODEL_PRIORITY = [
  'gpt-4o',
  'gpt-4-turbo',
  'gpt-4',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
];

// Cache for detected model (to avoid checking every request)
let detectedModel = null;
let modelDetectionInProgress = false;
let lastModelCheck = 0;
const MODEL_CHECK_INTERVAL = 3600000; // Check every hour (1 hour in ms)

// Detect which model is available with the API key
async function detectAvailableModel(openai) {
  // If we have a cached model and it's recent, use it
  if (detectedModel && (Date.now() - lastModelCheck) < MODEL_CHECK_INTERVAL) {
    return detectedModel;
  }

  // If detection is already in progress, wait a bit and return cached or default
  if (modelDetectionInProgress) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return detectedModel || 'gpt-3.5-turbo';
  }

  modelDetectionInProgress = true;
  lastModelCheck = Date.now();

  try {
    console.log('🔍 Detecting available OpenAI models...');
    
    // Test each model in priority order
    for (const model of MODEL_PRIORITY) {
      try {
        // Make a minimal test request to check if model is available
        const testResponse = await openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        });
        
        // If we get here, the model is available
        detectedModel = model;
        console.log(`✅ Detected available model: ${model}`);
        modelDetectionInProgress = false;
        return model;
      } catch (error) {
        // Model not available, try next one
        if (error.status === 404 || error.code === 'model_not_found' || 
            error.message?.toLowerCase().includes('model') ||
            error.message?.toLowerCase().includes('not found')) {
          console.log(`⚠️  Model ${model} not available, trying next...`);
          continue;
        }
        // Other error (auth, rate limit, etc.) - don't continue testing
        throw error;
      }
    }
    
    // No models available
    console.error('❌ No available models found');
    detectedModel = 'gpt-3.5-turbo'; // Default fallback
    modelDetectionInProgress = false;
    return detectedModel;
  } catch (error) {
    console.error('Error detecting models:', error.message);
    // On error, default to gpt-3.5-turbo (most commonly available)
    detectedModel = 'gpt-3.5-turbo';
    modelDetectionInProgress = false;
    return detectedModel;
  }
}

// Get the model to use - configurable via environment variable or auto-detected
const getModel = async (openai) => {
  // Allow override via environment variable
  const envModel = process.env.OPENAI_MODEL;
  if (envModel) {
    return envModel;
  }
  
  // Check if model was detected on startup
  if (process.env.DETECTED_MODEL) {
    detectedModel = process.env.DETECTED_MODEL;
    return detectedModel;
  }
  
  // Auto-detect available model
  if (openai) {
    return await detectAvailableModel(openai);
  }
  
  // Fallback if no OpenAI client provided
  return detectedModel || 'gpt-3.5-turbo';
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
    const openai = getOpenAIClient();
    const model = await getModel(openai);
    res.json({ 
      model,
      detected: !!detectedModel,
      priority: MODEL_PRIORITY,
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

    // Get the best available model (auto-detected or from env)
    const model = await getModel(openai);
    
    // Make the API call with the detected/configured model
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
    
    // Handle model not found - only show error if fallback also failed
    const isModelError = (err) => {
      return err.status === 404 || 
             err.response?.status === 404 ||
             err.code === 'model_not_found' ||
             err.message?.toLowerCase().includes('model') ||
             err.message?.toLowerCase().includes('not found') ||
             err.message?.toLowerCase().includes('does not exist');
    };
    
    if (isModelError(error)) {
      // If model detection failed, try to re-detect
      detectedModel = null;
      lastModelCheck = 0;
      return res.status(500).json({ 
        error: `The selected model is unavailable. The system will automatically detect and use the best available model on the next request.` 
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
