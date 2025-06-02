import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Update the base URL to include /api
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://doccrm-2.onrender.com';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000, // 15 second timeout
  withCredentials: true, // Enable sending cookies
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Accept all status codes less than 500
  }
});

// Add request interceptor to add token to requests
api.interceptors.request.use(
  (config) => {
    // Log request details
    console.log('🚀 API Request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      data: config.data
    });

    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Log successful response
    console.log('✅ API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });

    // Check if response indicates success
    if (response.data && !response.data.success) {
      return Promise.reject(new Error(response.data.message || 'Request failed'));
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log detailed error information
    console.error('❌ API Error:', {
      url: originalRequest?.url,
      method: originalRequest?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      data: error.response?.data,
      headers: error.response?.headers
    });

    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error:', error);
      return Promise.reject(new Error('Network error. Please check your internet connection and try again.'));
    }

    // Handle CORS errors
    if (error.message.includes('CORS')) {
      console.error('🔄 CORS error:', error);
      return Promise.reject(new Error('CORS error. Please check your API configuration.'));
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout:', error);
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('🔄 Attempting token refresh...');
        const response = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
          refreshToken
        });

        if (!response.data.success) {
          throw new Error(response.data.message || 'Token refresh failed');
        }

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Update the failed request's authorization header
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        console.log('✅ Token refresh successful, retrying original request');
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // If refresh token fails, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
    return Promise.reject(new Error(errorMessage));
  }
);

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      console.log('🔍 Fetching user profile...');
      const response = await api.get('/api/auth/me');
      
      console.log('✅ User profile fetched successfully:', response.data);
      
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error.response?.data || error.message);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login for:', username);
      
      const response = await api.post('/api/auth/login', {
        username,
        password
      });

      console.log('✅ Login response received:', response.data);

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(user);
        return user;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration:', userData);
      
      const response = await api.post('/api/auth/register', userData);

      console.log('✅ Registration response received:', response.data);

      if (response.data.success) {
        const { accessToken, refreshToken, user } = response.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(user);
        return user;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message || 'Registration failed');
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};