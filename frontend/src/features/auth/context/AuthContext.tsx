'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react';

import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type TokenLoginPayload,
  bindAuthRefreshOnPageVisible,
  clearStoredAuthSession,
  getApiBaseUrl,
  getJwtExpMs,
  getStoredAccessToken,
  persistTokenResponse,
  refreshAccessTokenSilently,
  revokeRefreshOnServer,
} from '@/shared/lib/auth-session';
import { formatAuthHttpError } from '@/shared/lib/nest-error-message';
import { setPublicSiteEditMode } from '@/shared/lib/public-site-edit-mode';

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
  | 'INSTALLER'
  | 'MANAGER'
  | 'TECHNOLOGIST'
  | 'TRAINEE';

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
  'MANAGER',
  'TECHNOLOGIST',
  'TRAINEE',
] as const;

function readStoredAdminAuth(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') {
    return { token: null, user: null };
  }

  try {
    const savedToken = getStoredAccessToken();
    const savedUser = localStorage.getItem(USER_KEY) ?? localStorage.getItem(USER_DATA_KEY);

    if (!savedToken || !savedUser) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(savedUser) as User;
    if (!ADMIN_ROLES.includes(parsed.role as (typeof ADMIN_ROLES)[number])) {
      return { token: null, user: null };
    }

    if (!localStorage.getItem(USER_KEY)) {
      localStorage.setItem(USER_KEY, savedUser);
    }

    return { token: savedToken, user: parsed };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  // Сразу показываем оболочку по кэшу сессии; проверку токена — в фоне.
  useLayoutEffect(() => {
    let cancelled = false;

    void (async () => {
      let stored = readStoredAdminAuth();

      if (!stored.token) {
        const savedUser = localStorage.getItem(USER_KEY) || localStorage.getItem(USER_DATA_KEY);
        if (savedUser) {
          const refreshed = await refreshAccessTokenSilently();
          if (cancelled) return;
          if (refreshed) {
            stored = readStoredAdminAuth();
          }
        }
      }

      if (!stored.token || !stored.user) {
        setIsLoading(false);
        return;
      }

      const sessionToken = stored.token;
      setToken(stored.token);
      setUser(stored.user);
      setIsLoading(false);

      try {
        let access = sessionToken;
        const exp = getJwtExpMs(access);
        if (exp && exp <= Date.now() + 5_000) {
          await refreshAccessTokenSilently();
          if (cancelled) return;
          access = getStoredAccessToken() || access;
          setToken(access);
          const userAfterRefresh =
            localStorage.getItem(USER_KEY) || localStorage.getItem(USER_DATA_KEY);
          if (userAfterRefresh) {
            setUser(JSON.parse(userAfterRefresh) as User);
          }
        }

        if (cancelled || getStoredAccessToken() !== sessionToken) return;

        const expAfterRefresh = getJwtExpMs(access);
        if (expAfterRefresh && expAfterRefresh > Date.now() + 5 * 60_000) {
          return;
        }

        const isValid = await verifyToken(access);
        if (cancelled || getStoredAccessToken() !== sessionToken) return;
        if (!isValid) {
          logout();
          return;
        }

        const latest = getStoredAccessToken();
        if (latest && latest !== access) {
          setToken(latest);
        }
      } catch {
        if (!cancelled && getStoredAccessToken() === sessionToken) {
          logout();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logout]);

  const verifyToken = async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${tokenToVerify}`,
        },
      });
      if (response.ok) return true;
      if (response.status === 401) {
        const refreshed = await refreshAccessTokenSilently();
        if (!refreshed) return false;
        const next = getStoredAccessToken();
        if (!next) return false;
        const retry = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
          headers: { Authorization: `Bearer ${next}` },
        });
        if (retry.ok) return true;
        if (retry.status === 429 || retry.status >= 500) return true;
        return false;
      }
      // Временные ошибки сервера / rate limit — не сбрасываем локальную сессию.
      if (response.status === 429 || response.status >= 500) return true;
      return false;
    } catch {
      return true;
    }
  };

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
        'MANAGER',
        'TECHNOLOGIST',
        'TRAINEE',
      ];
      if (!allowedRoles.includes(data.user.role)) {
        return {
          success: false,
          error: 'У вас нет доступа к административной панели',
        };
      }

      const payload = data as TokenLoginPayload;
      persistTokenResponse(payload);
      setToken(payload.access_token);
      setUser({
        ...payload.user,
        firstName: payload.user.firstName ?? null,
        lastName: payload.user.lastName ?? null,
      } as User);

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
    const savedToken = getStoredAccessToken();
    if (!savedToken) return;
    try {
      const response = await apiFetch(`${getApiBaseUrl()}/auth/profile`, {
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
      const savedToken = getStoredAccessToken();
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
      } else if (!savedUser && !savedToken) {
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

  // Продление access по refresh до истечения JWT (access короткоживущий).
  useEffect(() => {
    const tick = () => {
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
      'MANAGER',
      'TECHNOLOGIST',
      'TRAINEE',
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
