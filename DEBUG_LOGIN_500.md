# Debugging 500 Error on /api/auth/login

## Quick Diagnostic Steps

### 1. Test Serverless Function
Visit: `https://ai-engineer-learning-platform.vercel.app/api/test`

Expected response:
```json
{
  "status": "ok",
  "message": "Serverless function is working",
  "env": {
    "hasDatabaseUrl": true,
    "hasJwtSecret": true,
    ...
  },
  "routesMounted": true
}
```

If `routesMounted` is `false`, there's a route initialization error.

### 2. Test Database Connection
Visit: `https://ai-engineer-learning-platform.vercel.app/api/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected"
}
```

If you get an error, check:
- DATABASE_URL is set in Vercel environment variables
- Neon project is not paused
- Connection string is correct

### 3. Test Auth Route
Visit: `https://ai-engineer-learning-platform.vercel.app/api/auth/test`

Expected response:
```json
{
  "message": "Auth route is working",
  "hasPool": true,
  "hasJwtSecret": true
}
```

### 4. Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Functions** tab
4. Click on **View Logs**
5. Try to login again
6. Look for error messages in the logs

The logs will now show detailed error information including:
- Error message
- Error code
- Stack trace
- Request details

## Common Causes and Solutions

### 1. Missing Environment Variables

**Check in Vercel Dashboard → Settings → Environment Variables:**

- **DATABASE_URL** (Required)
  - Format: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
  - Must include `?sslmode=require` for Neon

- **JWT_SECRET** (Required)
  - Generate with: `openssl rand -base64 32`
  - Should be at least 32 characters

**Solution:** Add missing variables and redeploy.

### 2. Database Connection Issues

**Symptoms:**
- `/api/health` returns error
- Logs show connection timeout or ECONNREFUSED

**Solutions:**
1. Check if Neon project is paused:
   - Go to https://console.neon.tech
   - Resume the project if paused

2. Verify DATABASE_URL:
   - Check it's correct in Vercel environment variables
   - Ensure it includes `?sslmode=require`

3. Test connection locally:
   ```bash
   node server/test-connections.js
   ```

### 3. Database Tables Not Created

**Symptoms:**
- Logs show error code `42P01` (table does not exist)
- Error message mentions "does not exist"

**Solution:**
1. Run migrations:
   ```bash
   npm run db:migrate
   ```

2. Or manually create tables:
   - Go to Neon Console → SQL Editor
   - Run SQL from `server/src/db/schema.sql`

### 4. Route Initialization Error

**Symptoms:**
- `/api/test` shows `routesMounted: false`
- Logs show "Error mounting routes"

**Solution:**
- Check Vercel function logs for import errors
- Verify all dependencies are installed
- Check that `serverless-http` is in both root and server package.json

### 5. Module Import Errors

**Symptoms:**
- Function fails to start
- Logs show import/module errors

**Solution:**
1. Check `package.json` files:
   - Root `package.json` should have `serverless-http`
   - `server/package.json` should have all server dependencies

2. Verify install command in `vercel.json`:
   ```json
   "installCommand": "npm install && cd server && npm install"
   ```

## Enhanced Error Messages

The login route now provides more detailed error messages:

- **503 Service Unavailable**: Database or configuration issues
- **400 Bad Request**: Invalid input (validation errors)
- **401 Unauthorized**: Invalid credentials
- **500 Internal Server Error**: Unexpected errors (check logs)

## Debug Endpoints Added

1. **GET /api/test** - Test serverless function and environment
2. **GET /api/health** - Test database connection
3. **GET /api/auth/test** - Test auth route accessibility
4. **POST /api/auth/debug** - Debug auth route with request body

## Next Steps

1. **Check the diagnostic endpoints** above to identify the issue
2. **Review Vercel function logs** for detailed error information
3. **Verify environment variables** are set correctly
4. **Test database connection** using the health endpoint
5. **Check if tables exist** by running migrations

## Getting Help

If the issue persists:
1. Copy the full error message from Vercel logs
2. Check which diagnostic endpoint fails
3. Verify all environment variables are set
4. Share the error details for further assistance
