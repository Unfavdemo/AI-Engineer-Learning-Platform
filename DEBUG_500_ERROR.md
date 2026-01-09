# Debugging 500 Error on Login

## Quick Test Steps

1. **Test if serverless function is loading:**
   ```
   https://ai-engineer-learning-platform.vercel.app/api/test
   ```
   This should return environment variable status without requiring database.

2. **Test database connection:**
   ```
   https://ai-engineer-learning-platform.vercel.app/api/health
   ```
   This will show if DATABASE_URL is configured and if the database is reachable.

3. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Functions → View Logs
   - Look for error messages when you try to login
   - The logs will show the actual error causing the 500

## Common Causes of 500 Error

### 1. Missing Environment Variables
Check in Vercel Dashboard → Settings → Environment Variables:

- **DATABASE_URL** (Required)
  - Should be your Neon database connection string
  - Format: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
  
- **JWT_SECRET** (Required)
  - Should be a secure random string (at least 32 characters)
  - Generate with: `openssl rand -base64 32`
  
- **OPENAI_API_KEY** (Optional, but needed for AI features)
  - Should start with `sk-`

### 2. Database Connection Issues

- **Neon Project Paused:**
  - Go to https://console.neon.tech
  - Check if your project is paused
  - Resume it if needed

- **Invalid DATABASE_URL:**
  - Verify the connection string is correct
  - Make sure it includes `?sslmode=require` at the end

- **Database Tables Not Created:**
  - Run migrations: `npm run db:migrate` locally
  - Or manually create tables using the schema in `server/src/db/schema.sql`

### 3. Module Import Errors

If you see import errors in logs:
- Check that all dependencies are installed
- Verify `package.json` has all required packages
- Check that serverless-http is installed

## What Was Fixed

1. ✅ **React Error #31** - Fixed error object rendering
2. ✅ **Database Connection** - Made pool nullable, won't crash on missing DATABASE_URL
3. ✅ **JWT_SECRET Check** - Added validation in middleware and routes
4. ✅ **Error Handling** - Improved error messages and logging
5. ✅ **Serverless Optimization** - Optimized connection pool for Vercel

## Next Steps

1. Deploy the latest changes to Vercel
2. Check the `/api/test` endpoint to verify environment variables
3. Check the `/api/health` endpoint to verify database connection
4. Review Vercel function logs for specific error messages
5. Verify all environment variables are set correctly

## Getting More Details

The error messages should now be more descriptive. Check:
- Browser console for frontend errors
- Vercel function logs for backend errors
- Network tab in browser DevTools to see the actual error response
