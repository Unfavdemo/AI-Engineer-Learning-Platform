import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate token and restore session on app load
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = authAPI.getCurrentUser();
      
      if (token && storedUser) {
        try {
          // Verify token is still valid by making a test request
          const isValid = await authAPI.verifyToken();
          if (isValid) {
            setUser(storedUser);
          } else {
            // Token is invalid, clear storage
            authAPI.logout();
          }
        } catch (error) {
          // Token validation failed (might be network error or invalid token)
          // Only clear storage if it's an auth error, not a network error
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            authAPI.logout();
          }
          // For network errors, keep the user but they'll need to login when server is available
        }
      }
      setIsLoading(false);
    };

    restoreSession().catch((error) => {
      // Catch any unexpected errors during session restoration
      console.error('Error during session restoration:', error);
      setIsLoading(false);
    });
  }, []);

  const login = async (email, password, rememberMe = false) => {
    const data = await authAPI.login(email, password, rememberMe);
    setUser(data.user);
  };

  const register = async (email, password, name, rememberMe = false) => {
    const data = await authAPI.register(email, password, name, rememberMe);
    setUser(data.user);
  };

  const logout = () => {
    authAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null || context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
