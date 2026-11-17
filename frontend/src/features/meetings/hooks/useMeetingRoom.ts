'use client';

/**
 * Оркестратор комнаты онлайн-собрания: локальное медиа, mesh-пиры,
 * чат, запись и деградация качества при росте числа участников.
 */
import type { Socket } from 'socket.io-client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type Meeting,
  type MeetingChatMessage,
  type MeetingUser,
  connectMeetingsSocket,
  emitMeetingJoin,
  joinMeeting,
  leaveMeeting,
  sendMeetingMediaState,
} from '@/shared/api/admin-meetings';

import { MeetingRecorder, type RecorderTile, downloadRecording } from '../lib/meeting-recorder';
import { MeshPeer, type MeshSignalMessage } from '../lib/mesh-peer';

export type MeetingRoomPhase = 'idle' | 'connecting' | 'in-room' | 'ended' | 'error';

export interface RoomParticipant {
  user: MeetingUser;
  stream: MediaStream | null;
  connection: RTCPeerConnectionState;
  mic: boolean;
  camera: boolean;
  screen: boolean;
}

/** Комфортный битрейт mesh и деградация при 5+ участниках. */
const VIDEO_BITRATE_NORMAL = 800_000;
const VIDEO_BITRATE_LOW = 300_000;
const LOW_QUALITY_PEER_THRESHOLD = 5;

function displayName(user: MeetingUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}

export function useMeetingRoom(meetingId: string) {
  const [phase, setPhase] = useState<MeetingRoomPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [me, setMe] = useState<MeetingUser | null>(null);
  const [participants, setParticipants] = useState<Record<string, RoomParticipant>>({});
  const [chat, setChat] = useState<MeetingChatMessage[]>([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [lowQuality, setLowQuality] = useState(false);
  const [endedReason, setEndedReason] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, MeshPeer>>(new Map());
  const usersRef = useRef<Map<string, MeetingUser>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const meIdRef = useRef<string | null>(null);
  const recorderRef = useRef<MeetingRecorder | null>(null);
  const tilesRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const phaseRef = useRef<MeetingRoomPhase>('idle');

  phaseRef.current = phase;

  const patchParticipant = useCallback((userId: string, patch: Partial<RoomParticipant>) => {
    setParticipants((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      return { ...prev, [userId]: { ...current, ...patch } };
    });
  }, []);

  const applyBitrate = useCallback(() => {
    const low = peersRef.current.size >= LOW_QUALITY_PEER_THRESHOLD;
    setLowQuality(low);
    const bitrate = low ? VIDEO_BITRATE_LOW : VIDEO_BITRATE_NORMAL;
    for (const peer of peersRef.current.values()) {
      void peer.setVideoMaxBitrate(bitrate);
    }
  }, []);

  const closePeer = useCallback(
    (userId: string) => {
      const peer = peersRef.current.get(userId);
      if (peer) {
        peer.close();
        peersRef.current.delete(userId);
      }
      recorderRef.current?.removeStreamAudio(userId);
      setParticipants((prev) => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      applyBitrate();
    },
    [applyBitrate]
  );

  const createPeer = useCallback(
    (user: MeetingUser) => {
      if (!meIdRef.current || peersRef.current.has(user.id)) return;
      usersRef.current.set(user.id, user);
      const peer = new MeshPeer({
        localUserId: meIdRef.current,
        remoteUserId: user.id,
        meetingId,
        socket: socketRef.current,
        iceServers: iceServersRef.current,
        events: {
          onRemoteStream: (userId, stream) => {
            patchParticipant(userId, { stream });
            recorderRef.current?.addStreamAudio(userId, stream);
          },
          onStateChange: (userId, state) => {
            patchParticipant(userId, { connection: state });
          },
        },
      });
      peersRef.current.set(user.id, peer);
      peer.setLocalStream(localStreamRef.current);
      setParticipants((prev) => ({
        ...prev,
        [user.id]: {
          user,
          stream: prev[user.id]?.stream ?? null,
          connection: prev[user.id]?.connection ?? 'new',
          mic: prev[user.id]?.mic ?? true,
          camera: prev[user.id]?.camera ?? false,
          screen: prev[user.id]?.screen ?? false,
        },
      }));
      applyBitrate();
    },
    [applyBitrate, meetingId, patchParticipant]
  );

  const reconcilePeers = useCallback(
    (peers: MeetingUser[]) => {
      const alive = new Set(peers.map((p) => p.id));
      for (const user of peers) {
        createPeer(user);
      }
      for (const userId of [...peersRef.current.keys()]) {
        if (!alive.has(userId)) closePeer(userId);
      }
    },
    [closePeer, createPeer]
  );

  const handleSignal = useCallback(
    (payload: { fromUserId: string; data: unknown }) => {
      const { fromUserId, data } = payload;
      if (fromUserId === meIdRef.current) return;
      let peer = peersRef.current.get(fromUserId);
      if (!peer) {
        const user =
          usersRef.current.get(fromUserId) ??
          ({
            id: fromUserId,
            email: fromUserId,
            firstName: null,
            lastName: null,
            role: '',
            jobTitle: null,
            avatar: null,
          } as MeetingUser);
        createPeer(user);
        peer = peersRef.current.get(fromUserId);
      }
      void peer?.handleSignal(data as MeshSignalMessage);
    },
    [createPeer]
  );

  const teardown = useCallback((reason: string | null) => {
    for (const peer of peersRef.current.values()) {
      peer.close();
    }
    peersRef.current.clear();
    setParticipants({});

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    socketRef.current?.disconnect();
    socketRef.current = null;

    if (recorderRef.current?.active) {
      void recorderRef.current.stop().then((blob) => {
        if (blob) downloadRecording(blob, 'meeting');
      });
    }
    recorderRef.current = null;
    setRecording(false);

    setEndedReason(reason);
    setPhase('ended');
  }, []);

  const broadcastMediaState = useCallback(() => {
    sendMeetingMediaState(socketRef.current, meetingId, {
      mic: micOn,
      camera: camOn,
      screen: screenOn,
    });
  }, [camOn, meetingId, micOn, screenOn]);

  /** Вход в комнату — вызывать из обработчика клика (нужен user gesture). */
  const enter = useCallback(
    async (withVideo: boolean) => {
      if (phaseRef.current !== 'idle' && phaseRef.current !== 'error') return;
      setError(null);
      setPhase('connecting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: withVideo
            ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 24 } }
            : false,
        });
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
        setCamOn(Boolean(cameraTrackRef.current));

        const join = await joinMeeting(meetingId);
        iceServersRef.current = join.iceServers;
        setMeeting(join.meeting);
        for (const p of join.meeting.participants) {
          usersRef.current.set(p.userId, p.user);
        }

        const socket = connectMeetingsSocket({
          onPeerJoined: ({ user }) => createPeer(user),
          onPeerLeft: ({ userId }) => closePeer(userId),
          onSignal: handleSignal,
          onChat: (message) => setChat((prev) => [...prev, message]),
          onMediaState: ({ userId, mic, camera, screen }) => {
            patchParticipant(userId, { mic, camera, screen });
          },
          onEnded: ({ reason }) => teardown(reason),
          onKicked: () => teardown('kicked'),
        });
        if (!socket) throw new Error('Нет авторизации для подключения к собранию');
        socketRef.current = socket;

        // Переподключение сокета: повторно входим в комнату и синхронизируем пиров
        socket.on('connect', () => {
          if (phaseRef.current !== 'in-room') return;
          void emitMeetingJoin(socketRef.current, meetingId).then((ack) => {
            if (ack.ok && ack.peers) reconcilePeers(ack.peers);
          });
        });

        const ack = await emitMeetingJoin(socket, meetingId);
        if (!ack.ok) {
          throw new Error(
            ack.error === 'forbidden'
              ? 'Вы не участник этого собрания'
              : ack.error === 'not-found'
                ? 'Собрание не найдено'
                : 'Не удалось подключиться к комнате'
          );
        }
        if (ack.me) {
          meIdRef.current = ack.me.id;
          setMe(ack.me);
        }
        if (ack.peers) reconcilePeers(ack.peers);

        setPhase('in-room');
        broadcastMediaState();
      } catch (err) {
        localStreamRef.current?.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
        cameraTrackRef.current = null;
        socketRef.current?.disconnect();
        socketRef.current = null;
        setError(err instanceof Error ? err.message : 'Не удалось войти в собрание');
        setPhase('error');
      }
    },
    [
      broadcastMediaState,
      closePeer,
      createPeer,
      handleSignal,
      meetingId,
      patchParticipant,
      reconcilePeers,
      teardown,
    ]
  );

  const leave = useCallback(() => {
    void leaveMeeting(meetingId).catch(() => undefined);
    teardown('left');
  }, [meetingId, teardown]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    sendMeetingMediaState(socketRef.current, meetingId, {
      mic: track.enabled,
      camera: camOn,
      screen: screenOn,
    });
  }, [camOn, meetingId, screenOn]);

  const toggleCam = useCallback(async () => {
    const stream = localStreamRef.current;
    const track = cameraTrackRef.current;
    if (!stream) return;

    if (!track) {
      // вход был без видео — добавляем камеру на живых соединениях
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15, max: 24 },
          },
        });
        const camTrack = camStream.getVideoTracks()[0];
        if (!camTrack) return;
        cameraTrackRef.current = camTrack;
        stream.addTrack(camTrack);
        if (!screenOn) {
          for (const peer of peersRef.current.values()) {
            await peer.replaceVideoTrack(camTrack, stream);
          }
        }
        setCamOn(true);
      } catch {
        setError('Не удалось включить камеру');
      }
      return;
    }

    if (screenOn) {
      // экран активен — камера только локально, вверх идёт экран
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
      return;
    }

    if (!track.readyState || track.readyState === 'ended') {
      cameraTrackRef.current = null;
      setCamOn(false);
      return;
    }

    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    for (const peer of peersRef.current.values()) {
      await peer.replaceVideoTrack(track.enabled ? track : null, stream);
    }
    sendMeetingMediaState(socketRef.current, meetingId, {
      mic: micOn,
      camera: track.enabled,
      screen: screenOn,
    });
  }, [meetingId, micOn, screenOn]);

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    setScreenOn(false);
    const camera = cameraTrackRef.current;
    const stream = localStreamRef.current;
    for (const peer of peersRef.current.values()) {
      await peer.replaceVideoTrack(
        camera && camera.enabled ? camera : null,
        stream ?? new MediaStream()
      );
    }
    sendMeetingMediaState(socketRef.current, meetingId, {
      mic: micOn,
      camera: Boolean(camera?.enabled),
      screen: false,
    });
  }, [meetingId, micOn]);

  const toggleScreen = useCallback(async () => {
    if (screenStreamRef.current) {
      await stopScreenShare();
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } },
        audio: false,
      });
      screenStreamRef.current = display;
      const track = display.getVideoTracks()[0];
      track.onended = () => {
        void stopScreenShare();
      };
      setScreenOn(true);
      for (const peer of peersRef.current.values()) {
        await peer.replaceVideoTrack(track, display);
      }
      sendMeetingMediaState(socketRef.current, meetingId, {
        mic: micOn,
        camera: camOn,
        screen: true,
      });
    } catch {
      /* пользователь отменил выбор экрана */
    }
  }, [camOn, meetingId, micOn, stopScreenShare]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const socket = socketRef.current;
      if (!socket) return;
      socket.emit('meeting:chat', { meetingId, text: trimmed });
    },
    [meetingId]
  );

  const toggleRecording = useCallback(async () => {
    if (recorderRef.current?.active) {
      const blob = await recorderRef.current.stop();
      recorderRef.current = null;
      setRecording(false);
      if (blob) downloadRecording(blob, meeting?.title ?? 'meeting');
      return;
    }
    try {
      const recorder = new MeetingRecorder(() => {
        const tiles: RecorderTile[] = [];
        const meTile = tilesRef.current.get('me');
        if (meTile)
          tiles.push({
            el: meTile,
            label: `${displayName(me ?? ({ email: 'Я' } as MeetingUser))} (вы)`,
          });
        for (const [userId, participant] of Object.entries(participants)) {
          const el = tilesRef.current.get(userId);
          if (el) tiles.push({ el, label: displayName(participant.user) });
        }
        return tiles;
      });
      recorder.start();
      recorderRef.current = recorder;
      recorder.addStreamAudio('local', localStreamRef.current);
      for (const participant of Object.values(participants)) {
        recorder.addStreamAudio(participant.user.id, participant.stream);
      }
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось начать запись');
    }
  }, [me, meeting?.title, participants]);

  /** Регистрация видео-элементов для записи (локальный — 'me'). */
  const registerTile = useCallback((key: string, el: HTMLVideoElement | null) => {
    if (el) tilesRef.current.set(key, el);
    else tilesRef.current.delete(key);
  }, []);

  useEffect(() => {
    const peers = peersRef.current;
    return () => {
      // размонтирование компонента с активной комнатой — корректный выход
      if (phaseRef.current === 'in-room') {
        void leaveMeeting(meetingId).catch(() => undefined);
      }
      for (const peer of peers.values()) {
        peer.close();
      }
      peers.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      socketRef.current?.disconnect();
      void recorderRef.current?.stop().catch(() => null);
    };
  }, [meetingId]);

  const remoteList = useMemo(() => Object.values(participants), [participants]);

  return {
    phase,
    error,
    meeting,
    me,
    localStream: localStreamRef.current,
    participants: remoteList,
    chat,
    micOn,
    camOn,
    screenOn,
    recording,
    lowQuality,
    endedReason,
    enter,
    leave,
    toggleMic,
    toggleCam,
    toggleScreen,
    sendChat,
    toggleRecording,
    registerTile,
  };
}
