'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  ADMIN_REFRESH_KEY,
  type TokenLoginPayload,
  USER_REFRESH_KEY,
  getJwtExpMs,
  persistTokenResponse,
  refreshAccessTokenSilently,
  revokeRefreshOnServer,
} from '@/shared/lib/auth-session';
import { setPublicSiteEditMode } from '@/shared/lib/public-site-edit-mode';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type UserRole =
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
  | 'INSTALLER'
  | 'USER'
  | 'GUEST';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  avatar?: string | null;
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
  refreshUser: () => Promise<void>;
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatar?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  uploadAvatar: (file: File) => Promise<{ success: boolean; error?: string }>;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const USER_TOKEN_KEY = 'user_token';
const USER_DATA_KEY = 'user_data';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_USER_KEY = 'admin_user';

/** Загрузить состояние авторизации: приоритет user_*, fallback на admin_* (админ в публичке). */
function loadAuthFromStorage(): {
  token: string | null;
  user: User | null;
  source: 'user' | 'admin';
} {
  if (typeof window === 'undefined') {
    return { token: null, user: null, source: 'user' };
  }
  let token = localStorage.getItem(USER_TOKEN_KEY);
  let userJson = localStorage.getItem(USER_DATA_KEY);
  let source: 'user' | 'admin' = 'user';
  if (!token || !userJson) {
    token = localStorage.getItem(ADMIN_TOKEN_KEY);
    userJson = localStorage.getItem(ADMIN_USER_KEY);
    source = 'admin';
  }
  if (!token || !userJson) {
    return { token: null, user: null, source: 'user' };
  }
  try {
    const parsedUser = JSON.parse(userJson) as User;
    return { token, user: parsedUser, source };
  } catch {
    return { token: null, user: null, source: 'user' };
  }
}

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      const rt = localStorage.getItem(USER_REFRESH_KEY) || localStorage.getItem(ADMIN_REFRESH_KEY);
      void revokeRefreshOnServer(rt);
      localStorage.removeItem(USER_REFRESH_KEY);
      localStorage.removeItem(ADMIN_REFRESH_KEY);
      localStorage.removeItem(USER_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
      setPublicSiteEditMode(false);
      window.dispatchEvent(new Event('auth-token-changed'));
    }
    setToken(null);
    setUser(null);
  }, []);

  const applyAuthFromStorage = useCallback(() => {
    const { token: loadedToken, user: loadedUser } = loadAuthFromStorage();
    setToken(loadedToken);
    setUser(loadedUser);
    return loadedToken;
  }, []);

  const persistProfileUser = useCallback((userData: User, authToken: string) => {
    setUser(userData);
    const isFromAdmin = localStorage.getItem(ADMIN_TOKEN_KEY) === authToken;
    if (isFromAdmin) {
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } else {
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }
  }, []);

  const verifyToken = useCallback(
    async (tokenToVerify: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${tokenToVerify}`,
          },
        });
        if (response.ok) {
          const userData = (await response.json()) as User;
          persistProfileUser(userData, tokenToVerify);
          return true;
        }
        if (response.status === 401) {
          const refreshed = await refreshAccessTokenSilently();
          if (!refreshed) return false;
          const next =
            localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
          if (!next) return false;
          const retry = await fetch(`${API_URL}/auth/profile`, {
            headers: { Authorization: `Bearer ${next}` },
          });
          if (!retry.ok) return false;
          const userData = (await retry.json()) as User;
          persistProfileUser(userData, next);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [persistProfileUser]
  );

  // Load auth state on mount: user_token first, fallback to admin_token (админ в публичке)
  useEffect(() => {
    void (async () => {
      applyAuthFromStorage();
      let access = localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
      const userJson = localStorage.getItem(USER_DATA_KEY) || localStorage.getItem(ADMIN_USER_KEY);

      if (access && userJson) {
        try {
          const exp = getJwtExpMs(access);
          if (exp && exp <= Date.now() + 5_000) {
            await refreshAccessTokenSilently();
            applyAuthFromStorage();
            access =
              localStorage.getItem(USER_TOKEN_KEY) ||
              localStorage.getItem(ADMIN_TOKEN_KEY) ||
              access;
          }
          setToken(access);
          setUser(JSON.parse(userJson) as User);

          const isValid = await verifyToken(access);
          if (!isValid) {
            const current =
              localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
            if (current === access) {
              setToken(null);
              setUser(null);
              localStorage.removeItem(USER_TOKEN_KEY);
              localStorage.removeItem(USER_DATA_KEY);
              localStorage.removeItem(ADMIN_TOKEN_KEY);
              localStorage.removeItem(ADMIN_USER_KEY);
              localStorage.removeItem(USER_REFRESH_KEY);
              localStorage.removeItem(ADMIN_REFRESH_KEY);
            }
          } else {
            const latest =
              localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
            if (latest && latest !== access) {
              setToken(latest);
              applyAuthFromStorage();
            }
          }
        } catch {
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    })();
  }, [applyAuthFromStorage, verifyToken]);

  // Синхронизация при смене токена (вход/выход в админке или другой вкладке)
  useEffect(() => {
    const handleAuthChange = () => {
      applyAuthFromStorage();
    };
    window.addEventListener('auth-token-changed', handleAuthChange);
    window.addEventListener('storage', (e: StorageEvent) => {
      if (
        e.key === USER_TOKEN_KEY ||
        e.key === USER_DATA_KEY ||
        e.key === ADMIN_TOKEN_KEY ||
        e.key === ADMIN_USER_KEY ||
        e.key === USER_REFRESH_KEY ||
        e.key === ADMIN_REFRESH_KEY
      ) {
        handleAuthChange();
      }
    });
    return () => {
      window.removeEventListener('auth-token-changed', handleAuthChange);
    };
  }, [applyAuthFromStorage]);

  const refreshUser = useCallback(async () => {
    const savedToken =
      localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!savedToken) return;
    try {
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${savedToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        const isFromAdmin = localStorage.getItem(ADMIN_TOKEN_KEY) === savedToken;
        if (isFromAdmin) {
          localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(userData));
        } else {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        }
      }
    } catch {
      // ignore
    }
  }, []);

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

      if (!data.access_token || !data.refresh_token || !data.user) {
        return { success: false, error: 'Некорректный ответ сервера' };
      }

      const payload = data as TokenLoginPayload;
      persistTokenResponse(payload);
      setToken(payload.access_token);
      setUser(payload.user as User);

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

        if (!data.access_token || !data.refresh_token || !data.user) {
          return { success: false, error: 'Некорректный ответ сервера' };
        }

        const payload = data as TokenLoginPayload;
        persistTokenResponse(payload);
        setToken(payload.access_token);
        setUser(payload.user as User);

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
    async (data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string | null;
    }) => {
      if (!token || !user) {
        return {
          success: false,
          error: 'Необходима авторизация',
        };
      }

      try {
        const response = await fetch(`${API_URL}/users/me`, {
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
        const isAdminToken = token && localStorage.getItem(ADMIN_TOKEN_KEY) === token;
        const userKey = isAdminToken ? ADMIN_USER_KEY : USER_DATA_KEY;
        localStorage.setItem(userKey, JSON.stringify(userWithoutPassword));
        if (isAdminToken) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userWithoutPassword));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-token-changed'));
        }

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

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!token || !user) {
        return {
          success: false,
          error: 'Необходима авторизация',
        };
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/users/me/avatar`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return {
            success: false,
            error: error.message || 'Ошибка при загрузке аватарки',
          };
        }

        const { user: updatedUser } = await response.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password: _password, ...userWithoutPassword } = updatedUser;
        setUser(userWithoutPassword);
        const isAdminToken = token && localStorage.getItem(ADMIN_TOKEN_KEY) === token;
        const userKey = isAdminToken ? ADMIN_USER_KEY : USER_DATA_KEY;
        localStorage.setItem(userKey, JSON.stringify(userWithoutPassword));
        if (isAdminToken) {
          localStorage.setItem(USER_DATA_KEY, JSON.stringify(userWithoutPassword));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-token-changed'));
        }

        return { success: true };
      } catch (error) {
        console.error('Upload avatar error:', error);
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

  useEffect(() => {
    const tick = () => {
      const t =
        typeof window !== 'undefined'
          ? localStorage.getItem(USER_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY)
          : null;
      if (!t) return;
      const exp = getJwtExpMs(t);
      if (!exp) return;
      if (exp - Date.now() < 120_000) {
        void refreshAccessTokenSilently();
      }
    };
    const id = window.setInterval(tick, 60_000);
    tick();
    return () => window.clearInterval(id);
  }, [token]);

  const value: UserAuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    refreshUser,
    updateProfile,
    uploadAvatar,
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
