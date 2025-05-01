'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseCookies, setCookie, destroyCookie } from 'nookies';

interface AuthContextType {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Check if there's a JWT token on initial load
  useEffect(() => {
    const cookies = parseCookies();
    if (cookies.token) {
      setToken(cookies.token);
    }
  }, []);

  const login = (token: string) => {
    setCookie(null, 'token', token, { path: '/' });
    router.push('/dashboard'); // Redirect to dashboard on successful login
  };

  const logout = () => {
    destroyCookie(null, 'token');
    setToken(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
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