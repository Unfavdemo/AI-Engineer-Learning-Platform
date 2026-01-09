import express from 'express';
import { pool } from '../db/connection.js';
import { z } from 'zod';

const router = express.Router();

const projectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  status: z.enum(['planning', 'in-progress', 'completed']).optional(),
  progress: z.number().min(0).max(100).optional(),
});

const milestoneSchema = z.object({
  title: z.string().min(1),
  completed: z.boolean().optional(),
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const projectsResult = await pool.query(
      `SELECT id, name, description, tech_stack, progress, status, created_at, updated_at
       FROM projects 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    const projects = await Promise.all(
      projectsResult.rows.map(async (project) => {
        const milestonesResult = await pool.query(
          'SELECT id, title, completed FROM milestones WHERE project_id = $1 ORDER BY id',
          [project.id]
        );

        return {
          ...project,
          techStack: project.tech_stack || [],
          milestones: milestonesResult.rows,
        };
      })
    );

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);

    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    const milestonesResult = await pool.query(
      'SELECT id, title, completed FROM milestones WHERE project_id = $1 ORDER BY id',
      [projectId]
    );

    res.json({
      ...project,
      techStack: project.tech_stack || [],
      milestones: milestonesResult.rows,
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const data = projectSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, tech_stack, status, progress)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, description, tech_stack, progress, status, created_at, updated_at`,
      [
        userId,
        data.name,
        data.description || null,
        data.techStack || [],
        data.status || 'planning',
        data.progress || 0,
      ]
    );

    const project = result.rows[0];

    res.status(201).json({
      ...project,
      techStack: project.tech_stack || [],
      milestones: [],
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);
    const data = projectSchema.parse(req.body);

    // Verify ownership
    const existing = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      `UPDATE projects 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           tech_stack = COALESCE($3, tech_stack),
           status = COALESCE($4, status),
           progress = COALESCE($5, progress),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, description, tech_stack, progress, status, created_at, updated_at`,
      [
        data.name || null,
        data.description || null,
        data.techStack || null,
        data.status || null,
        data.progress ?? null,
        projectId,
        userId,
      ]
    );

    const project = result.rows[0];
    const milestonesResult = await pool.query(
      'SELECT id, title, completed FROM milestones WHERE project_id = $1 ORDER BY id',
      [projectId]
    );

    res.json({
      ...project,
      techStack: project.tech_stack || [],
      milestones: milestonesResult.rows,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [projectId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Add milestone
router.post('/:id/milestones', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);
    const data = milestoneSchema.parse(req.body);

    // Verify ownership
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      'INSERT INTO milestones (project_id, title, completed) VALUES ($1, $2, $3) RETURNING *',
      [projectId, data.title, data.completed || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Add milestone error:', error);
    res.status(500).json({ error: 'Failed to add milestone' });
  }
});

// Update milestone
router.put('/:id/milestones/:milestoneId', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);
    const milestoneId = parseInt(req.params.milestoneId);
    const { completed } = req.body;

    // Verify ownership
    const project = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const result = await pool.query(
      'UPDATE milestones SET completed = $1 WHERE id = $2 AND project_id = $3 RETURNING *',
      [completed, milestoneId, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Milestone not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ error: 'Failed to update milestone' });
  }
});

// Get AI recommendations for a project
router.get('/:id/recommendations', async (req, res) => {
  try {
    const userId = req.userId;
    const projectId = parseInt(req.params.id);

    // Verify ownership and get project
    const projectResult = await pool.query(
      `SELECT p.*, 
              COUNT(DISTINCT m.id) as milestone_count,
              COUNT(DISTINCT CASE WHEN m.completed = true THEN m.id END) as completed_milestones
       FROM projects p
       LEFT JOIN milestones m ON m.project_id = p.id
       WHERE p.id = $1 AND p.user_id = $2
       GROUP BY p.id`,
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];
    
    // Get user's skills to understand their level
    const skillsResult = await pool.query(
      `SELECT name, level, category 
       FROM skills 
       WHERE user_id = $1 
       ORDER BY level DESC 
       LIMIT 10`,
      [userId]
    );

    const userSkills = skillsResult.rows;
    
    // Import OpenAI
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Detect available model
    const MODEL_PRIORITY = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-4o-mini', 'gpt-3.5-turbo'];
    let model = process.env.OPENAI_MODEL || process.env.DETECTED_MODEL || 'gpt-3.5-turbo';
    
    // Try to use the best available model
    for (const testModel of MODEL_PRIORITY) {
      if (process.env.OPENAI_MODEL === testModel || process.env.DETECTED_MODEL === testModel) {
        model = testModel;
        break;
      }
    }

    const projectTechStack = project.tech_stack || [];
    const completionRate = project.milestone_count > 0 
      ? (project.completed_milestones / project.milestone_count) * 100 
      : 0;

    const prompt = `You are an expert engineering mentor helping a developer improve their project to make it interview-worthy and demonstrate hiring-level skills.

Project Details:
- Name: ${project.name}
- Description: ${project.description || 'No description'}
- Tech Stack: ${projectTechStack.join(', ') || 'Not specified'}
- Status: ${project.status}
- Progress: ${project.progress}%
- Milestone Completion: ${completionRate.toFixed(0)}%

User's Current Skills:
${userSkills.length > 0 
  ? userSkills.map(s => `- ${s.name} (${s.category}): ${s.level}%`).join('\n')
  : 'No skills tracked yet'}

Provide actionable recommendations to help this developer:
1. **Technical Improvements**: Specific technical enhancements that would make this project stand out
2. **Architecture Suggestions**: How to structure/refactor for scalability and best practices
3. **Skills to Develop**: What skills they should focus on to complete this project at a hiring level
4. **Interview Readiness**: What aspects they should be able to explain in an interview
5. **Next Steps**: Concrete, actionable steps to take next

Format your response as a JSON object with these keys:
{
  "technicalImprovements": ["improvement 1", "improvement 2", ...],
  "architectureSuggestions": ["suggestion 1", "suggestion 2", ...],
  "skillsToDevelop": [{"skill": "skill name", "reason": "why it matters", "priority": "high/medium/low"}, ...],
  "interviewReadiness": ["point 1", "point 2", ...],
  "nextSteps": ["step 1", "step 2", ...],
  "overallAssessment": "Brief summary of project's current state and potential"
}

Be specific, actionable, and focus on what would make this project demonstrate senior-level thinking.`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert engineering mentor. Provide structured, actionable advice in JSON format.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    let recommendations;
    try {
      recommendations = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      recommendations = {
        technicalImprovements: ['Review the project structure and add proper error handling'],
        architectureSuggestions: ['Consider implementing proper separation of concerns'],
        skillsToDevelop: [{ skill: 'System Design', reason: 'Important for interviews', priority: 'high' }],
        interviewReadiness: ['Be able to explain your technical decisions'],
        nextSteps: ['Continue building and documenting your decisions'],
        overallAssessment: 'Keep building and focus on explaining your technical choices.',
      };
    }

    res.json({ recommendations });
  } catch (error) {
    console.error('Get recommendations error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

export default router;
