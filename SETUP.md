# Quick Setup Guide

Follow these steps to get the AI Engineer Learning Platform running:

## Step 1: Install Dependencies

```bash
npm install
cd server && npm install && cd ..
```

## Step 2: Set Up Neon Database

1. **Create a Neon account** (free tier available):
   - Go to [neon.tech](https://neon.tech) and sign up
   - No credit card required for free tier

2. **Create a new project**:
   - In the Neon console, click "Create Project"
   - Choose a project name (e.g., "ai-engineer-platform")
   - Select a region closest to you
   - Neon will automatically create a database

3. **Get your connection string**:
   - In your project dashboard, click "Connection Details"
   - Copy the connection string
   - It will look like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Neon Database (get from https://console.neon.tech)
# Copy your connection string from Neon dashboard
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require

# JWT Secret (generate a secure random string)
JWT_SECRET=replace-with-random-secret-key-min-32-characters

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-openai-api-key-here

# OpenAI Model (optional - defaults to gpt-4 with automatic fallback to gpt-3.5-turbo)
# Options: gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini, gpt-3.5-turbo
# If not set, the system will try gpt-4 first and automatically fallback to gpt-3.5-turbo if unavailable
OPENAI_MODEL=gpt-4

# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Generate JWT Secret:
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.Guid]::NewGuid().ToString() + [System.Guid]::NewGuid().ToString()))
```

## Step 4: Run Database Migration

```bash
npm run db:migrate
```

This will create all necessary tables in your database.

## Step 5: Start the Application

```bash
npm run dev
```

This starts both:
- Frontend at http://localhost:3000
- Backend at http://localhost:5000

## Step 6: Create Your Account

1. Open http://localhost:3000 in your browser
2. Click "Sign Up"
3. Enter your email and password
4. Start using the platform!

## Troubleshooting

### "Database connection error"
- Verify your Neon connection string is correct and includes `?sslmode=require`
- Check that your Neon project is active (not paused)
- Verify connection string format in `.env` matches Neon dashboard
- Try copying the connection string again from Neon console
- Check Neon dashboard for any service issues

### "OpenAI API error"
- Verify your API key is correct
- Check you have credits: https://platform.openai.com/usage
- If using GPT-4, ensure your API key has GPT-4 access
- The system will automatically fallback to GPT-3.5-turbo if GPT-4 is unavailable
- You can explicitly set `OPENAI_MODEL=gpt-3.5-turbo` in `.env` to use GPT-3.5-turbo directly

### "Port 3000/5000 already in use"
- Change ports in `.env` (PORT) and `vite.config.ts` (server.port)
- Or kill the process using the port

## Next Steps

- Start creating projects
- Chat with the AI Mentor
- Track your skills
- Build your learning journey!
