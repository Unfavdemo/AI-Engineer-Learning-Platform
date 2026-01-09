# Connection Testing Guide

This document explains how to test all connections and ensure your environment is properly configured.

## Quick Test

Run the comprehensive connection test:

```bash
npm run test:connections
```

This will verify:
- ✅ Environment variables are set correctly
- ✅ Database connection works
- ✅ Database operations (INSERT, SELECT, UPDATE, DELETE)
- ✅ API configuration
- ✅ Database schema (all tables exist)

## What Gets Tested

### 1. Environment Variables
- `DATABASE_URL` - Neon database connection string
- `JWT_SECRET` - Secret key for JWT authentication
- `OPENAI_API_KEY` - OpenAI API key for AI Mentor
- Optional: `PORT`, `NODE_ENV`, `FRONTEND_URL`

### 2. Database Connection
- Tests connection to PostgreSQL/Neon
- Verifies SSL configuration
- Checks PostgreSQL version
- Lists all database tables

### 3. Database Schema
Verifies all required tables exist:
- `users` - User accounts
- `projects` - User projects
- `milestones` - Project milestones
- `skills` - Skill tracking
- `ai_messages` - AI chat history
- `practice_sessions` - Interview practice sessions

### 4. Database Operations
Tests CRUD operations:
- CREATE (INSERT)
- READ (SELECT)
- UPDATE
- DELETE

### 5. API Configuration
- Verifies JWT_SECRET is set
- Checks OpenAI API key format
- Confirms API endpoints are configured

## Test Results

If all tests pass, you'll see:
```
🎉 All tests passed! Your setup is ready for development.
```

If tests fail, the script will provide specific error messages and tips to fix them.

## Common Issues

### Database Connection Failed
- **SSL Error**: Make sure your `DATABASE_URL` includes `?sslmode=require`
- **Timeout**: Check if your Neon project is paused. Go to https://console.neon.tech and resume it
- **Invalid URL**: Verify your connection string is correct

### Missing Environment Variables
- Check your `.env` file exists in the root directory
- Ensure all required variables are set (see `.env.example`)

### Database Tables Missing
Run the migration:
```bash
npm run db:migrate
```

## Manual Testing

### Test Database Connection
```bash
# Start the server
npm run dev:server

# Check the console for:
# ✅ Connected to PostgreSQL database
```

### Test API Endpoints

1. **Health Check**:
   ```bash
   curl http://localhost:5000/health
   ```

2. **Register User**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
   ```

3. **Login**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password123"}'
   ```

### Test Frontend
1. Start the frontend:
   ```bash
   npm run dev:client
   ```

2. Navigate to http://localhost:3000
3. Try to register/login
4. Check browser console for errors

## Environment Variables Checklist

Make sure your `.env` file has:

```env
# Required
DATABASE_URL=postgresql://...?sslmode=require
JWT_SECRET=your-secret-key-min-32-chars
OPENAI_API_KEY=sk-...

# Optional (have defaults)
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Next Steps After Testing

Once all tests pass:

1. **Start Development Servers**:
   ```bash
   npm run dev
   ```

2. **Create Your Account**:
   - Navigate to http://localhost:3000
   - Click "Sign Up"
   - Create your account

3. **Start Using the Platform**:
   - Create projects
   - Track skills
   - Chat with AI Mentor
   - Practice interviews

## Troubleshooting

### Test Script Not Found
Make sure you're in the project root directory:
```bash
cd "c:\projects\Personal Websites\AI-Engineer-Learning-Platform"
npm run test:connections
```

### Module Not Found Errors
Install dependencies:
```bash
npm install
cd server && npm install && cd ..
```

### Database Migration Needed
If tables are missing:
```bash
npm run db:migrate
```

## Continuous Testing

You can run the test script anytime to verify your setup:
- After changing environment variables
- After database migrations
- Before deploying
- When troubleshooting issues

The test script is safe to run multiple times - it cleans up any test data it creates.
