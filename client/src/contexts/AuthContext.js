import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      console.log('🔍 Fetching user profile...');
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('✅ User profile fetched successfully:', response.data);
      
      // Handle the response structure from the backend
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error.response?.data || error.message);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      console.log('🔐 Attempting login for:', username);
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      console.log('✅ Login response received:', response.data);

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      
      // Extract error message from response
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration:', userData);
      
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);

      console.log('✅ Registration response received:', response.data);

      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setUser(user);
        return user;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration failed:', error.response?.data || error.message);
      
      // Extract error message from response
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    localStorage.removeItem('token');
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