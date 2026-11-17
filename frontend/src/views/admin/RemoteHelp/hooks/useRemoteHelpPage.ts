'use client';

/**
 * Логика страницы «Удалённая помощь» для суперадмина:
 * онлайн-сотрудники, приглашения/запросы, просмотр трансляции и управление,
 * история сеансов.
 */
import type { Socket } from 'socket.io-client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  RemoteHelpPeer,
  type RemoteHelpSignal,
  attachControlCapture,
} from '@/features/remote-help';
import {
  type RemoteHelpOpenSessions,
  type RemoteHelpSession,
  cancelRemoteHelpSession,
  claimRemoteHelpSession,
  connectRemoteHelpSocket,
  createRemoteHelpInvite,
  endRemoteHelpSession,
  getMyRemoteHelpSession,
  getRemoteHelpPending,
  getRemoteHelpSessions,
} from '@/shared/api/admin-remote-help';
import { type AdminOnlineUser, getAdminOnlineAdmins } from '@/shared/api/crm/admin-presence';

const PENDING_POLL_MS = 8_000;
const ONLINE_POLL_MS = 25_000;
const TERMINAL_STATUSES = ['ENDED', 'DECLINED', 'CANCELLED', 'EXPIRED'] as const;

export interface RemoteHelpPageModel {
  pending: RemoteHelpOpenSessions | null;
  history: RemoteHelpSession[];
  onlineAdmins: OnlineUser[];
  viewerSession: RemoteHelpSession | null;
  stream: MediaStream | null;
  connectionState: RTCPeerConnectionState | 'waiting';
  controlEnabled: boolean;
  controlChannel: RTCDataChannel | null;
  busyUserId: string | null;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  invite: (userId: string) => void;
  claim: (sessionId: string) => void;
  cancel: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
  toggleControl: () => void;
  toggleFullscreen: () => void;
  refresh: () => void;
  clearError: () => void;
}

type OnlineUser = AdminOnlineUser;

export function useRemoteHelpPage(): RemoteHelpPageModel {
  const { user } = useAuth();

  const [pending, setPending] = useState<RemoteHelpOpenSessions | null>(null);
  const [history, setHistory] = useState<RemoteHelpSession[]>([]);
  const [onlineAdmins, setOnlineAdmins] = useState<OnlineUser[]>([]);
  const [viewerSession, setViewerSession] = useState<RemoteHelpSession | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | 'waiting'>(
    'waiting'
  );
  const [controlEnabled, setControlEnabled] = useState(false);
  const [controlChannel, setControlChannel] = useState<RTCDataChannel | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RemoteHelpPeer | null>(null);
  const controlEnabledRef = useRef(false);
  const viewerRef = useRef<RemoteHelpSession | null>(null);
  const myIdRef = useRef<string | null>(null);
  const detachCaptureRef = useRef<(() => void) | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    viewerRef.current = viewerSession;
  }, [viewerSession]);
  useEffect(() => {
    myIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const refreshPending = useCallback(async () => {
    try {
      const data = await getRemoteHelpPending();
      if (!aliveRef.current) return;
      setPending(data);
      // Poll только подхватывает активную сессию — закрывает её исключительно сокет/REST
      const mine = data.active.find((s) => s.adminId === myIdRef.current);
      if (mine && (!viewerRef.current || viewerRef.current.id === mine.id)) {
        setViewerSession(mine);
      }
    } catch {
      /* сеть/401 — следующий тик поправит */
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await getRemoteHelpSessions({ limit: 50 });
      if (aliveRef.current) setHistory(data);
    } catch {
      /* сеть/401 — следующий тик поправит */
    }
  }, []);

  const refreshOnline = useCallback(async () => {
    try {
      const data = await getAdminOnlineAdmins();
      if (aliveRef.current) {
        setOnlineAdmins(data.filter((u) => u.id !== user?.id && u.role !== 'SUPER_ADMIN'));
      }
    } catch {
      /* presence опционален */
    }
  }, [user?.id]);

  const teardownViewer = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    detachCaptureRef.current?.();
    detachCaptureRef.current = null;
    setStream(null);
    setControlChannel(null);
    setControlEnabled(false);
    controlEnabledRef.current = false;
    setConnectionState('waiting');
  }, []);

  // Поток пришёл — вешаем на видео (сессия могла стать известной позже потока)
  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      void video.play().catch(() => {
        /* автоплей может быть заблокирован — пользователь нажмёт play */
      });
    }
  }, [stream, viewerSession]);

  // Канал управления появился — цепляем захват событий (когда DOM готов)
  useEffect(() => {
    if (!controlChannel || !stream) return;
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;
    detachCaptureRef.current?.();
    detachCaptureRef.current = attachControlCapture(container, video, controlChannel, {
      isEnabled: () => controlEnabledRef.current,
    });
  }, [controlChannel, stream, viewerSession]);

  useEffect(() => {
    aliveRef.current = true;

    const socket = connectRemoteHelpSocket({
      onSession: (session) => {
        void refreshPending();
        const terminal = TERMINAL_STATUSES.includes(
          session.status as (typeof TERMINAL_STATUSES)[number]
        );
        if (terminal) {
          void refreshHistory();
        }
        if (session.adminId === myIdRef.current) {
          if (session.status === 'ACTIVE') {
            setViewerSession(session);
          } else if (terminal && viewerRef.current?.id === session.id) {
            teardownViewer();
            setViewerSession(null);
          }
        }
      },
      onRequest: () => void refreshPending(),
      onInvite: () => void refreshPending(),
      onEnded: ({ sessionId }) => {
        if (viewerRef.current?.id === sessionId) {
          teardownViewer();
          setViewerSession(null);
        }
        void refreshPending();
        void refreshHistory();
      },
      onSignal: ({ sessionId, data }) => {
        const signal = data as RemoteHelpSignal;
        void (async () => {
          if (
            signal.kind === 'offer' &&
            (!peerRef.current || peerRef.current.getSessionId() !== sessionId)
          ) {
            // шлюз ретранслирует сигналы только второй стороне сессии — offer адресован нам,
            // даже если pending ещё не показал сессию как активную
            if (!viewerRef.current || viewerRef.current.id !== sessionId) {
              const mine = await getMyRemoteHelpSession();
              if (mine?.status !== 'ACTIVE' || mine.id !== sessionId) return;
              setViewerSession(mine);
            }
            const peer = await RemoteHelpPeer.create(sessionId, socketRef.current, {
              onRemoteStream: (incoming) => setStream(incoming),
              onControlChannel: (channel) => setControlChannel(channel),
              onStateChange: (state) => setConnectionState(state),
            });
            peerRef.current = peer;
          }
          const peer = peerRef.current;
          if (peer && peer.getSessionId() === sessionId) {
            await peer.handleSignal(signal);
          }
        })();
      },
    });
    socketRef.current = socket;

    void refreshPending();
    void refreshHistory();
    void refreshOnline();

    const pendingTimer = window.setInterval(() => void refreshPending(), PENDING_POLL_MS);
    const onlineTimer = window.setInterval(() => void refreshOnline(), ONLINE_POLL_MS);

    return () => {
      aliveRef.current = false;
      window.clearInterval(pendingTimer);
      window.clearInterval(onlineTimer);
      socket?.disconnect();
      socketRef.current = null;
      teardownViewer();
    };
  }, [refreshHistory, refreshOnline, refreshPending, teardownViewer]);

  const runAction = useCallback(
    async (key: string, action: () => Promise<unknown>) => {
      setBusyUserId(key);
      setError(null);
      try {
        await action();
        await refreshPending();
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : 'Действие не удалось');
      } finally {
        if (aliveRef.current) setBusyUserId(null);
      }
    },
    [refreshPending]
  );

  const invite = useCallback(
    (userId: string) => {
      void runAction(userId, () => createRemoteHelpInvite(userId));
    },
    [runAction]
  );

  const claim = useCallback(
    (sessionId: string) => {
      void runAction(sessionId, () => claimRemoteHelpSession(sessionId));
    },
    [runAction]
  );

  const cancel = useCallback(
    (sessionId: string) => {
      void runAction(sessionId, () => cancelRemoteHelpSession(sessionId));
    },
    [runAction]
  );

  const endSession = useCallback(
    (sessionId: string) => {
      void runAction(sessionId, () => endRemoteHelpSession(sessionId, 'manual'));
      void refreshHistory();
    },
    [refreshHistory, runAction]
  );

  const toggleControl = useCallback(() => {
    const next = !controlEnabledRef.current;
    controlEnabledRef.current = next;
    setControlEnabled(next);
    const channel = peerRef.current?.getControlChannel();
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify({ t: 'mode', control: next }));
    }
    if (next) containerRef.current?.focus();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void container.requestFullscreen?.();
    }
  }, []);

  const refresh = useCallback(() => {
    void refreshPending();
    void refreshHistory();
    void refreshOnline();
  }, [refreshHistory, refreshOnline, refreshPending]);

  const clearError = useCallback(() => setError(null), []);

  return {
    pending,
    history,
    onlineAdmins,
    viewerSession,
    stream,
    connectionState,
    controlEnabled,
    controlChannel,
    busyUserId,
    error,
    videoRef,
    containerRef,
    invite,
    claim,
    cancel,
    endSession,
    toggleControl,
    toggleFullscreen,
    refresh,
    clearError,
  };
}
