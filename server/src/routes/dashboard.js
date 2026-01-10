import express from 'express';
import { pool } from '../db/connection.js';

const router = express.Router();

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const userId = req.userId;

    // Get project counts
    const projectsStats = await pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'in-progress') as active_projects,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
         COUNT(*) as total_projects
       FROM projects 
       WHERE user_id = $1`,
      [userId]
    );

    // Get skills count
    const skillsStats = await pool.query(
      'SELECT COUNT(*) as skills_mastered FROM skills WHERE user_id = $1 AND level >= 70',
      [userId]
    );

    // Get practice sessions count
    const practiceStats = await pool.query(
      'SELECT COUNT(*) as practice_sessions FROM practice_sessions WHERE user_id = $1',
      [userId]
    );

    // Get total hours (estimated from projects and practice)
    const hoursStats = await pool.query(
      `SELECT 
         COALESCE(SUM(progress) * 0.5, 0) as estimated_hours
       FROM projects 
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      activeProjects: parseInt(projectsStats.rows[0].active_projects) || 0,
      skillsMastered: parseInt(skillsStats.rows[0].skills_mastered) || 0,
      practiceSessions: parseInt(practiceStats.rows[0].practice_sessions) || 0,
      hoursInvested: Math.round(parseFloat(hoursStats.rows[0].estimated_hours)) || 0,
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get recent projects
router.get('/recent-projects', async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 3;

    const result = await pool.query(
      `SELECT id, name, progress, status, updated_at
       FROM projects 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    const projects = result.rows.map((project) => ({
      id: project.id,
      name: project.name,
      progress: project.progress,
      status: project.status,
      lastUpdated: formatLastUpdated(project.updated_at),
    }));

    res.json({ projects });
  } catch (error) {
    console.error('Get recent projects error:', error);
    res.status(500).json({ error: 'Failed to fetch recent projects' });
  }
});

// Get notifications (mock for now, can be enhanced)
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.userId;

    // Get recent AI messages as notifications
    const result = await pool.query(
      `SELECT 
         'mentor' as type,
         content as message,
         created_at
       FROM ai_messages 
       WHERE user_id = $1 AND role = 'mentor'
       ORDER BY created_at DESC 
       LIMIT 5`,
      [userId]
    );

    const notifications = result.rows.map((notif, index) => ({
      id: index + 1,
      type: notif.type,
      message: notif.message.substring(0, 100) + (notif.message.length > 100 ? '...' : ''),
      time: formatLastUpdated(notif.created_at),
    }));

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get skill gaps (skills below 70%)
router.get('/skill-gaps', async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT name as skill, level
       FROM skills 
       WHERE user_id = $1 AND level < 70
       ORDER BY level ASC 
       LIMIT 5`,
      [userId]
    );

    res.json({ skillGaps: result.rows });
  } catch (error) {
    console.error('Get skill gaps error:', error);
    res.status(500).json({ error: 'Failed to fetch skill gaps' });
  }
});

function formatLastUpdated(date) {
  const now = new Date();
  const updated = new Date(date);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
}

export default router;
