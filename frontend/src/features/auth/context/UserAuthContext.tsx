'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { setPublicSiteEditMode } from '@/shared/lib/admin';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type TokenLoginPayload,
  bindAuthRefreshOnPageVisible,
  canAttemptSilentRefresh,
  clearStoredAuthSession,
  getApiBaseUrl,
  getJwtExpMs,
  getStoredAccessToken,
  persistTokenResponse,
  refreshAccessTokenSilently,
  revokeRefreshOnServer,
} from '@/shared/lib/auth-session';
import { canRunBackgroundNetwork } from '@/shared/lib/browser-network';
import { formatAuthHttpError } from '@/shared/lib/nest-error-message';

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
  | 'MANAGER'
  | 'TECHNOLOGIST'
  | 'TRAINEE'
  | 'USER'
  | 'GUEST';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Должность в компании; если нет — в шапке админки показываем роль */
  jobTitle?: string | null;
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
    lastName?: string,
    consentAccepted?: boolean
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
  const token = getStoredAccessToken();
  let userJson = localStorage.getItem(USER_DATA_KEY);
  let source: 'user' | 'admin' = 'user';
  if (!userJson) {
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
      void revokeRefreshOnServer();
      clearStoredAuthSession();
      setPublicSiteEditMode(false);
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
        const response = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
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
          const next = getStoredAccessToken();
          if (!next) return false;
          const retry = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
            headers: { Authorization: `Bearer ${next}` },
          });
          if (retry.ok) {
            const userData = (await retry.json()) as User;
            persistProfileUser(userData, next);
            return true;
          }
          if (retry.status === 429 || retry.status >= 500) return true;
          return false;
        }
        if (response.status === 429 || response.status >= 500) return true;
        return false;
      } catch {
        return true;
      }
    },
    [persistProfileUser]
  );

  // Load auth state on mount: user_token first, fallback на admin_token (админ в публичке)
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      applyAuthFromStorage();
      let access = getStoredAccessToken();
      const userJson = localStorage.getItem(USER_DATA_KEY) || localStorage.getItem(ADMIN_USER_KEY);

      if (!access && userJson) {
        if (canAttemptSilentRefresh()) {
          const refreshed = await refreshAccessTokenSilently();
          if (cancelled) return;
          if (refreshed) {
            applyAuthFromStorage();
            access = getStoredAccessToken();
          }
        }
      }

      if (access && userJson) {
        const sessionToken = access;
        try {
          const exp = getJwtExpMs(access);
          if (exp && exp <= Date.now() + 5_000) {
            await refreshAccessTokenSilently();
            if (cancelled) return;
            applyAuthFromStorage();
            access = getStoredAccessToken() || access;
          }
          setToken(access);
          setUser(JSON.parse(userJson) as User);

          if (cancelled || getStoredAccessToken() !== sessionToken) {
            setIsLoading(false);
            return;
          }

          const isValid = await verifyToken(access);
          if (cancelled || getStoredAccessToken() !== sessionToken) {
            setIsLoading(false);
            return;
          }
          if (!isValid) {
            const current = getStoredAccessToken();
            if (current === access) {
              setToken(null);
              setUser(null);
              clearStoredAuthSession();
            }
          } else {
            const latest = getStoredAccessToken();
            if (latest && latest !== access) {
              setToken(latest);
              applyAuthFromStorage();
            }
          }
        } catch {
          if (!cancelled && getStoredAccessToken() === sessionToken) {
            setToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
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
        e.key === ADMIN_USER_KEY
      ) {
        handleAuthChange();
      }
    });
    return () => {
      window.removeEventListener('auth-token-changed', handleAuthChange);
    };
  }, [applyAuthFromStorage]);

  const refreshUser = useCallback(async () => {
    const savedToken = getStoredAccessToken();
    if (!savedToken) return;
    try {
      const response = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
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
      const response = await apiFetch(`${getApiBaseUrl()}/auth/login`, {
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
          error: formatAuthHttpError(response, error, {
            unauthorizedFallback: 'Неверный email или пароль',
            defaultFallback: 'Не удалось войти',
          }),
        };
      }

      const data = await response.json();

      if (!data.access_token || !data.user) {
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
    async (
      email: string,
      password: string,
      firstName?: string,
      lastName?: string,
      consentAccepted = false
    ) => {
      try {
        const response = await apiFetch(`${getApiBaseUrl()}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
            consentAccepted,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          return {
            success: false,
            error: formatAuthHttpError(response, error, {
              unauthorizedFallback: 'Неверный email или пароль',
              defaultFallback: 'Ошибка при регистрации',
            }),
          };
        }

        const data = await response.json();

        if (!data.access_token || !data.user) {
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
        const response = await apiFetch(`${getApiBaseUrl()}/users/me`, {
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

        const response = await apiFetch(`${getApiBaseUrl()}/users/me/avatar`, {
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
      if (!canRunBackgroundNetwork()) return;
      const t = typeof window !== 'undefined' ? getStoredAccessToken() : null;
      if (!t) return;
      const exp = getJwtExpMs(t);
      if (!exp) return;
      if (exp - Date.now() < 120_000) {
        void refreshAccessTokenSilently().then((ok) => {
          if (!ok) return;
          const latest = getStoredAccessToken();
          if (latest) setToken(latest);
        });
      }
    };
    const id = window.setInterval(tick, 60_000);
    tick();
    const unbindVisible = bindAuthRefreshOnPageVisible();
    return () => {
      window.clearInterval(id);
      unbindVisible();
    };
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
