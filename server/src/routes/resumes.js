import express from 'express';
import OpenAI from 'openai';
import { pool } from '../db/connection.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import multer from 'multer';
import mammoth from 'mammoth';

// pdf-parse is a CommonJS module, use createRequire for ESM compatibility
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
// In Vercel/serverless, use /tmp directory (only writable location)
// In local dev, use project uploads directory
const getUploadDir = () => {
  if (process.env.VERCEL) {
    // Vercel serverless - use /tmp
    return '/tmp/uploads/resumes';
  }
  // Local development
  return path.join(__dirname, '../../uploads/resumes');
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create directory lazily when actually needed (not on module load)
    const uploadDir = getUploadDir();
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (error) {
        console.error('Failed to create upload directory:', error);
        return cb(error);
      }
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.userId;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  },
});

// Wrapper to handle multer errors
const handleUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      // File filter error
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
};

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
const resumeContentSchema = z.object({
  content: z.string(),
});

// Generate AI-enhanced bullets for all projects
router.post('/generate-project-bullets', async (req, res) => {
  try {
    const userId = req.userId;
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Get project details
    const projectResult = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Check if bullets already exist
    const existingBullets = await pool.query(
      'SELECT * FROM project_resume_bullets WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (existingBullets.rows.length > 0) {
      // Return existing bullets
      const bullets = existingBullets.rows.map(row => ({
        id: row.id,
        originalDescription: row.original_description,
        enhancedBullet: row.enhanced_bullet,
        impactExplanation: row.impact_explanation,
        keywords: row.keywords || [],
      }));
      return res.json({ bullets });
    }

    // Generate bullets using AI
    const openai = getOpenAIClient();
    const model = await getModel(openai);

    const systemPrompt = `You are an expert resume writer specializing in technical roles. Generate 3-5 compelling resume bullet points for a project. Each bullet should:
1. Start with a strong action verb (Architected, Implemented, Optimized, etc.)
2. Include specific technologies and tools
3. Quantify impact with metrics when possible
4. Highlight technical depth and problem-solving
5. Be concise (one line, max 2 lines)

Return a JSON array of bullet points with this structure:
[
  {
    "originalDescription": "Brief original description",
    "enhancedBullet": "Enhanced bullet point",
    "impactExplanation": "Why this works (what it demonstrates)",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]`;

    const userPrompt = `Generate resume bullets for this project:
Name: ${project.name}
Description: ${project.description || 'No description provided'}
Tech Stack: ${(project.tech_stack || []).join(', ') || 'Not specified'}
Status: ${project.status}
Progress: ${project.progress}%

Generate 3-5 compelling resume bullets that highlight technical achievements, impact, and skills.`;

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

    const aiResponse = completion.choices[0].message.content;
    let bulletsData;
    
    try {
      const parsed = JSON.parse(aiResponse);
      bulletsData = parsed.bullets || parsed.bulletPoints || parsed;
      if (!Array.isArray(bulletsData)) {
        bulletsData = [bulletsData];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Save bullets to database
    const savedBullets = [];
    for (const bullet of bulletsData) {
      const result = await pool.query(
        `INSERT INTO project_resume_bullets (
          user_id, project_id, original_description, 
          enhanced_bullet, impact_explanation, keywords
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          userId,
          projectId,
          bullet.originalDescription || project.description || '',
          bullet.enhancedBullet || bullet.enhanced_bullet || '',
          bullet.impactExplanation || bullet.impact_explanation || '',
          bullet.keywords || [],
        ]
      );
      savedBullets.push({
        id: result.rows[0].id,
        originalDescription: result.rows[0].original_description,
        enhancedBullet: result.rows[0].enhanced_bullet,
        impactExplanation: result.rows[0].impact_explanation,
        keywords: result.rows[0].keywords || [],
      });
    }

    res.json({ bullets: savedBullets });
  } catch (error) {
    console.error('Generate project bullets error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to generate project bullets' 
    });
  }
});

// Get bullets for all projects
router.get('/project-bullets', async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await pool.query(
      `SELECT prb.*, p.name as project_name, p.id as project_id
       FROM project_resume_bullets prb
       JOIN projects p ON prb.project_id = p.id
       WHERE prb.user_id = $1
       ORDER BY p.name, prb.created_at DESC`,
      [userId]
    );

    // Group by project
    const bulletsByProject = {};
    result.rows.forEach(row => {
      if (!bulletsByProject[row.project_id]) {
        bulletsByProject[row.project_id] = {
          projectId: row.project_id,
          projectName: row.project_name,
          bullets: [],
        };
      }
      bulletsByProject[row.project_id].bullets.push({
        id: row.id,
        originalDescription: row.original_description,
        enhancedBullet: row.enhanced_bullet,
        impactExplanation: row.impact_explanation,
        keywords: row.keywords || [],
      });
    });

    res.json({ bulletsByProject: Object.values(bulletsByProject) });
  } catch (error) {
    console.error('Get project bullets error:', error);
    res.status(500).json({ error: 'Failed to fetch project bullets' });
  }
});

// Upload resume file
router.post('/upload', handleUpload, async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please select a file.' });
    }

    // Extract text content from uploaded file
    let fileContent = '';
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      
      if (req.file.mimetype === 'text/plain') {
        // Plain text file
        fileContent = fileBuffer.toString('utf8');
      } else if (req.file.mimetype === 'application/pdf') {
        // PDF file - extract text using pdf-parse
        // pdf-parse v2.4.5 uses PDFParse class and requires Uint8Array instead of Buffer
        try {
          const { PDFParse } = require('pdf-parse');
          
          // Convert Buffer to Uint8Array as required by pdf-parse v2.x
          const uint8Array = new Uint8Array(fileBuffer);
          
          // Create a promise-based wrapper similar to pdf-parse v1.x API
          const parsePDF = (data) => {
            return new Promise((resolve, reject) => {
              try {
                const parser = new PDFParse(data);
                
                // Try to get text using getText() method
                if (typeof parser.getText === 'function') {
                  const textResult = parser.getText();
                  if (textResult instanceof Promise) {
                    textResult
                      .then(text => {
                        // Handle both string and object responses
                        if (typeof text === 'string') {
                          resolve({ text });
                        } else if (text && typeof text === 'object' && text.text) {
                          resolve({ text: text.text });
                        } else {
                          resolve({ text: String(text || '') });
                        }
                      })
                      .catch(reject);
                  } else if (typeof textResult === 'string') {
                    resolve({ text: textResult });
                  } else if (textResult && typeof textResult === 'object' && textResult.text) {
                    resolve({ text: textResult.text });
                  } else {
                    resolve({ text: String(textResult || '') });
                  }
                } else {
                  // If no getText(), the parser might be thenable or have the data directly
                  if (parser && typeof parser.then === 'function') {
                    parser.then(result => {
                      // Handle both string and object responses
                      if (typeof result === 'string') {
                        resolve({ text: result });
                      } else if (result && typeof result === 'object' && result.text) {
                        resolve({ text: result.text });
                      } else {
                        resolve({ text: String(result || '') });
                      }
                    }).catch(reject);
                  } else {
                    // Try to extract text from parser object
                    resolve({ text: parser.text || String(parser || '') });
                  }
                }
              } catch (error) {
                reject(error);
              }
            });
          };
          
          // Use the wrapper function with Uint8Array
          const pdfData = await parsePDF(uint8Array);
          // Extract text from pdfData - ensure it's always a string
          if (pdfData && typeof pdfData === 'object' && pdfData.text) {
            fileContent = String(pdfData.text || '');
          } else if (typeof pdfData === 'string') {
            fileContent = pdfData;
          } else {
            fileContent = String(pdfData || '');
          }
        } catch (parseError) {
          console.error('PDF parsing error:', parseError);
          throw new Error(`Failed to parse PDF: ${parseError.message}`);
        }
      } else if (req.file.mimetype === 'application/msword' || 
                 req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // DOC/DOCX file - extract text using mammoth
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        fileContent = result.value;
      } else {
        // Fallback for unknown file types
        fileContent = `[File uploaded: ${req.file.originalname}. Unable to extract text content.]`;
      }
      
      // Ensure fileContent is always a string before calling trim
      fileContent = String(fileContent || '');
      
      // Ensure we have some content
      if (!fileContent || fileContent.trim().length === 0) {
        fileContent = `[File uploaded: ${req.file.originalname}. Text extraction produced no content.]`;
      }
    } catch (readError) {
      console.error('Error extracting file content:', readError);
      fileContent = `[File uploaded: ${req.file.originalname}. Error extracting text: ${readError.message}]`;
    }

    // Save resume record
    const result = await pool.query(
      `INSERT INTO resumes (
        user_id, file_name, file_path, file_type, file_size, content
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        userId,
        req.file.originalname,
        req.file.path,
        req.file.mimetype,
        req.file.size,
        fileContent,
      ]
    );

    const resume = {
      id: result.rows[0].id,
      fileName: result.rows[0].file_name,
      filePath: result.rows[0].file_path,
      fileType: result.rows[0].file_type,
      fileSize: result.rows[0].file_size,
      content: result.rows[0].content,
      createdAt: result.rows[0].created_at,
    };

    res.json({ resume });
  } catch (error) {
    console.error('Upload resume error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload resume' });
  }
});

// Get AI feedback on resume
router.post('/feedback', async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, content } = req.body;

    let resumeContent = content;
    
    // If resumeId provided, get content from database
    if (resumeId && !content) {
      const resumeResult = await pool.query(
        'SELECT content FROM resumes WHERE id = $1 AND user_id = $2',
        [resumeId, userId]
      );
      
      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      
      resumeContent = resumeResult.rows[0].content;
    }

    if (!resumeContent) {
      return res.status(400).json({ error: 'Resume content is required' });
    }

    const openai = getOpenAIClient();
    const model = await getModel(openai);

    const systemPrompt = `You are an expert resume reviewer for technical roles. Provide constructive feedback on a resume. Focus on:
1. Technical content and achievements
2. Quantifiable metrics and impact
3. Action verbs and strong language
4. ATS (Applicant Tracking System) optimization
5. Missing information or areas for improvement
6. Overall structure and formatting suggestions

Provide feedback in a structured, actionable format.`;

    const userPrompt = `Review this resume and provide detailed feedback:\n\n${resumeContent}`;

    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const feedback = completion.choices[0].message.content;

    // Save feedback to database if resumeId provided
    if (resumeId) {
      await pool.query(
        'UPDATE resumes SET ai_feedback = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3',
        [feedback, resumeId, userId]
      );
    }

    res.json({ feedback });
  } catch (error) {
    console.error('Get resume feedback error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to get resume feedback' 
    });
  }
});

// Get AI recommendations/edits for resume
router.post('/recommendations', async (req, res) => {
  try {
    const userId = req.userId;
    const { resumeId, content } = req.body;

    let resumeContent = content;
    
    // If resumeId provided, get content from database
    if (resumeId && !content) {
      const resumeResult = await pool.query(
        'SELECT content FROM resumes WHERE id = $1 AND user_id = $2',
        [resumeId, userId]
      );
      
      if (resumeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Resume not found' });
      }
      
      resumeContent = resumeResult.rows[0].content;
    }

    if (!resumeContent) {
      return res.status(400).json({ error: 'Resume content is required' });
    }

    const openai = getOpenAIClient();
    const model = await getModel(openai);

    const systemPrompt = `You are an expert resume reviewer for technical roles. Analyze the resume and provide specific, actionable edits that can be applied directly.

For each edit, identify:
1. The exact original text that should be changed
2. The suggested replacement text
3. The reason/category (e.g., "Action Verb", "Quantification", "ATS Optimization", "Technical Depth", "Clarity")
4. A brief explanation of why this change improves the resume

Return a JSON object with this structure:
{
  "edits": [
    {
      "id": 1,
      "originalText": "exact text from resume to replace",
      "suggestedText": "improved replacement text",
      "category": "Action Verb" | "Quantification" | "ATS Optimization" | "Technical Depth" | "Clarity" | "Structure",
      "reason": "Brief explanation of why this change helps",
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "Overall summary of recommendations"
}

Focus on:
- Weak action verbs (e.g., "worked on" → "architected", "implemented")
- Missing quantifiable metrics
- ATS-unfriendly phrases
- Vague descriptions that need technical specificity
- Missing keywords relevant to the role
- Formatting and structure improvements

Provide 5-15 specific edits that can be directly applied.`;

    const userPrompt = `Analyze this resume and provide specific edits:\n\n${resumeContent}\n\nReturn only valid JSON with the edits array.`;

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

    let recommendations;
    try {
      recommendations = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', completion.choices[0].message.content);
      return res.status(500).json({ error: 'Failed to parse AI recommendations' });
    }

    // Ensure edits array exists and has proper structure
    if (!recommendations.edits || !Array.isArray(recommendations.edits)) {
      recommendations.edits = [];
    }

    // Add unique IDs if missing
    recommendations.edits = recommendations.edits.map((edit, index) => ({
      id: edit.id || `edit-${Date.now()}-${index}`,
      originalText: edit.originalText || '',
      suggestedText: edit.suggestedText || '',
      category: edit.category || 'General',
      reason: edit.reason || '',
      priority: edit.priority || 'medium',
    }));

    res.json({ 
      edits: recommendations.edits,
      summary: recommendations.summary || 'AI recommendations for your resume'
    });
  } catch (error) {
    console.error('Get resume recommendations error:', error);
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return res.status(503).json({ 
        error: 'OpenAI API is not configured. Please set OPENAI_API_KEY in your environment variables.' 
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to get resume recommendations' 
    });
  }
});

// Get user's resume
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    
    const result = await pool.query(
      `SELECT * FROM resumes 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ resume: null });
    }

    const row = result.rows[0];
    const resume = {
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      fileSize: row.file_size,
      content: row.content,
      aiFeedback: row.ai_feedback,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ resume });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Update resume content
router.put('/:id', async (req, res) => {
  try {
    const userId = req.userId;
    const resumeId = parseInt(req.params.id);
    const data = resumeContentSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE resumes 
       SET content = $1, updated_at = CURRENT_TIMESTAMP, version = version + 1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [data.content, resumeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const row = result.rows[0];
    const resume = {
      id: row.id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileType: row.file_type,
      fileSize: row.file_size,
      content: row.content,
      aiFeedback: row.ai_feedback,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ resume });
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    console.error('Update resume error:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Download resume
router.get('/:id/download', async (req, res) => {
  try {
    const userId = req.userId;
    const resumeId = parseInt(req.params.id);

    const result = await pool.query(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [resumeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = result.rows[0];

    // If file exists, serve it
    if (resume.file_path && fs.existsSync(resume.file_path)) {
      return res.download(resume.file_path, resume.file_name || 'resume.pdf');
    }

    // Otherwise, generate a text file from content
    const content = resume.content || 'Resume content not available';
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.file_name || 'resume.txt'}"`);
    res.send(content);
  } catch (error) {
    console.error('Download resume error:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
});

export default router;
