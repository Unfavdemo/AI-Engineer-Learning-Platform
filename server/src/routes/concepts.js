import express from 'express';
import OpenAI from 'openai';
import { pool } from '../db/connection.js';
import { z } from 'zod';

const router = express.Router();

// Get OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }
  return new OpenAI({ apiKey });
};

// Get available model (reuse logic from ai.js)
const getModel = async (openai) => {
  const envModel = process.env.OPENAI_MODEL;
  if (envModel) return envModel;
  if (process.env.DETECTED_MODEL) return process.env.DETECTED_MODEL;
  return 'gpt-4o-mini'; // Default for concept generation
};

// Schema validation
const createConceptSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  problem_it_solves: z.string().optional(),
  how_it_works: z.string().optional(),
  common_junior_mistakes: z.array(z.string()).optional(),
  senior_engineer_perspective: z.string().optional(),
  key_points: z.array(z.string()).optional(),
  example: z.string().optional(),
  related_concepts: z.array(z.string()).optional(),
});

const generateConceptSchema = z.object({
  topic: z.string().min(1),
  category: z.string().optional(),
});

// Get all concepts for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    
    // Check if concepts table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'concepts'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(500).json({ 
        error: 'Concepts table does not exist. Please run the database migration: npm run db:migrate' 
      });
    }
    
    const result = await pool.query(
      `SELECT * FROM concepts 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Map database fields to frontend format
    const concepts = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      problemItSolves: row.problem_it_solves,
      howItWorksUnderHood: row.how_it_works,
      commonJuniorMistakes: row.common_junior_mistakes || [],
      seniorEngineerPerspective: row.senior_engineer_perspective,
      keyPoints: row.key_points || [],
      example: row.example || '',
      relatedConcepts: row.related_concepts || [],
      createdAt: row.created_at,
    }));

    res.json({ concepts });
  } catch (error) {
    console.error('Get concepts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch concepts',
      details: error.message 
    });
  }
});

// Get a single concept
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const conceptId = parseInt(req.params.id);

    const result = await pool.query(
      `SELECT * FROM concepts 
       WHERE id = $1 AND user_id = $2`,
      [conceptId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    const row = result.rows[0];
    const concept = {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      problemItSolves: row.problem_it_solves,
      howItWorksUnderHood: row.how_it_works,
      commonJuniorMistakes: row.common_junior_mistakes || [],
      seniorEngineerPerspective: row.senior_engineer_perspective,
      keyPoints: row.key_points || [],
      example: row.example || '',
      relatedConcepts: row.related_concepts || [],
      createdAt: row.created_at,
    };

    res.json({ concept });
  } catch (error) {
    console.error('Get concept error:', error);
    res.status(500).json({ error: 'Failed to fetch concept' });
  }
});

// Generate a new concept using AI
router.post('/generate', async (req, res) => {
  try {
    const userId = req.userId;
    const { topic, category } = generateConceptSchema.parse(req.body);

    const openai = getOpenAIClient();
    const model = await getModel(openai);

    const systemPrompt = `You are an expert technical educator helping engineers understand complex concepts. Generate a comprehensive concept explanation in JSON format with the following structure:

{
  "title": "Concept title",
  "category": "Category name (e.g., JavaScript, Database, Backend, Security, etc.)",
  "description": "Brief 1-2 sentence description",
  "problemItSolves": "Detailed explanation of what problem this solves, formatted with markdown. Start with **What problem does this solve?**",
  "howItWorksUnderHood": "Technical deep dive on how it works internally, formatted with markdown. Start with **How it works under the hood:**",
  "commonJuniorMistakes": ["Mistake 1", "Mistake 2", "Mistake 3", "Mistake 4", "Mistake 5"],
  "seniorEngineerPerspective": "How a senior engineer thinks about this concept, formatted with markdown. Start with **How a senior engineer thinks:**",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "example": "Code example (if applicable, otherwise empty string)",
  "relatedConcepts": ["Related concept 1", "Related concept 2", "Related concept 3"]
}

Make it detailed, practical, and educational. Focus on helping junior engineers understand both the "what" and "why".`;

    const userPrompt = `Generate a comprehensive explanation for the concept: "${topic}"${category ? ` in the category: "${category}"` : ''}. Make it detailed and practical.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const aiResponse = completion.choices[0].message.content;
    let conceptData;
    
    try {
      conceptData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Save to database
    const result = await pool.query(
      `INSERT INTO concepts (
        user_id, title, category, description, 
        problem_it_solves, how_it_works, 
        common_junior_mistakes, senior_engineer_perspective,
        key_points, example, related_concepts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        conceptData.title || topic,
        conceptData.category || category || 'General',
        conceptData.description || '',
        conceptData.problemItSolves || '',
        conceptData.howItWorksUnderHood || '',
        conceptData.commonJuniorMistakes || [],
        conceptData.seniorEngineerPerspective || '',
        conceptData.keyPoints || [],
        conceptData.example || '',
        conceptData.relatedConcepts || [],
      ]
    );

    const row = result.rows[0];
    const concept = {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      problemItSolves: row.problem_it_solves,
      howItWorksUnderHood: row.how_it_works,
      commonJuniorMistakes: row.common_junior_mistakes || [],
      seniorEngineerPerspective: row.senior_engineer_perspective,
      keyPoints: row.key_points || [],
      example: row.example || '',
      relatedConcepts: row.related_concepts || [],
      createdAt: row.created_at,
    };

    res.json({ concept });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Generate concept error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to generate concept' 
    });
  }
});

// Create a concept manually
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const data = createConceptSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO concepts (
        user_id, title, category, description,
        problem_it_solves, how_it_works,
        common_junior_mistakes, senior_engineer_perspective,
        key_points, example, related_concepts
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        data.title,
        data.category || 'General',
        data.description || '',
        data.problem_it_solves || '',
        data.how_it_works || '',
        data.common_junior_mistakes || [],
        data.senior_engineer_perspective || '',
        data.key_points || [],
        data.example || '',
        data.related_concepts || [],
      ]
    );

    const row = result.rows[0];
    const concept = {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      problemItSolves: row.problem_it_solves,
      howItWorksUnderHood: row.how_it_works,
      commonJuniorMistakes: row.common_junior_mistakes || [],
      seniorEngineerPerspective: row.senior_engineer_perspective,
      keyPoints: row.key_points || [],
      example: row.example || '',
      relatedConcepts: row.related_concepts || [],
      createdAt: row.created_at,
    };

    res.json({ concept });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Create concept error:', error);
    res.status(500).json({ error: 'Failed to create concept' });
  }
});

// Update a concept
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const conceptId = parseInt(req.params.id);
    const data = createConceptSchema.partial().parse(req.body);

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (data.title) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.category) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.problem_it_solves !== undefined) {
      updates.push(`problem_it_solves = $${paramIndex++}`);
      values.push(data.problem_it_solves);
    }
    if (data.how_it_works !== undefined) {
      updates.push(`how_it_works = $${paramIndex++}`);
      values.push(data.how_it_works);
    }
    if (data.common_junior_mistakes !== undefined) {
      updates.push(`common_junior_mistakes = $${paramIndex++}`);
      values.push(data.common_junior_mistakes);
    }
    if (data.senior_engineer_perspective !== undefined) {
      updates.push(`senior_engineer_perspective = $${paramIndex++}`);
      values.push(data.senior_engineer_perspective);
    }
    if (data.key_points !== undefined) {
      updates.push(`key_points = $${paramIndex++}`);
      values.push(data.key_points);
    }
    if (data.example !== undefined) {
      updates.push(`example = $${paramIndex++}`);
      values.push(data.example);
    }
    if (data.related_concepts !== undefined) {
      updates.push(`related_concepts = $${paramIndex++}`);
      values.push(data.related_concepts);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(conceptId, userId);

    const result = await pool.query(
      `UPDATE concepts 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    const row = result.rows[0];
    const concept = {
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      problemItSolves: row.problem_it_solves,
      howItWorksUnderHood: row.how_it_works,
      commonJuniorMistakes: row.common_junior_mistakes || [],
      seniorEngineerPerspective: row.senior_engineer_perspective,
      keyPoints: row.key_points || [],
      example: row.example || '',
      relatedConcepts: row.related_concepts || [],
      createdAt: row.created_at,
    };

    res.json({ concept });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Update concept error:', error);
    res.status(500).json({ error: 'Failed to update concept' });
  }
});

// Delete a concept
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const conceptId = parseInt(req.params.id);

    const result = await pool.query(
      `DELETE FROM concepts 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [conceptId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Concept not found' });
    }

    res.json({ message: 'Concept deleted successfully' });
  } catch (error) {
    console.error('Delete concept error:', error);
    res.status(500).json({ error: 'Failed to delete concept' });
  }
});

export default router;
