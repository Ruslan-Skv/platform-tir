import { fetchWithTimeout } from '@/shared/lib/fetch-with-timeout';

type AccessTokenStore = {
  user: string | null;
  admin: string | null;
};

/** Общее хранилище access-токенов (один экземпляр на вкладку, в т.ч. при duplicate chunks). */
function getAccessTokenStore(): AccessTokenStore {
  if (typeof window === 'undefined') {
    return { user: null, admin: null };
  }
  const w = window as Window & { __platformTirAccessTokens?: AccessTokenStore };
  if (!w.__platformTirAccessTokens) {
    w.__platformTirAccessTokens = { user: null, admin: null };
  }
  return w.__platformTirAccessTokens;
}

/** Access-токены только в памяти; localStorage shim для совместимости с существующим кодом. */
function installInMemoryTokenStorageShim(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __authTokenShimInstalled?: boolean };
  if (w.__authTokenShimInstalled) return;
  w.__authTokenShimInstalled = true;

  const store = getAccessTokenStore();
  const origGet = localStorage.getItem.bind(localStorage);
  const origSet = localStorage.setItem.bind(localStorage);
  const origRemove = localStorage.removeItem.bind(localStorage);

  const legacyUser = origGet('user_token');
  const legacyAdmin = origGet('admin_token');
  if (legacyUser) {
    store.user = legacyUser;
    origRemove('user_token');
  }
  if (legacyAdmin) {
    store.admin = legacyAdmin;
    origRemove('admin_token');
  }

  localStorage.getItem = (key: string) => {
    if (key === 'user_token') return store.user;
    if (key === 'admin_token') return store.admin;
    return origGet(key);
  };
  localStorage.setItem = (key: string, value: string) => {
    if (key === 'user_token') {
      store.user = value;
      return;
    }
    if (key === 'admin_token') {
      store.admin = value;
      return;
    }
    origSet(key, value);
  };
  localStorage.removeItem = (key: string) => {
    if (key === 'user_token') {
      store.user = null;
      return;
    }
    if (key === 'admin_token') {
      store.admin = null;
      return;
    }
    origRemove(key);
  };
}

installInMemoryTokenStorageShim();

/** Заголовки Authorization для API-запросов. */
export function getAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getStoredAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra as Record<string, string>),
  };
}

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined') return '/api/v1';
  return 'http://localhost:3001/api/v1';
}

/** База URL API для fetch (в браузере по умолчанию /api/v1 через Next rewrite). */
export function getApiBaseUrl(): string {
  return apiBase();
}

const ADMIN_ROLES = new Set([
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
]);

export type TokenLoginPayload = {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  };
};

let refreshInFlight: Promise<boolean> | null = null;

const REFRESH_FAIL_KEY = 'auth_refresh_failed_at';
/** Кросс-вкладочная блокировка: только одна вкладка дергает /auth/refresh одновременно. */
const REFRESH_LOCK_KEY = 'auth_refresh_lock_until';
const REFRESH_LOCK_TTL_MS = 15_000;
/** После 401 на refresh не долбим API, пока пользователь снова не войдёт. */
const REFRESH_FAIL_COOLDOWN_MS = 10 * 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryAcquireCrossTabRefreshLock(): boolean {
  const until = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
  if (Date.now() < until) return false;
  localStorage.setItem(REFRESH_LOCK_KEY, String(Date.now() + REFRESH_LOCK_TTL_MS));
  return true;
}

function releaseCrossTabRefreshLock(): void {
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

/** Ждём, пока другая вкладка обновит access в localStorage. */
function waitForCrossTabRefresh(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const checkDone = (): boolean => {
      const lockUntil = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
      if (Date.now() >= lockUntil && hasUsableStoredAccessToken(60_000)) {
        return true;
      }
      return hasUsableStoredAccessToken(120_000);
    };

    const onStorage = (e: StorageEvent) => {
      if (
        (e.key === 'user_token' || e.key === 'admin_token') &&
        e.newValue &&
        hasUsableStoredAccessToken(60_000)
      ) {
        cleanup();
        resolve(true);
      }
    };

    const timer = window.setInterval(() => {
      if (checkDone()) {
        cleanup();
        resolve(true);
        return;
      }
      if (Date.now() >= deadline) {
        cleanup();
        resolve(false);
      }
    }, 200);

    const cleanup = () => {
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };

    window.addEventListener('storage', onStorage);
    if (checkDone()) {
      cleanup();
      resolve(true);
    }
  });
}

async function postRefreshRequest(): Promise<Response> {
  // Не через apiFetch: иначе attachSessionBearerIfNeeded ждёт тот же refreshInFlight → deadlock.
  return fetchWithTimeout(`${apiBase()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'include',
  });
}

async function handleRefreshResponse(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  const data = (await res.json()) as TokenLoginPayload;
  if (!data.access_token || !data.user) return false;
  persistTokenResponse(data);
  return true;
}

function markRefreshFailed(): void {
  sessionStorage.setItem(REFRESH_FAIL_KEY, String(Date.now()));
}

function clearRefreshCooldown(): void {
  sessionStorage.removeItem(REFRESH_FAIL_KEY);
}

function isRefreshInCooldown(): boolean {
  const raw = sessionStorage.getItem(REFRESH_FAIL_KEY);
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at)) return false;
  if (Date.now() - at > REFRESH_FAIL_COOLDOWN_MS) {
    clearRefreshCooldown();
    return false;
  }
  return true;
}

/** Сброс access в памяти (refresh только в httpOnly cookie). */
export function clearStoredAuthSession(): void {
  if (typeof window === 'undefined') return;
  const store = getAccessTokenStore();
  store.user = null;
  store.admin = null;
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  sessionStorage.removeItem('user_data');
  sessionStorage.removeItem('admin_user');
  window.dispatchEvent(new Event('auth-token-changed'));
}

function base64UrlDecode(segment: string): string {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  return atob(padded + '='.repeat(padLen));
}

/** exp из JWT (без проверки подписи — только для планирования silent refresh). */
export function getJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

/** Сохранить access в памяти (refresh только в httpOnly cookie у API origin). */
export function persistTokenResponse(data: TokenLoginPayload): void {
  if (typeof window === 'undefined') return;
  clearRefreshCooldown();
  const isAdmin = ADMIN_ROLES.has(data.user.role);
  sessionStorage.setItem('user_data', JSON.stringify(data.user));
  if (isAdmin) {
    sessionStorage.setItem('admin_user', JSON.stringify(data.user));
  } else {
    sessionStorage.removeItem('admin_user');
  }
  localStorage.setItem('user_data', JSON.stringify(data.user));
  if (isAdmin) {
    localStorage.setItem('admin_user', JSON.stringify(data.user));
    localStorage.setItem('admin_token', data.access_token);
    localStorage.removeItem('user_token');
  } else {
    localStorage.removeItem('admin_user');
    localStorage.setItem('user_token', data.access_token);
    localStorage.removeItem('admin_token');
  }
  window.dispatchEvent(new Event('auth-token-changed'));
}

export async function refreshAccessTokenSilently(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isRefreshInCooldown()) return false;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const hasLock = tryAcquireCrossTabRefreshLock();
    try {
      if (!hasLock) {
        const fromOtherTab = await waitForCrossTabRefresh(REFRESH_LOCK_TTL_MS);
        if (fromOtherTab) return true;
        if (!tryAcquireCrossTabRefreshLock()) return false;
      }

      let res = await postRefreshRequest();
      if (res.ok) {
        return handleRefreshResponse(res);
      }

      if (res.status === 401 || res.status === 403) {
        // Другая вкладка могла успеть ротировать refresh — подождём и повторим.
        await sleep(400);
        if (hasUsableStoredAccessToken(120_000)) return true;

        res = await postRefreshRequest();
        if (res.ok) {
          return handleRefreshResponse(res);
        }

        if (res.status === 401 || res.status === 403) {
          markRefreshFailed();
          clearStoredAuthSession();
        }
      }
      return false;
    } catch {
      return false;
    } finally {
      releaseCrossTabRefreshLock();
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Токен из памяти (user или admin). */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const store = getAccessTokenStore();
  return store.user || store.admin;
}

/** Есть bearer и он не истёк (с запасом minTtlMs). */
export function hasUsableStoredAccessToken(minTtlMs = 0): boolean {
  const token = getStoredAccessToken();
  if (!token) return false;
  const expMs = getJwtExpMs(token);
  if (!expMs) return true;
  return expMs - Date.now() > minTtlMs;
}

function hasPersistedUserSessionHint(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('admin_user') || localStorage.getItem('user_data'));
}

/** Есть сохранённый профиль (access может быть только в памяти до silent refresh). */
export function hasPersistedAuthSession(): boolean {
  return hasPersistedUserSessionHint();
}

/** Актуализирует access заранее, чтобы фоновые поллеры не ловили 401 в момент экспирации. */
export async function ensureFreshAccessToken(minTtlMs = 60_000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isRefreshInCooldown()) return false;
  const current = getStoredAccessToken();
  if (!current) {
    if (!hasPersistedUserSessionHint()) return false;
    return refreshAccessTokenSilently();
  }
  const expMs = getJwtExpMs(current);
  if (!expMs) return true;
  if (expMs - Date.now() > minTtlMs) return true;
  return refreshAccessTokenSilently();
}

/** Восстановить access из httpOnly refresh перед API-запросом. */
export async function restoreAccessTokenFromSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!getStoredAccessToken() && hasPersistedUserSessionHint()) {
    await ensureFreshAccessToken(0);
  }
  return getStoredAccessToken();
}

/**
 * В фоновой вкладке setInterval почти не работает — при возврате обновляем access до поллеров.
 * @returns cleanup
 */
export function bindAuthRefreshOnPageVisible(minTtlMs = 120_000): () => void {
  if (typeof window === 'undefined') return () => {};

  const refreshIfVisible = () => {
    if (document.visibilityState !== 'visible') return;
    void ensureFreshAccessToken(minTtlMs);
  };

  document.addEventListener('visibilitychange', refreshIfVisible);
  window.addEventListener('focus', refreshIfVisible);
  return () => {
    document.removeEventListener('visibilitychange', refreshIfVisible);
    window.removeEventListener('focus', refreshIfVisible);
  };
}

export async function revokeRefreshOnServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await fetchWithTimeout(`${apiBase()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      credentials: 'include',
    });
  } catch {
    // игнорируем сеть при выходе
  }
}
