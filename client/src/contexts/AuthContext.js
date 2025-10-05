import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import '../styles/global.css'

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        setLoading(true);
        try {
          authAPI.setAuthToken(token);
          const userData = await authAPI.getProfile();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('token');
          authAPI.removeAuthToken();
          setUser(null);
        }
        setLoading(false);
      }
      setInitialized(true);
    };

    initializeAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        setLoading(true);
        try {
          authAPI.setAuthToken(token);
          const userData = await authAPI.getProfile();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('token');
          authAPI.removeAuthToken();
          setUser(null);
        }
        setLoading(false);
      }
    } finally {
      setInitialized(true);
    }
  };

  const login = async (identifier, password) => {
    try {
      setError(null);
      setLoading(true);
      const { token, user: loginUser, isVerified } = await authAPI.login(identifier, password);
      
      // Check if user is verified
      if (isVerified === false) {
        setLoading(false);
        // Return object with verification status so UI can show appropriate message
        return { isVerified: false, email: loginUser.email };
      }
      
      // Check if password change is required from the login response first
      if (loginUser.passwordChangeRequired) {
        // Store token temporarily for password change process
        localStorage.setItem('token', token);
        authAPI.setAuthToken(token);
        
        setLoading(false);
        return { isVerified: true, passwordChangeRequired: true, userData: loginUser };
      }
      
      // Store token and set default header
      localStorage.setItem('token', token);
      authAPI.setAuthToken(token);
      
      // Fetch complete user profile immediately after login
      const userData = await authAPI.getProfile();
      
      // Double-check if password change is required from the profile
      if (userData.passwordChangeRequired) {
        setLoading(false);
        return { isVerified: true, passwordChangeRequired: true, userData };
      }
      
      setUser(userData);
      
      setLoading(false);
      return { isVerified: true, passwordChangeRequired: false, userData };
    } catch (err) {
      setLoading(false);
      setError(err.message || 'An error occurred during login');
      throw err;
    }
  };

  const resendVerification = async (email) => {
    try {
      setLoading(true);
      await authAPI.resendVerificationEmail(email);
      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to resend verification email');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    authAPI.removeAuthToken();
    setUser(null);
  };

  // Only show loading UI when we're actually checking auth, not during initial page load
  if (!initialized && localStorage.getItem('token')) {
    return (
          <div className="load">
            <div id="wifi-loader">
              <svg className="circle-outer" viewBox="0 0 86 86">
                <circle className="back" cx={43} cy={43} r={40} />
                <circle className="front" cx={43} cy={43} r={40} />
                <circle className="new" cx={43} cy={43} r={40} />
              </svg>
              <svg className="circle-middle" viewBox="0 0 60 60">
                <circle className="back" cx={30} cy={30} r={27} />
                <circle className="front" cx={30} cy={30} r={27} />
              </svg>
              <svg className="circle-inner" viewBox="0 0 34 34">
                <circle className="back" cx={17} cy={17} r={14} />
                <circle className="front" cx={17} cy={17} r={14} />
              </svg>
              <div className="text" data-text="Loading Dashboard..." />
            </div>
          </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, checkAuth, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};