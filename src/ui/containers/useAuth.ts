import { useState, useEffect, useCallback } from 'react';
import { User, AuthState } from '../../domain/types';
import { db } from '../../data/database';

export const useAuth = (): AuthState & {
  login: (username: string) => Promise<void>;
  logout: () => void;
} => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check if user is already logged in
      const savedUserId = localStorage.getItem('wealth-atlas-user-id');
      if (savedUserId) {
        const user = await db.users.get(savedUserId);
        if (user) {
          setAuthState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      
      setAuthState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = useCallback(async (username: string): Promise<void> => {
    if (!username.trim()) throw new Error('Username is required');

    try {
      // Check if user already exists
      let user = await db.users.where('username').equals(username).first();
      
      if (!user) {
        // Create new user
        const userId = await db.users.add({
          username,
          createdAt: new Date(),
        });
        
        user = await db.users.get(userId);
        if (!user) throw new Error('Failed to create user');
      }

      localStorage.setItem('wealth-atlas-user-id', user.id!.toString());
      setAuthState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wealth-atlas-user-id');
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return {
    ...authState,
    login,
    logout,
  };
};
