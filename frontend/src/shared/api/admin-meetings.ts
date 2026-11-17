/**
 * Онлайн-собрания: REST-операции + сокет сигналинга mesh WebRTC.
 * События сервера: meeting:peer-joined, meeting:peer-left, meeting:signal,
 * meeting:chat, meeting:media-state, meeting:ended, meeting:kicked.
 */
import { type Socket, io } from 'socket.io-client';

import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export type MeetingStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface MeetingUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  jobTitle: string | null;
  avatar: string | null;
}

export interface MeetingParticipant {
  meetingId: string;
  userId: string;
  joinedAt: string | null;
  leftAt: string | null;
  user: MeetingUser;
}

export interface Meeting {
  id: string;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  status: MeetingStatus;
  createdById: string;
  createdAt: string;
  createdBy: MeetingUser;
  participants: MeetingParticipant[];
}

export interface MeetingIceServers {
  iceServers: Array<{ urls: string[]; username?: string; credential?: string }>;
}

export interface MeetingJoinResult extends MeetingIceServers {
  meeting: Meeting;
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
    throw new Error(String(message || `Запрос онлайн-собраний не удался (${res.status})`));
  }
  return res;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(path, init);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export function createMeeting(input: {
  title: string;
  description?: string;
  scheduledAt?: string;
  participantIds?: string[];
}): Promise<Meeting> {
  return requestJson<Meeting>('/admin/meetings', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listMeetings(scope: 'upcoming' | 'past', limit = 30): Promise<Meeting[]> {
  return requestJson<Meeting[]>(`/admin/meetings?scope=${scope}&limit=${limit}`);
}

export function listMyMeetings(): Promise<Meeting[]> {
  return requestJson<Meeting[]>('/admin/meetings/my');
}

export function getMeeting(id: string): Promise<Meeting> {
  return requestJson<Meeting>(`/admin/meetings/${id}`);
}

export function updateMeeting(
  id: string,
  input: { title?: string; description?: string; scheduledAt?: string; participantIds?: string[] }
): Promise<Meeting> {
  return requestJson<Meeting>(`/admin/meetings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function cancelMeeting(id: string): Promise<Meeting> {
  return requestJson<Meeting>(`/admin/meetings/${id}/cancel`, { method: 'POST' });
}

export function joinMeeting(id: string): Promise<MeetingJoinResult> {
  return requestJson<MeetingJoinResult>(`/admin/meetings/${id}/join`, { method: 'POST' });
}

export function leaveMeeting(id: string): Promise<{ ok: boolean }> {
  return requestJson<{ ok: boolean }>(`/admin/meetings/${id}/leave`, { method: 'POST' });
}

export async function getMeetingIceServers(): Promise<MeetingIceServers['iceServers']> {
  const data = await requestJson<MeetingIceServers>('/admin/meetings/ice-servers');
  return data.iceServers;
}

function socketBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  try {
    const u = new URL(apiUrl);
    return `${u.protocol}//${u.host}`;
  } catch {
    // Относительный NEXT_PUBLIC_API_URL (прод за nginx): API на том же origin,
    // socket.io проксируется локацией /socket.io/
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
  }
}

export type MeetingChatMessage = {
  meetingId: string;
  userId: string;
  userName: string;
  text: string;
  at: string;
};

export type MeetingMediaState = {
  meetingId: string;
  userId: string;
  mic: boolean;
  camera: boolean;
  screen: boolean;
};

export type MeetingsSocketHandlers = {
  onPeerJoined?: (payload: { meetingId: string; user: MeetingUser }) => void;
  onPeerLeft?: (payload: { meetingId: string; userId: string }) => void;
  onSignal?: (payload: { meetingId: string; fromUserId: string; data: unknown }) => void;
  onChat?: (message: MeetingChatMessage) => void;
  onMediaState?: (state: MeetingMediaState) => void;
  onEnded?: (payload: { meetingId: string; reason: string }) => void;
  onKicked?: (payload: { meetingId: string; reason: string }) => void;
};

export function connectMeetingsSocket(handlers: MeetingsSocketHandlers = {}): Socket | null {
  if (typeof window === 'undefined') return null;
  const token = getStoredAccessToken();
  if (!token) return null;

  // auth-функция берёт свежий access при каждом (пере)подключении
  const socket = io(`${socketBaseUrl()}/meetings`, {
    auth: (cb) => cb({ token: getStoredAccessToken() || token }),
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  if (handlers.onPeerJoined) socket.on('meeting:peer-joined', handlers.onPeerJoined);
  if (handlers.onPeerLeft) socket.on('meeting:peer-left', handlers.onPeerLeft);
  if (handlers.onSignal) socket.on('meeting:signal', handlers.onSignal);
  if (handlers.onChat) socket.on('meeting:chat', handlers.onChat);
  if (handlers.onMediaState) socket.on('meeting:media-state', handlers.onMediaState);
  if (handlers.onEnded) socket.on('meeting:ended', handlers.onEnded);
  if (handlers.onKicked) socket.on('meeting:kicked', handlers.onKicked);

  return socket;
}

/** Вход в комнату: ack возвращает список уже подключённых пиров и себя. */
export function emitMeetingJoin(
  socket: Socket | null,
  meetingId: string
): Promise<{ ok: boolean; peers?: MeetingUser[]; me?: MeetingUser; error?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ ok: false, error: 'no-socket' });
      return;
    }
    socket.timeout(15_000).emit('meeting:join', { meetingId }, (err: unknown, ack: unknown) => {
      if (err) {
        resolve({ ok: false, error: 'timeout' });
        return;
      }
      resolve(
        (ack ?? { ok: false, error: 'no-ack' }) as {
          ok: boolean;
          peers?: MeetingUser[];
          me?: MeetingUser;
          error?: string;
        }
      );
    });
  });
}

export function sendMeetingSignal(
  socket: Socket | null,
  meetingId: string,
  toUserId: string,
  data: unknown
) {
  if (!socket) return;
  socket.emit('meeting:signal', { meetingId, toUserId, data });
}

export function sendMeetingChat(socket: Socket | null, meetingId: string, text: string) {
  if (!socket) return;
  socket.emit('meeting:chat', { meetingId, text });
}

export function sendMeetingMediaState(
  socket: Socket | null,
  meetingId: string,
  state: { mic: boolean; camera: boolean; screen: boolean }
) {
  if (!socket) return;
  socket.emit('meeting:media-state', { meetingId, ...state });
}
