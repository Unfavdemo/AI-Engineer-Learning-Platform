# AI Engineer Learning Platform

A full-stack learning platform designed to help engineers build interview-worthy projects, track skills, and learn with AI mentorship.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for state management and API data fetching

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **Neon** (Serverless PostgreSQL) database
- **JWT** authentication
- **OpenAI GPT-4** for AI mentorship

## 📋 Prerequisites

- Node.js 18+ and npm
- Neon database account (free tier available)
- OpenAI API key

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Install root dependencies (for running both client and server)
npm install

# Install server dependencies
cd server
npm install
cd ..
```

### 2. Neon Database Setup

1. **Create a Neon account** (if you don't have one):
   - Go to [neon.tech](https://neon.tech)
   - Sign up for a free account

2. **Create a new project**:
   - In the Neon console, create a new project
   - Neon will automatically create a database for you

3. **Get your connection string**:
   - Go to your project dashboard
   - Click on "Connection Details"
   - Copy the connection string (it looks like: `postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`)

4. **Update `.env` file** with your Neon connection string:
```env
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

5. **Run database migrations**:
```bash
npm run db:migrate
```

### 3. Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```env
# Neon Database (get from https://console.neon.tech)
DATABASE_URL=postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# OpenAI API Key (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or run them separately:
# Terminal 1: Frontend (port 3000)
npm run dev:client

# Terminal 2: Backend (port 5000)
npm run dev:server
```

### 5. Create Your First Account

1. Navigate to `http://localhost:3000`
2. You'll be redirected to the login page
3. Click "Sign Up" to create a new account
4. After registration, you'll be logged in automatically

## 📁 Project Structure

```
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── *.tsx           # Feature components
├── src/
│   ├── lib/            # Utilities and API clients
│   │   ├── api.ts      # API client functions
│   │   └── auth.tsx    # Authentication context
│   └── main.tsx        # React entry point
├── server/
│   ├── src/
│   │   ├── db/         # Database schema and connection
│   │   ├── routes/     # API route handlers
│   │   ├── middleware/ # Express middleware
│   │   └── index.ts    # Server entry point
│   └── package.json    # Server dependencies
├── package.json        # Root package.json
└── vite.config.ts      # Vite configuration
```

## 🎯 Features

### ✅ Implemented
- User authentication (JWT-based)
- AI Mentor chat with OpenAI GPT-4
- Project management with milestones
- Skill tracking
- Dashboard with stats
- Protected routes
- Real-time data fetching with React Query

### 🚧 Coming Soon
- OAuth2 integration (Google/GitHub)
- Practice mode for interview prep
- Code analysis and review
- Resume builder
- WebSocket support for real-time updates

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Run both frontend and backend
npm run dev:client       # Run frontend only
npm run dev:server       # Run backend only

# Build
npm run build            # Build both frontend and backend
npm run build:client     # Build frontend only
npm run build:server     # Build backend only

# Database
npm run db:migrate       # Run database migrations

# Production
npm start                # Start production server
```

## 🔐 Authentication

The app uses JWT tokens for authentication. Tokens are stored in localStorage and automatically included in API requests. Tokens expire after 7 days.

## 🤖 AI Mentor

The AI Mentor uses OpenAI's GPT-4 API. Make sure to:
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env` file
3. Ensure you have credits in your OpenAI account

## 🗄️ Database Schema

The application uses Neon (serverless PostgreSQL) with the following main tables:
- `users` - User accounts
- `projects` - User projects
- `milestones` - Project milestones
- `skills` - User skills
- `ai_messages` - AI chat history
- `practice_sessions` - Interview practice sessions

## 🐛 Troubleshooting

### Database Connection Issues
- Verify your Neon connection string is correct
- Check DATABASE_URL in `.env` includes `?sslmode=require`
- Ensure your Neon project is active (not paused)
- Check Neon dashboard for connection details

### OpenAI API Errors
- Verify OPENAI_API_KEY is correct
- Check you have API credits
- Review API rate limits

### Port Already in Use
- Change PORT in `.env` (backend)
- Update vite.config.ts port (frontend)
- Update proxy settings if changed

## 📝 License

MIT

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
