import React, { createContext, useContext, useState, useEffect } from 'react';
import { getToken, getUser, setToken, setUser, clearAuth, api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getUser());
  const [token, setTokenState] = useState(getToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUserState(res.user);
            setUser(res.user);
          } else {
            logout();
          }
        } catch (e) {
          console.warn('Session verification failed, logging out.');
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = (newUser, newToken) => {
    setUserState(newUser);
    setTokenState(newToken);
    setUser(newUser);
    setToken(newToken);
  };

  const logout = () => {
    setUserState(null);
    setTokenState('');
    clearAuth();
    api.logout();
  };

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.user) {
        setUserState(res.user);
        setUser(res.user);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, isStudent: user?.role === 'student', isWarden: user?.role === 'warden' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
