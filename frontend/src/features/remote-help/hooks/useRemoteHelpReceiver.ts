'use client';

/**
 * Сторона сотрудника в сеансе удалённой помощи:
 * приём приглашений (модалка), захват экрана по согласию, WebRTC-пир,
 * воспроизведение управления суперадмина и кнопка «Запросить помощь».
 * Для SUPER_ADMIN дополнительно слушает входящие запросы помощи (тост).
 */
import type { Socket } from 'socket.io-client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type RemoteHelpSession,
  acceptRemoteHelpSession,
  connectRemoteHelpSocket,
  createRemoteHelpRequest,
  declineRemoteHelpSession,
  endRemoteHelpSession,
  getMyRemoteHelpSession,
} from '@/shared/api/admin-remote-help';

import { type RemoteHelpSignal, isControlMessage } from '../lib/control-protocol';
import { type ControlReplay, createControlReplay } from '../lib/control-replay';
import { RemoteHelpPeer } from '../lib/remote-help-peer';

const TERMINAL_STATUSES = ['ENDED', 'DECLINED', 'CANCELLED', 'EXPIRED'] as const;
const DISCONNECT_GRACE_MS = 15_000;
/** Как часто перечитывать свою открытую сессию — восстановление пропущенных приглашений. */
const MY_SESSION_POLL_MS = 30_000;

export interface RemoteHelpReceiverModel {
  invite: RemoteHelpSession | null;
  activeSession: RemoteHelpSession | null;
  requestPending: boolean;
  requestSending: boolean;
  accepting: boolean;
  error: string | null;
  helperRequest: RemoteHelpSession | null;
  dismissHelperRequest: () => void;
  accept: () => void;
  decline: () => void;
  end: () => void;
  requestHelp: () => void;
  clearError: () => void;
}

export function useRemoteHelpReceiver(): RemoteHelpReceiverModel {
  const { user } = useAuth();
  const myId = user?.id ?? null;
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [invite, setInvite] = useState<RemoteHelpSession | null>(null);
  const [activeSession, setActiveSession] = useState<RemoteHelpSession | null>(null);
  const [requestPending, setRequestPending] = useState(false);
  const [requestSending, setRequestSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helperRequest, setHelperRequest] = useState<RemoteHelpSession | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RemoteHelpPeer | null>(null);
  const replayRef = useRef<ControlReplay | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const disconnectWatchRef = useRef<number | null>(null);
  const inviteRef = useRef<RemoteHelpSession | null>(null);
  const activeRef = useRef<RemoteHelpSession | null>(null);
  const myIdRef = useRef<string | null>(null);
  const isSuperAdminRef = useRef(false);

  useEffect(() => {
    inviteRef.current = invite;
  }, [invite]);
  useEffect(() => {
    activeRef.current = activeSession;
  }, [activeSession]);
  useEffect(() => {
    myIdRef.current = myId;
    isSuperAdminRef.current = isSuperAdmin;
  }, [myId, isSuperAdmin]);

  const clearDisconnectWatch = useCallback(() => {
    if (disconnectWatchRef.current !== null) {
      window.clearTimeout(disconnectWatchRef.current);
      disconnectWatchRef.current = null;
    }
  }, []);

  const teardownMedia = useCallback(() => {
    clearDisconnectWatch();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    replayRef.current?.destroy();
    replayRef.current = null;
  }, [clearDisconnectWatch]);

  const endByWorker = useCallback(
    async (sessionId: string, reason: 'manual' | 'share-stopped' | 'disconnect') => {
      teardownMedia();
      setActiveSession((prev) => (prev?.id === sessionId ? null : prev));
      try {
        await endRemoteHelpSession(sessionId, reason);
      } catch {
        /* сессию уже завершила вторая сторона */
      }
    },
    [teardownMedia]
  );

  const applySession = useCallback(
    (session: RemoteHelpSession) => {
      const my = myIdRef.current;
      if (session.userId === my) {
        if (TERMINAL_STATUSES.includes(session.status as (typeof TERMINAL_STATUSES)[number])) {
          setInvite((prev) => (prev?.id === session.id ? null : prev));
          if (activeRef.current?.id === session.id) {
            teardownMedia();
            setActiveSession(null);
          }
          setRequestPending(false);
        } else if (session.status === 'PENDING') {
          setInvite(session);
          setRequestPending(false);
        } else if (session.status === 'ACTIVE') {
          setInvite(null);
          setActiveSession(session);
          setRequestPending(false);
        } else if (session.status === 'REQUESTED') {
          setRequestPending(true);
        }
      }
      if (isSuperAdminRef.current) {
        if (session.status === 'REQUESTED') {
          setHelperRequest(session);
        } else {
          setHelperRequest((prev) => (prev?.id === session.id ? null : prev));
        }
      }
    },
    [teardownMedia]
  );

  useEffect(() => {
    if (!myId) return;

    const socket = connectRemoteHelpSocket({
      onInvite: (session) => {
        if (session.userId === myIdRef.current && session.status === 'PENDING') {
          setInvite(session);
        }
      },
      onRequest: (session) => {
        if (isSuperAdminRef.current && session.status === 'REQUESTED') {
          setHelperRequest(session);
        }
      },
      onSession: applySession,
      onSignal: ({ sessionId, data }) => {
        const peer = peerRef.current;
        if (!peer || peer.getSessionId() !== sessionId) return;
        void peer.handleSignal(data as RemoteHelpSignal);
      },
      onEnded: ({ sessionId }) => {
        setInvite((prev) => (prev?.id === sessionId ? null : prev));
        setHelperRequest((prev) => (prev?.id === sessionId ? null : prev));
        if (activeRef.current?.id === sessionId) {
          teardownMedia();
          setActiveSession(null);
        }
        setRequestPending(false);
      },
    });
    socketRef.current = socket;

    // Восстановление после перезагрузки вкладки: показать модалку/баннер заново
    getMyRemoteHelpSession()
      .then((session) => {
        if (session) applySession(session);
      })
      .catch(() => {
        /* не критично */
      });

    return () => {
      socket?.disconnect();
      socketRef.current = null;
      teardownMedia();
    };
  }, [myId, applySession, teardownMedia]);

  // Страховка от пропущенного сокет-приглашения (другая вкладка, релогин, клик по колокольчику):
  // периодически перечитываем свою открытую сессию
  useEffect(() => {
    if (!myId) return;
    const timer = window.setInterval(() => {
      if (inviteRef.current || activeRef.current) return;
      getMyRemoteHelpSession()
        .then((session) => {
          if (session) applySession(session);
        })
        .catch(() => {
          /* сеть/401 — следующий тик поправит */
        });
    }, MY_SESSION_POLL_MS);
    return () => window.clearInterval(timer);
  }, [myId, applySession]);

  /** Согласие: getDisplayMedia обязан вызываться синхронно в жесте клика. */
  const accept = useCallback(() => {
    const session = inviteRef.current;
    if (!session || accepting) return;
    setAccepting(true);

    const getMedia = navigator.mediaDevices?.getDisplayMedia
      ? navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 15, max: 30 } },
          audio: false,
        })
      : Promise.reject(new Error('Браузер не поддерживает трансляцию экрана'));

    void (async () => {
      try {
        const stream = await getMedia;
        streamRef.current = stream;
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.addEventListener('ended', () => {
            void endByWorker(session.id, 'share-stopped');
          });
        }

        await acceptRemoteHelpSession(session.id);

        const peer = await RemoteHelpPeer.create(session.id, socketRef.current, {
          onControlChannel: (channel) => {
            const replay = createControlReplay();
            replayRef.current = replay;
            channel.onmessage = (event) => {
              try {
                const message = JSON.parse(String(event.data));
                if (isControlMessage(message)) replay.apply(message);
              } catch {
                /* повреждённое сообщение игнорируем */
              }
            };
          },
          onStateChange: (state) => {
            if (state === 'connected') {
              clearDisconnectWatch();
            } else if (state === 'disconnected') {
              clearDisconnectWatch();
              disconnectWatchRef.current = window.setTimeout(() => {
                const current = peerRef.current?.pc.connectionState;
                if (current && current !== 'connected' && current !== 'new') {
                  void endByWorker(session.id, 'disconnect');
                }
              }, DISCONNECT_GRACE_MS);
            } else if (state === 'failed') {
              void endByWorker(session.id, 'disconnect');
            }
          },
        });
        peerRef.current = peer;
        await peer.startWorker(stream);

        setInvite(null);
        setActiveSession({ ...session, status: 'ACTIVE' });
      } catch (err) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setInvite(null);
        const cancelled = err instanceof DOMException && err.name === 'NotAllowedError';
        if (!cancelled) {
          setError(
            err instanceof Error && err.message
              ? `Не удалось начать трансляцию: ${err.message}`
              : 'Не удалось начать трансляцию'
          );
        }
        // выбор экрана отменён или сорвалось согласие — фиксируем отказ
        declineRemoteHelpSession(session.id).catch(() => {
          /* приглашение уже неактуально */
        });
      } finally {
        setAccepting(false);
      }
    })();
  }, [accepting, clearDisconnectWatch, endByWorker]);

  const decline = useCallback(() => {
    const session = inviteRef.current;
    if (!session) return;
    setInvite(null);
    declineRemoteHelpSession(session.id).catch(() => {
      /* приглашение уже неактуально */
    });
  }, []);

  const end = useCallback(() => {
    const session = activeRef.current;
    if (!session) return;
    void endByWorker(session.id, 'manual');
  }, [endByWorker]);

  const requestHelp = useCallback(() => {
    if (requestSending || requestPending) return;
    setRequestSending(true);
    void (async () => {
      try {
        const session = await createRemoteHelpRequest();
        applySession(session);
      } catch (err) {
        setError(
          err instanceof Error && err.message
            ? `Не удалось отправить запрос: ${err.message}`
            : 'Не удалось отправить запрос'
        );
      } finally {
        setRequestSending(false);
      }
    })();
  }, [applySession, requestPending, requestSending]);

  const dismissHelperRequest = useCallback(() => setHelperRequest(null), []);
  const clearError = useCallback(() => setError(null), []);

  return {
    invite,
    activeSession,
    requestPending,
    requestSending,
    accepting,
    error,
    helperRequest,
    dismissHelperRequest,
    accept,
    decline,
    end,
    requestHelp,
    clearError,
  };
}
