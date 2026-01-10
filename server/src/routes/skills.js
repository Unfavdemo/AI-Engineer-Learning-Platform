import express from 'express';
import { pool } from '../db/connection.js';
import { z } from 'zod';

const router = express.Router();

const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  level: z.number().min(0).max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  projectsCount: z.number().min(0).optional(),
});

// Get all skills
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, name, category, level, progress, projects_count, updated_at
       FROM skills 
       WHERE user_id = $1 
       ORDER BY category, name`,
      [userId]
    );

    const skills = result.rows.map((skill) => ({
      ...skill,
      projects: skill.projects_count,
    }));

    res.json({ skills });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Create or update skill
router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const data = skillSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO skills (user_id, name, category, level, progress, projects_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, name) 
       DO UPDATE SET 
         level = EXCLUDED.level,
         progress = EXCLUDED.progress,
         projects_count = EXCLUDED.projects_count,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, category, level, progress, projects_count, updated_at`,
      [
        userId,
        data.name,
        data.category,
        data.level || 0,
        data.progress || 0,
        data.projectsCount || 0,
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      projects: result.rows[0].projects_count,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create skill error:', error);
    res.status(500).json({ error: 'Failed to create/update skill' });
  }
});

// Update skill
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const skillId = parseInt(req.params.id);
    const data = skillSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE skills 
       SET name = COALESCE($1, name),
           category = COALESCE($2, category),
           level = COALESCE($3, level),
           progress = COALESCE($4, progress),
           projects_count = COALESCE($5, projects_count),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING id, name, category, level, progress, projects_count, updated_at`,
      [
        data.name || null,
        data.category || null,
        data.level ?? null,
        data.progress ?? null,
        data.projectsCount ?? null,
        skillId,
        userId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({
      ...result.rows[0],
      projects: result.rows[0].projects_count,
    });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update skill error:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

// Delete skill
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const skillId = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM skills WHERE id = $1 AND user_id = $2 RETURNING id',
      [skillId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

export default router;
