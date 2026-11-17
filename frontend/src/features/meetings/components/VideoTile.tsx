'use client';

import { useEffect, useRef } from 'react';

import type { MeetingUser } from '@/shared/api/admin-meetings';

import styles from './MeetingsRoom.module.css';

export interface VideoTileProps {
  label: string;
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  mic?: boolean;
  camera?: boolean;
  screen?: boolean;
  connection?: RTCPeerConnectionState;
  isSelf?: boolean;
  registerEl?: (el: HTMLVideoElement | null) => void;
}

export function VideoTile({
  label,
  stream,
  muted = false,
  mirrored = false,
  mic = true,
  camera = true,
  screen = false,
  connection,
  isSelf = false,
  registerEl,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    registerEl?.(el);
    return () => registerEl?.(null);
  }, [stream, registerEl]);

  const showVideo = Boolean(stream && (camera || screen || isSelf));
  const weak = connection === 'disconnected' || connection === 'failed';

  return (
    <div className={`${styles.tile} ${showVideo ? '' : styles.tileAudioOnly}`}>
      <video
        ref={videoRef}
        className={styles.tileVideo}
        style={mirrored ? { transform: 'scaleX(-1)' } : undefined}
        autoPlay
        playsInline
        muted={muted || isSelf}
      />
      {!showVideo && (
        <div className={styles.tilePlaceholder}>
          <span className={styles.tileAvatar}>{label.slice(0, 1).toUpperCase()}</span>
        </div>
      )}
      <div className={styles.tileBar}>
        <span className={styles.tileName}>
          {label}
          {isSelf ? ' (вы)' : ''}
        </span>
        <span className={styles.tileFlags}>
          {screen && (
            <span className={styles.flagScreen} title="Демонстрирует экран">
              🖥
            </span>
          )}
          {camera && !screen && (
            <span className={styles.flagCam} title="Камера включена">
              🎥
            </span>
          )}
          <span
            className={mic ? styles.flagMicOn : styles.flagMicOff}
            title={mic ? 'Микрофон включён' : 'Микрофон выключен'}
          >
            {mic ? '🎙' : '🔇'}
          </span>
          {weak && (
            <span className={styles.flagWeak} title="Слабое соединение">
              ⚠
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

export function formatParticipantName(user: MeetingUser): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name || user.email;
}
