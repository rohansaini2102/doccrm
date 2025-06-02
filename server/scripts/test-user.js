const axios = require('axios');

const API_URL = 'https://doccrm-2.onrender.com/api';

async function testUser() {
  try {
    // Test user data
    const userData = {
      username: 'testuser',
      password: 'testpass123',
      email: 'test@example.com',
      fullName: 'Test User'
    };

    console.log('📝 Attempting to register test user...');
    
    // Register user
    const registerResponse = await axios.post(`${API_URL}/auth/register`, userData);
    console.log('✅ Registration response:', registerResponse.data);

    // Try to login
    console.log('\n🔐 Attempting to login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: userData.username,
      password: userData.password
    });
    console.log('✅ Login response:', loginResponse.data);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUser(); 