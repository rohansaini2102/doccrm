const axios = require('axios');

const API_URL = 'https://doccrm-2.onrender.com/api';

async function testAuthFlow() {
  try {
    // Test user data
    const userData = {
      username: 'testuser2',
      password: 'testpass123',
      email: 'test2@example.com',
      fullName: 'Test User 2'
    };

    console.log('📝 Step 1: Registering new user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('✅ Registration successful:', registerResponse.data.success);
    
    const token = registerResponse.data.token;
    console.log('🔑 Token received:', token ? 'Yes' : 'No');

    // Test token with protected endpoint
    console.log('\n🔐 Step 2: Testing token with protected endpoint...');
    try {
      const meResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Protected endpoint access successful:', meResponse.data.success);
    } catch (error) {
      console.error('❌ Protected endpoint access failed:', error.response?.data || error.message);
    }

    // Test login
    console.log('\n🔐 Step 3: Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: userData.username,
      password: userData.password
    });
    console.log('✅ Login successful:', loginResponse.data.success);
    
    const newToken = loginResponse.data.token;
    console.log('🔑 New token received:', newToken ? 'Yes' : 'No');

    // Test token persistence
    console.log('\n🔐 Step 4: Testing token persistence...');
    try {
      const meResponse2 = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      console.log('✅ Token persistence test successful:', meResponse2.data.success);
    } catch (error) {
      console.error('❌ Token persistence test failed:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('❌ Error in auth flow:', error.response?.data || error.message);
  }
}

testAuthFlow(); 