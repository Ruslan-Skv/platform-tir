'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_MANAGER'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'PARTNER'
  | 'USER'
  | 'GUEST';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
}

interface UserAuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'user_token';
const USER_KEY = 'user_data';

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);

        // Verify token is still valid
        verifyToken(savedToken).then((isValid) => {
          if (!isValid) {
            setToken(null);
            setUser(null);
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        });
      } catch {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.message || 'Неверный email или пароль',
        };
      }

      const data = await response.json();

      // Save to state and localStorage
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Ошибка подключения к серверу',
      };
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      try {
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return {
            success: false,
            error: error.message || 'Ошибка при регистрации',
          };
        }

        const data = await response.json();

        // Save to state and localStorage
        setToken(data.access_token);
        setUser(data.user);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));

        return { success: true };
      } catch (error) {
        console.error('Register error:', error);
        return {
          success: false,
          error: 'Ошибка подключения к серверу',
        };
      }
    },
    []
  );

  const updateProfile = useCallback(
    async (data: { firstName?: string; lastName?: string; email?: string }) => {
      if (!token || !user) {
        return {
          success: false,
          error: 'Необходима авторизация',
        };
      }

      try {
        const response = await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return {
            success: false,
            error: error.message || 'Ошибка при обновлении профиля',
          };
        }

        const updatedUser = await response.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _password, ...userWithoutPassword } = updatedUser;
        setUser(userWithoutPassword);
        localStorage.setItem(USER_KEY, JSON.stringify(userWithoutPassword));

        return { success: true };
      } catch (error) {
        console.error('Update profile error:', error);
        return {
          success: false,
          error: 'Ошибка подключения к серверу',
        };
      }
    },
    [token, user]
  );

  const getAuthHeaders = useCallback((): { Authorization: string } | Record<string, string> => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {} as Record<string, string>;
  }, [token]);

  const value: UserAuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateProfile,
    getAuthHeaders,
  };

  return <UserAuthContext.Provider value={value}>{children}</UserAuthContext.Provider>;
}

export function useUserAuth() {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error('useUserAuth must be used within a UserAuthProvider');
  }
  return context;
}
