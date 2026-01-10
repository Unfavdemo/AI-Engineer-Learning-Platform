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

// Get available model
const getModel = async (openai) => {
  const envModel = process.env.OPENAI_MODEL;
  if (envModel) return envModel;
  if (process.env.DETECTED_MODEL) return process.env.DETECTED_MODEL;
  return 'gpt-4o-mini';
};

// Schema validation
const analyzeResponseSchema = z.object({
  question: z.string(),
  questionCategory: z.string(),
  userResponse: z.string(),
  projectName: z.string().optional(),
});

// Analyze interview response
router.post('/analyze-response', async (req, res) => {
  try {
    const userId = req.userId;
    const data = analyzeResponseSchema.parse(req.body);
    
    const { question, questionCategory, userResponse, projectName } = data;

    if (!userResponse || userResponse.trim().length === 0) {
      return res.status(400).json({ error: 'User response is required' });
    }

    const openai = getOpenAIClient();
    const model = await getModel(openai);

    const systemPrompt = `You are an expert technical interviewer evaluating a candidate's response to an interview question. Provide constructive, actionable feedback.

Focus on:
1. **Clarity** (0-100): How clear and well-structured was the answer?
2. **Technical Depth** (0-100): How deep was the technical knowledge demonstrated?
3. **Problem-Solving Process**: Did they explain their reasoning, not just what they did?
4. **Trade-offs & Alternatives**: Did they consider alternatives and explain trade-offs?
5. **Scalability Thinking**: Did they think about scale, performance, and edge cases?
6. **Red Flags**: Signs of tutorial-trained thinking vs genuine understanding

Return a JSON object with this structure:
{
  "score": <0-100>,
  "clarity": <0-100>,
  "depth": <0-100>,
  "feedback": "<detailed feedback text>",
  "redFlags": ["flag1", "flag2"],
  "hireReadiness": "<hire-ready|getting-there|not-ready>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "acceptanceCriteria": [
    {
      "criterion": "<specific requirement>",
      "met": <true/false>,
      "reason": "<why it was met or not>"
    }
  ],
  "canProceed": <true/false - whether response meets minimum standards to proceed>
}`;

    const userPrompt = `Evaluate this interview response:

**Project:** ${projectName || 'Technical Project'}
**Question Category:** ${questionCategory}
**Question:** ${question}
**Candidate Response:** ${userResponse}

Provide detailed feedback with scores, red flags, and actionable improvements.

Also provide 3-5 acceptance criteria that the response must meet before proceeding. Each criterion should be specific and measurable. Examples:
- "Response demonstrates understanding of architectural components" (met/not met based on whether components were explained)
- "Candidate explains trade-offs or alternatives considered" (met/not met based on whether trade-offs were mentioned)
- "Answer shows technical depth beyond surface-level explanation" (met/not met based on depth of technical details)
- "Response is clear and well-structured" (met/not met based on clarity score)
- "Candidate explains reasoning behind decisions" (met/not met based on whether reasoning was provided)

Set canProceed to true only if at least 3 out of 5 criteria are met AND the score is above 60.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    let analysis;
    try {
      analysis = JSON.parse(completion.choices[0].message.content);
      
      // Ensure acceptance criteria is an array and has proper structure
      if (!analysis.acceptanceCriteria || !Array.isArray(analysis.acceptanceCriteria)) {
        analysis.acceptanceCriteria = [];
      }
      
      // Ensure canProceed is a boolean
      if (analysis.canProceed === undefined) {
        // Calculate canProceed based on score and criteria
        const metCriteriaCount = analysis.acceptanceCriteria.filter(c => c.met === true).length;
        analysis.canProceed = (analysis.score >= 60) && (metCriteriaCount >= 2);
      }
      
      // Validate acceptance criteria structure
      analysis.acceptanceCriteria = analysis.acceptanceCriteria.map(c => ({
        criterion: c.criterion || c.criteria || 'Unknown criterion',
        met: c.met === true,
        reason: c.reason || c.explanation || (c.met ? 'Criterion met' : 'Criterion not met'),
      }));
    } catch (parseError) {
      console.error('Failed to parse AI response:', completion.choices[0].message.content);
      return res.status(500).json({ error: 'Failed to parse AI analysis' });
    }

    // Save practice session to database (save each response as a session)
    // Note: In a production app, you might want to save multiple responses per session
    try {
      await pool.query(
        `INSERT INTO practice_sessions (user_id, score, questions_answered)
         VALUES ($1, $2, $3)`,
        [userId, analysis.score || 0, 1]
      );
    } catch (dbError) {
      console.error('Error saving practice session:', dbError);
      // Don't fail the request if DB save fails
    }

    res.json(analysis);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Analyze response error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to analyze response' 
    });
  }
});

// Get practice session history
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await pool.query(
      `SELECT * FROM practice_sessions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    const sessions = result.rows.map(row => ({
      id: row.id,
      score: row.score,
      questionsAnswered: row.questions_answered,
      createdAt: row.created_at,
      date: new Date(row.created_at).toLocaleDateString(),
    }));

    res.json({ sessions });
  } catch (error) {
    console.error('Get practice sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch practice sessions' });
  }
});

export default router;
