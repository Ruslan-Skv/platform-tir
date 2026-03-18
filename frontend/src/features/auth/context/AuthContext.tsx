'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type AdminRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CONTENT_MANAGER'
  | 'MODERATOR'
  | 'SUPPORT'
  | 'PARTNER'
  | 'BRIGADIER'
  | 'LEAD_SPECIALIST_FURNITURE'
  | 'LEAD_SPECIALIST_WINDOWS_DOORS'
  | 'SURVEYOR'
  | 'DRIVER'
  | 'INSTALLER';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: AdminRole | 'USER' | 'GUEST';
  avatar?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';
const USER_TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      window.dispatchEvent(new Event('auth-token-changed'));
    }
    setToken(null);
    setUser(null);
  }, []);

  // Load auth state from localStorage on mount: admin_token, fallback на user_token (вход в ЛК даёт доступ в админку)
  useEffect(() => {
    let savedToken = localStorage.getItem(TOKEN_KEY);
    let savedUser = localStorage.getItem(USER_KEY);

    if (!savedToken || !savedUser) {
      savedToken = localStorage.getItem(USER_TOKEN_KEY);
      savedUser = localStorage.getItem(USER_DATA_KEY);
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (ADMIN_ROLES.includes(parsed.role)) {
            localStorage.setItem(TOKEN_KEY, savedToken);
            localStorage.setItem(USER_KEY, savedUser);
          } else {
            savedToken = null;
            savedUser = null;
          }
        } catch {
          savedToken = null;
          savedUser = null;
        }
      }
    }

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);

        verifyToken(savedToken).then((isValid) => {
          if (!isValid) {
            logout();
          }
        });
      } catch {
        logout();
      }
    }
    setIsLoading(false);
  }, [logout]);

  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      });
      return response.ok;
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
        const rawMessage = error.message || '';
        const friendlyMessage =
          rawMessage === 'Unauthorized'
            ? 'Неверный email или пароль'
            : rawMessage || 'Неверный email или пароль';
        return {
          success: false,
          error: friendlyMessage,
        };
      }

      const data = await response.json();

      const allowedRoles: string[] = [
        'SUPER_ADMIN',
        'ADMIN',
        'CONTENT_MANAGER',
        'MODERATOR',
        'SUPPORT',
        'PARTNER',
        'BRIGADIER',
        'LEAD_SPECIALIST_FURNITURE',
        'LEAD_SPECIALIST_WINDOWS_DOORS',
        'SURVEYOR',
        'DRIVER',
        'INSTALLER',
      ];
      if (!allowedRoles.includes(data.user.role)) {
        return {
          success: false,
          error: 'У вас нет доступа к административной панели',
        };
      }

      // Save to state and localStorage — один вход даёт доступ и в ЛК, и в админку
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      localStorage.setItem('user_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-token-changed'));
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Ошибка подключения к серверу',
      };
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(USER_TOKEN_KEY);
    if (!savedToken) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      }
    } catch {
      // ignore
    }
  }, []);

  const getAuthHeaders = useCallback((): { Authorization: string } | Record<string, string> => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {} as Record<string, string>;
  }, [token]);

  // Синхронизация при обновлении профиля (публичка или другая вкладка)
  useEffect(() => {
    const handleUserUpdate = () => {
      const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(USER_TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY) || localStorage.getItem(USER_DATA_KEY);
      if (savedUser && savedToken) {
        try {
          const parsed = JSON.parse(savedUser);
          if (ADMIN_ROLES.includes(parsed.role)) {
            setUser(parsed);
            setToken(savedToken);
          } else {
            setUser(null);
            setToken(null);
          }
        } catch {
          setUser(null);
          setToken(null);
        }
      } else {
        setUser(null);
        setToken(null);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === USER_KEY ||
        e.key === USER_DATA_KEY ||
        e.key === TOKEN_KEY ||
        e.key === USER_TOKEN_KEY
      ) {
        handleUserUpdate();
      }
    };
    window.addEventListener('auth-token-changed', handleUserUpdate);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('auth-token-changed', handleUserUpdate);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: [
      'SUPER_ADMIN',
      'ADMIN',
      'CONTENT_MANAGER',
      'MODERATOR',
      'SUPPORT',
      'PARTNER',
      'BRIGADIER',
      'LEAD_SPECIALIST_FURNITURE',
      'LEAD_SPECIALIST_WINDOWS_DOORS',
      'SURVEYOR',
      'DRIVER',
      'INSTALLER',
    ].includes(user?.role ?? ''),
    login,
    logout,
    refreshUser,
    getAuthHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
