import React, { createContext, useContext, useState, useEffect } from 'react';
import { type User, loginApi, registerApi, fetchMeApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, fullName?: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('civiclens_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('civiclens_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // If token exists, verify with backend /auth/me
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('civiclens_token');
      if (storedToken) {
        try {
          const freshUser = await fetchMeApi();
          setUser(freshUser);
          localStorage.setItem('civiclens_user', JSON.stringify(freshUser));
        } catch {
          // Token expired or invalid
          logout();
        }
      }
      setIsLoading(false);
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await loginApi(email, password);
    localStorage.setItem('civiclens_token', res.access_token);
    localStorage.setItem('civiclens_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, password: string, fullName?: string): Promise<User> => {
    const res = await registerApi(email, password, fullName);
    localStorage.setItem('civiclens_token', res.access_token);
    localStorage.setItem('civiclens_user', JSON.stringify(res.user));
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('civiclens_token');
    localStorage.removeItem('civiclens_user');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAdmin,
        login,
        register,
        logout,
      }}
    >
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
