import dotenv from 'dotenv';
import { pool } from './src/db/connection.js';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function testEnvironmentVariables() {
  log('\n📋 Testing Environment Variables...', 'blue');
  
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'OPENAI_API_KEY',
  ];
  
  const optionalVars = [
    'PORT',
    'NODE_ENV',
    'FRONTEND_URL',
    'OPENAI_MODEL',
  ];
  
  let allPresent = true;
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      const value = process.env[varName];
      const displayValue = varName === 'DATABASE_URL' 
        ? value.substring(0, 30) + '...' 
        : varName === 'JWT_SECRET'
        ? value.substring(0, 10) + '...'
        : varName === 'OPENAI_API_KEY'
        ? value.substring(0, 10) + '...'
        : value;
      logSuccess(`${varName} is set (${displayValue})`);
    } else {
      logError(`${varName} is missing`);
      allPresent = false;
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      if (varName === 'OPENAI_MODEL') {
        const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'];
        if (validModels.includes(process.env[varName])) {
          logSuccess(`${varName} is set: ${process.env[varName]}`);
        } else {
          logWarning(`${varName} is set to ${process.env[varName]}, but it's not a recognized model. Valid models: ${validModels.join(', ')}`);
        }
      } else {
        logInfo(`${varName} is set: ${process.env[varName]}`);
      }
    } else {
      if (varName === 'OPENAI_MODEL') {
        logInfo(`${varName} is not set (will use gpt-4 with automatic fallback to gpt-3.5-turbo)`);
      } else {
        logWarning(`${varName} is not set (using default)`);
      }
    }
  }
  
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logWarning('JWT_SECRET should be at least 32 characters long for security');
  }
  
  return allPresent;
}

async function testDatabaseConnection() {
  log('\n🗄️  Testing Database Connection...', 'blue');
  
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW() as current_time, version() as version');
    logSuccess('Database connection successful');
    logInfo(`Current time: ${result.rows[0].current_time}`);
    logInfo(`PostgreSQL version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const expectedTables = ['users', 'projects', 'milestones', 'skills', 'ai_messages', 'practice_sessions'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    log('\n📊 Checking Database Tables...', 'blue');
    for (const table of expectedTables) {
      if (existingTables.includes(table)) {
        logSuccess(`Table '${table}' exists`);
      } else {
        logError(`Table '${table}' is missing`);
      }
    }
    
    // Check table structures
    if (existingTables.length > 0) {
      log('\n🔍 Checking Table Structures...', 'blue');
      for (const table of expectedTables) {
        if (existingTables.includes(table)) {
          const columnsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1 
            ORDER BY ordinal_position
          `, [table]);
          
          const columns = columnsResult.rows.map(row => row.column_name).join(', ');
          logInfo(`${table}: ${columnsResult.rows.length} columns (${columns})`);
        }
      }
    }
    
    return true;
  } catch (error) {
    logError(`Database connection failed: ${error.message}`);
    if (error.message.includes('SSL')) {
      logWarning('Make sure your DATABASE_URL includes ?sslmode=require for Neon');
    }
    if (error.message.includes('timeout')) {
      logWarning('Connection timeout - check if your Neon project is paused');
      logWarning('Go to https://console.neon.tech and resume your project if needed');
    }
    return false;
  }
}

async function testDatabaseOperations() {
  log('\n🧪 Testing Database Operations...', 'blue');
  
  try {
    // Test INSERT (create a test user if doesn't exist)
    const testEmail = 'test@example.com';
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);
    
    if (existingUser.rows.length === 0) {
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash('testpassword123', 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)',
        [testEmail, passwordHash, 'Test User']
      );
      logSuccess('Test user created successfully');
    } else {
      logInfo('Test user already exists');
    }
    
    // Test SELECT
    const userResult = await pool.query('SELECT id, email, name FROM users WHERE email = $1', [testEmail]);
    if (userResult.rows.length > 0) {
      logSuccess('SELECT query works');
    }
    
    // Test UPDATE
    await pool.query('UPDATE users SET name = $1 WHERE email = $2', ['Updated Test User', testEmail]);
    logSuccess('UPDATE query works');
    
    // Test DELETE (clean up test user)
    await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    logSuccess('DELETE query works');
    
    return true;
  } catch (error) {
    logError(`Database operations failed: ${error.message}`);
    if (error.message.includes('bcrypt')) {
      logWarning('Make sure bcryptjs is installed: npm install bcryptjs');
    }
    return false;
  }
}

async function testAPIEndpoints() {
  log('\n🌐 Testing API Configuration...', 'blue');
  
  const baseURL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const apiURL = baseURL.replace('3000', '5000') + '/api';
  
  logInfo(`API Base URL: ${apiURL}`);
  logInfo(`Frontend URL: ${baseURL}`);
  
  // Check if JWT_SECRET is set for auth
  if (process.env.JWT_SECRET) {
    logSuccess('JWT_SECRET is configured for authentication');
  } else {
    logError('JWT_SECRET is missing - authentication will not work');
  }
  
  // Check if OpenAI API key is set and test model detection
  if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.startsWith('sk-')) {
      logSuccess('OpenAI API key format looks correct');
      
      // Test model detection
      log('\n🤖 Testing OpenAI Model Detection...', 'blue');
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        
        const MODEL_PRIORITY = [
          'gpt-4o',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-4o-mini',
          'gpt-3.5-turbo',
        ];
        
        let detectedModel = null;
        for (const model of MODEL_PRIORITY) {
          try {
            await openai.chat.completions.create({
              model: model,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 1,
            });
            detectedModel = model;
            logSuccess(`Available model detected: ${model}`);
            break;
          } catch (error) {
            if (error.status === 404 || error.code === 'model_not_found') {
              logInfo(`Model ${model} not available`);
              continue;
            }
            throw error;
          }
        }
        
        if (!detectedModel) {
          logWarning('No models detected - this may indicate an API key issue');
        }
      } catch (error) {
        logWarning(`Could not test model detection: ${error.message}`);
      }
    } else {
      logWarning('OpenAI API key should start with "sk-"');
    }
  } else {
    logError('OPENAI_API_KEY is missing - AI Mentor will not work');
  }
  
  return true;
}

async function runAllTests() {
  log('\n🚀 Starting Connection Tests...\n', 'blue');
  
  const results = {
    envVars: false,
    dbConnection: false,
    dbOperations: false,
    apiConfig: false,
  };
  
  // Test 1: Environment Variables
  results.envVars = await testEnvironmentVariables();
  
  if (!results.envVars) {
    logError('\n❌ Environment variables test failed. Please check your .env file.');
    logInfo('Required variables: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY');
    await pool.end();
    process.exit(1);
  }
  
  // Test 2: Database Connection
  results.dbConnection = await testDatabaseConnection();
  
  if (!results.dbConnection) {
    logError('\n❌ Database connection test failed.');
    logInfo('Please check:');
    logInfo('1. Your DATABASE_URL is correct');
    logInfo('2. Your Neon project is active (not paused)');
    logInfo('3. Your connection string includes ?sslmode=require');
    await pool.end();
    process.exit(1);
  }
  
  // Test 3: Database Operations
  results.dbOperations = await testDatabaseOperations();
  
  // Test 4: API Configuration
  results.apiConfig = await testAPIEndpoints();
  
  // Summary
  log('\n📊 Test Summary:', 'blue');
  log(`Environment Variables: ${results.envVars ? '✅' : '❌'}`);
  log(`Database Connection: ${results.dbConnection ? '✅' : '❌'}`);
  log(`Database Operations: ${results.dbOperations ? '✅' : '❌'}`);
  log(`API Configuration: ${results.apiConfig ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    log('\n🎉 All tests passed! Your setup is ready for development.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Start the server: npm run dev:server');
    log('2. Start the client: npm run dev:client');
    log('3. Or start both: npm run dev');
    log('4. Navigate to http://localhost:3000');
  } else {
    log('\n⚠️  Some tests failed. Please fix the issues above before proceeding.', 'yellow');
  }
  
  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  logError(`\n💥 Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
