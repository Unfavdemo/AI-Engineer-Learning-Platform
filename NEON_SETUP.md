# Neon Database Setup Guide

This project uses [Neon](https://neon.tech), a serverless PostgreSQL database that's perfect for development and production.

## Why Neon?

- ✅ **Free tier available** - Perfect for development
- ✅ **Serverless** - No database server to manage
- ✅ **Auto-scaling** - Handles traffic spikes automatically
- ✅ **Branching** - Create database branches like Git branches
- ✅ **Automatic backups** - Never lose your data

## Quick Setup (5 minutes)

### 1. Create a Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Click "Sign Up" (you can use GitHub, Google, or email)
3. No credit card required for the free tier

### 2. Create a New Project

1. In the Neon console, click **"Create Project"**
2. Fill in:
   - **Project name**: `ai-engineer-platform` (or any name you like)
   - **Region**: Choose the region closest to you (e.g., `us-east-2`)
   - **PostgreSQL version**: Use the default (latest)
3. Click **"Create Project"**

Neon will automatically:
- Create a database
- Generate a connection string
- Set up SSL

### 3. Get Your Connection String

1. In your project dashboard, click **"Connection Details"**
2. You'll see a connection string that looks like:
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Click **"Copy"** to copy it

### 4. Add to Your `.env` File

Create or update your `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important**: Make sure the connection string includes `?sslmode=require` at the end.

### 5. Run Migrations

```bash
npm run db:migrate
```

This will create all the necessary tables in your Neon database.

### 6. Verify Connection

Start your server:

```bash
npm run dev
```

You should see:
```
✅ Connected to Neon database
```

## Neon Dashboard Features

### Connection Details
- **Connection string**: Use this in your `.env` file
- **Pooled connection**: Better for serverless environments (optional)
- **Direct connection**: Standard connection

### SQL Editor
- Run SQL queries directly from the Neon console
- Perfect for debugging and testing

### Database Branching
- Create branches of your database
- Test migrations without affecting production
- Merge branches when ready

### Monitoring
- View query performance
- Monitor connection usage
- Track database size

## Free Tier Limits

Neon's free tier includes:
- **512 MB storage** - Plenty for development
- **1 compute unit** - Handles moderate traffic
- **Automatic backups** - 7-day retention
- **Branching** - Create database branches

## Troubleshooting

### Connection Errors

**Error: "SSL connection required"**
- Make sure your connection string includes `?sslmode=require`
- Neon always requires SSL connections

**Error: "Connection timeout"**
- Check if your Neon project is paused (free tier pauses after inactivity)
- Go to Neon dashboard and click "Resume" if paused
- Verify your connection string is correct

**Error: "Database does not exist"**
- Neon creates the database automatically
- Use the database name from your connection string (usually `neondb`)

### Project Paused

If you see "Project paused" in the Neon dashboard:
- Click "Resume" to reactivate
- Free tier projects pause after 7 days of inactivity
- No data is lost when paused

## Production Considerations

When deploying to production:

1. **Upgrade Plan**: Consider upgrading from free tier for production workloads
2. **Connection Pooling**: Use Neon's connection pooler for better performance
3. **Backups**: Free tier includes 7-day backups; upgrade for longer retention
4. **Monitoring**: Use Neon's monitoring tools to track performance

## Need Help?

- [Neon Documentation](https://neon.tech/docs)
- [Neon Discord](https://discord.gg/neon-database)
- [Neon Support](https://neon.tech/docs/support)

## Alternative: Local PostgreSQL

If you prefer to use local PostgreSQL instead of Neon:

1. Install PostgreSQL locally
2. Create database: `CREATE DATABASE ai_engineer_platform;`
3. Update `.env`: `DATABASE_URL=postgresql://user:password@localhost:5432/ai_engineer_platform`
4. Remove `?sslmode=require` from connection string
5. The code will automatically detect it's not Neon and adjust SSL settings
