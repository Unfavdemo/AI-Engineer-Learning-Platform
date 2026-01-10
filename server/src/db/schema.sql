-- Create database (run this manually in PostgreSQL)
-- CREATE DATABASE ai_engineer_platform;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tech_stack TEXT[],
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 100),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  projects_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- AI Chat Messages table
CREATE TABLE IF NOT EXISTS ai_messages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'mentor')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Practice Sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  score INTEGER,
  questions_answered INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Concepts table
CREATE TABLE IF NOT EXISTS concepts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  problem_it_solves TEXT NOT NULL,
  how_it_works TEXT NOT NULL,
  common_junior_mistakes TEXT[] DEFAULT '{}',
  senior_engineer_perspective TEXT NOT NULL,
  key_points TEXT[] DEFAULT '{}',
  example TEXT,
  related_concepts TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255),
  file_path TEXT,
  file_type VARCHAR(50),
  file_size INTEGER,
  content TEXT,
  ai_feedback TEXT,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Resume Bullets table (stores AI-generated bullets for projects)
CREATE TABLE IF NOT EXISTS project_resume_bullets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  original_description TEXT,
  enhanced_bullet TEXT NOT NULL,
  impact_explanation TEXT,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id ON ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_concepts_user_id ON concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_resume_bullets_user_id ON project_resume_bullets(user_id);
CREATE INDEX IF NOT EXISTS idx_project_resume_bullets_project_id ON project_resume_bullets(project_id);
