import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const authApi = axios.create({
  baseURL: `${API_BASE_URL}`,
  timeout: 10000,
});

export const authService = {
  register: (email, password, username) => {
    return authApi.post('/api/v1/auth/register', { email, password, username });
  },
  
  login: (email, password) => {
    return authApi.post('/api/v1/auth/login', { email, password });
  },
  
  guestLogin: () => {
    return authApi.get('/api/v1/auth/guest');
  },

  validateToken: (token) => {
    return authApi.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getUserProfile: (token) => {
    return authApi.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};

export default authService;
