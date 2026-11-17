/**
 * Удалённая помощь: REST-операции сессий + сокет сигналинга WebRTC.
 * События сервера: help:invite, help:request, help:session, help:signal, help:ended.
 */
import { type Socket, io } from 'socket.io-client';

import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export type RemoteHelpSessionStatus =
  | 'REQUESTED'
  | 'PENDING'
  | 'ACTIVE'
  | 'ENDED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface RemoteHelpUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  jobTitle: string | null;
  avatar: string | null;
}

export interface RemoteHelpSession {
  id: string;
  userId: string;
  adminId: string | null;
  status: RemoteHelpSessionStatus;
  createdAt: string;
  respondedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  user: RemoteHelpUser;
  admin: RemoteHelpUser | null;
}

export interface RemoteHelpOpenSessions {
  requests: RemoteHelpSession[];
  invites: RemoteHelpSession[];
  active: RemoteHelpSession[];
}

export interface RemoteHelpIceServers {
  iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) throw new Error('Нет авторизации');
  const res = await apiFetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      /* не JSON — показываем как есть */
    }
    throw new Error(String(message || `Запрос удалённой помощи не удался (${res.status})`));
  }
  return res;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(path, init);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function createRemoteHelpInvite(userId: string): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>('/admin/remote-help/invites', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function getRemoteHelpPending(): Promise<RemoteHelpOpenSessions> {
  return requestJson<RemoteHelpOpenSessions>('/admin/remote-help/pending');
}

export function getRemoteHelpSessions(params?: {
  status?: RemoteHelpSessionStatus;
  userId?: string;
  limit?: number;
}): Promise<RemoteHelpSession[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.userId) query.set('userId', params.userId);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return requestJson<RemoteHelpSession[]>(`/admin/remote-help/sessions${qs ? `?${qs}` : ''}`);
}

export function claimRemoteHelpSession(sessionId: string): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>(`/admin/remote-help/sessions/${sessionId}/claim`, {
    method: 'POST',
  });
}

export function cancelRemoteHelpSession(sessionId: string): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>(`/admin/remote-help/sessions/${sessionId}/cancel`, {
    method: 'POST',
  });
}

export function createRemoteHelpRequest(): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>('/admin/remote-help/requests', { method: 'POST' });
}

export function getMyRemoteHelpSession(): Promise<RemoteHelpSession | null> {
  return requestJson<RemoteHelpSession | null>('/admin/remote-help/my-session');
}

export function acceptRemoteHelpSession(sessionId: string): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>(`/admin/remote-help/sessions/${sessionId}/accept`, {
    method: 'POST',
  });
}

export function declineRemoteHelpSession(sessionId: string): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>(`/admin/remote-help/sessions/${sessionId}/decline`, {
    method: 'POST',
  });
}

export function endRemoteHelpSession(
  sessionId: string,
  reason: 'manual' | 'share-stopped' | 'disconnect' = 'manual'
): Promise<RemoteHelpSession> {
  return requestJson<RemoteHelpSession>(`/admin/remote-help/sessions/${sessionId}/end`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getRemoteHelpIceServers(): Promise<RemoteHelpIceServers['iceServers']> {
  const data = await requestJson<RemoteHelpIceServers>('/admin/remote-help/ice-servers');
  return data.iceServers;
}

function socketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:3001';
  }
}

export type RemoteHelpSocketHandlers = {
  onInvite?: (session: RemoteHelpSession) => void;
  onRequest?: (session: RemoteHelpSession) => void;
  onSession?: (session: RemoteHelpSession) => void;
  onSignal?: (payload: { sessionId: string; data: unknown }) => void;
  onEnded?: (payload: { sessionId: string; reason: string }) => void;
};

export function connectRemoteHelpSocket(handlers: RemoteHelpSocketHandlers = {}): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = getStoredAccessToken();
  if (!token) return null;

  // auth-функция берёт свежий access при каждом (пере)подключении
  const socket = io(`${socketBaseUrl()}/remote-help`, {
    auth: (cb) => cb({ token: getStoredAccessToken() || token }),
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  if (handlers.onInvite) socket.on('help:invite', handlers.onInvite);
  if (handlers.onRequest) socket.on('help:request', handlers.onRequest);
  if (handlers.onSession) socket.on('help:session', handlers.onSession);
  if (handlers.onSignal) socket.on('help:signal', handlers.onSignal);
  if (handlers.onEnded) socket.on('help:ended', handlers.onEnded);

  return socket;
}

export function sendRemoteHelpSignal(socket: Socket | null, sessionId: string, data: unknown) {
  if (!socket) return;
  socket.emit('help:signal', { sessionId, data });
}
