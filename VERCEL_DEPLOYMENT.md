# Vercel Deployment Guide

This guide will help you deploy the AI Engineer Learning Platform to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com))
2. A Neon database (see [NEON_SETUP.md](./NEON_SETUP.md))
3. OpenAI API key
4. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

## Step 2: Set Up Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Create a new project or select your existing project
3. Navigate to **Settings** → **Environment Variables**
4. Add the following environment variables:

### Required Environment Variables

```
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
JWT_SECRET=your-secure-random-secret-key-min-32-characters
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Optional Environment Variables

```
OPENAI_MODEL=gpt-4o
FRONTEND_URL=https://your-project.vercel.app
NODE_ENV=production
```

**Important Notes:**
- `DATABASE_URL`: Get this from your Neon dashboard
- `JWT_SECRET`: Generate a secure random string (at least 32 characters)
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `FRONTEND_URL`: Vercel will automatically set `VERCEL_URL`, but you can override with this
- Set these for **Production**, **Preview**, and **Development** environments as needed

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Vercel will automatically detect the configuration:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build:client`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install && cd server && npm install`
4. Click **Deploy**

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

## Step 4: Run Database Migration

After deployment, you need to run the database migration:

1. **Option A: Using Vercel CLI**
   ```bash
   vercel env pull .env.local
   npm run db:migrate
   ```

2. **Option B: Using Neon Console**
   - Go to your Neon dashboard
   - Open the SQL Editor
   - Run the SQL from `server/src/db/schema.sql`

## Step 5: Verify Deployment

1. Visit your deployed site: `https://your-project.vercel.app`
2. Check the health endpoint: `https://your-project.vercel.app/api/health`
3. Test the application:
   - Register a new account
   - Login
   - Test various features

## Project Structure for Vercel

```
.
├── api/
│   └── index.js          # Serverless function handler
├── components/           # React components
├── server/              # Server code (used by API handler)
├── src/                 # Frontend source
├── dist/                # Build output (generated)
├── vercel.json          # Vercel configuration
└── package.json         # Root package.json
```

## Important Notes

### File Uploads

⚠️ **Important**: Vercel serverless functions have a read-only filesystem except for `/tmp`, which is ephemeral. 

The resume upload feature currently uses local file storage. For production, consider:

1. **Vercel Blob Storage** (recommended for Vercel)
2. **AWS S3**
3. **Cloudinary**
4. **Supabase Storage**

To implement cloud storage, update `server/src/routes/resumes.js` to use your chosen storage service.

### API Routes

All API routes are handled by the serverless function at `/api/index.js`. The `vercel.json` configuration rewrites all `/api/*` requests to this handler.

### CORS Configuration

CORS is automatically configured to allow requests from your Vercel deployment URL. The `FRONTEND_URL` environment variable can override this if needed.

### Cold Starts

Serverless functions may experience cold starts (initial delay on first request). This is normal and subsequent requests will be faster.

### Function Timeout

The API function is configured with:
- **Max Duration**: 60 seconds
- **Memory**: 1024 MB

For longer-running operations (like AI responses), consider:
- Using streaming responses
- Breaking operations into smaller chunks
- Using background jobs

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly in Vercel
2. Check that your Neon database is not paused
3. Ensure SSL is enabled in the connection string (`?sslmode=require`)

### Build Errors

1. Check that all dependencies are listed in `package.json`
2. Ensure `serverless-http` is installed: `cd server && npm install serverless-http`
3. Check Vercel build logs for specific errors

### API Errors

1. Check Vercel function logs: **Deployments** → **Your Deployment** → **Functions** tab
2. Verify environment variables are set correctly
3. Check that the database migration has been run

### CORS Errors

1. Verify `FRONTEND_URL` matches your actual Vercel deployment URL
2. Check that CORS headers are properly configured in `api/index.js`

## Updating Your Deployment

After making changes:

1. Push to your Git repository
2. Vercel will automatically deploy (if auto-deploy is enabled)
3. Or manually trigger deployment from Vercel dashboard

## Custom Domain

To use a custom domain:

1. Go to **Settings** → **Domains**
2. Add your domain
3. Follow DNS configuration instructions
4. Update `FRONTEND_URL` environment variable if needed

## Monitoring

- **Vercel Analytics**: Built-in analytics available in dashboard
- **Function Logs**: View in **Deployments** → **Functions** tab
- **Error Tracking**: Consider integrating Sentry or similar service

## Support

For issues:
1. Check Vercel documentation: https://vercel.com/docs
2. Check function logs in Vercel dashboard
3. Review this guide and project documentation
