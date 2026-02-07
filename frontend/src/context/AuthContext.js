import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validate token on mount
    const validateStoredToken = async () => {
      const storedToken = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      const userEmail = localStorage.getItem('userEmail');
      
      if (storedToken) {
        // Don't validate guest tokens on reload - guest tokens may not work with /me endpoint
        if (userRole === 'guest') {
          setUser({ role: 'guest', email: userEmail || 'guest@gamestore.local' });
          setToken(storedToken);
          setLoading(false);
          return;
        }
        
        try {
          const response = await authService.validateToken(storedToken);
          setUser(response.data.user);
          setToken(storedToken);
        } catch (err) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
          setToken(null);
        }
      }
      setLoading(false);
    };

    validateStoredToken();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authService.login(email, password);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user?.role || 'user');
      localStorage.setItem('userEmail', user?.email || email);
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (username, email, password) => {
    try {
      setError(null);
      const response = await authService.register(email, password, username);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', user?.role || 'user');
      localStorage.setItem('userEmail', user?.email || email);
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const guestLogin = async () => {
    try {
      setError(null);
      const response = await authService.guestLogin();
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('userRole', 'guest');
      localStorage.setItem('userEmail', user?.email || 'guest@gamestore.local');
      setToken(token);
      setUser(user || { role: 'guest', email: 'guest@gamestore.local' });
      
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Guest login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      register,
      guestLogin,
      logout,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
