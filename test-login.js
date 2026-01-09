// Test script to diagnose login endpoint issues
import axios from 'axios';

const API_URL = 'https://ai-engineer-learning-platform.vercel.app/api';

async function testEndpoints() {
  console.log('🔍 Testing endpoints...\n');

  // Test 1: Check if serverless function is working
  try {
    console.log('1. Testing /api/test...');
    const testResponse = await axios.get(`${API_URL}/test`);
    console.log('✅ /api/test:', testResponse.data);
    console.log('   Routes mounted:', testResponse.data.routesMounted);
    console.log('   Has DATABASE_URL:', testResponse.data.env.hasDatabaseUrl);
    console.log('   Has JWT_SECRET:', testResponse.data.env.hasJwtSecret);
  } catch (error) {
    console.error('❌ /api/test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  console.log('\n');

  // Test 2: Check database connection
  try {
    console.log('2. Testing /api/health...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ /api/health:', healthResponse.data);
  } catch (error) {
    console.error('❌ /api/health failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  console.log('\n');

  // Test 3: Check auth route
  try {
    console.log('3. Testing /api/auth/test...');
    const authTestResponse = await axios.get(`${API_URL}/auth/test`);
    console.log('✅ /api/auth/test:', authTestResponse.data);
  } catch (error) {
    console.error('❌ /api/auth/test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }

  console.log('\n');

  // Test 4: Try login with test credentials
  try {
    console.log('4. Testing /api/auth/login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123',
      rememberMe: false,
    });
    console.log('✅ /api/auth/login:', loginResponse.data);
  } catch (error) {
    console.error('❌ /api/auth/login failed:');
    console.error('   Message:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
      console.error('   Headers:', error.response.headers);
    } else if (error.request) {
      console.error('   No response received');
      console.error('   Request:', error.request);
    } else {
      console.error('   Error setting up request:', error.message);
    }
    console.error('   Full error:', error);
  }

  console.log('\n');

  // Test 5: Test debug endpoint
  try {
    console.log('5. Testing /api/auth/debug...');
    const debugResponse = await axios.post(`${API_URL}/auth/debug`, {
      email: 'test@example.com',
      password: 'test',
    });
    console.log('✅ /api/auth/debug:', debugResponse.data);
  } catch (error) {
    console.error('❌ /api/auth/debug failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testEndpoints().catch(console.error);
