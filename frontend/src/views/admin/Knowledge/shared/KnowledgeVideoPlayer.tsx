'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type KnowledgeVideoProgress,
  updateKnowledgeVideoProgress,
} from '@/shared/api/admin-knowledge';
import { isNativeVideoFileUrl, parseVideoEmbed } from '@/shared/lib/video-embed';

import styles from './KnowledgeVideoPlayer.module.css';

interface KnowledgeVideoPlayerProps {
  materialId: string;
  url: string;
  title?: string;
  initialProgress?: KnowledgeVideoProgress | null;
}

export function KnowledgeVideoPlayer({
  materialId,
  url,
  title = 'Видео',
  initialProgress,
}: KnowledgeVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [progress, setProgress] = useState<KnowledgeVideoProgress | null>(initialProgress ?? null);
  const [saving, setSaving] = useState(false);

  const parsed = parseVideoEmbed(url);
  const isNative = parsed?.provider === 'native' && isNativeVideoFileUrl(url);

  const saveProgress = useCallback(
    async (percent: number, positionSeconds?: number, completed?: boolean) => {
      setSaving(true);
      try {
        const updated = await updateKnowledgeVideoProgress(materialId, {
          progressPercent: Math.round(percent),
          positionSeconds,
          completed,
        });
        setProgress(updated);
      } catch {
        // ignore transient save errors
      } finally {
        setSaving(false);
      }
    },
    [materialId]
  );

  const scheduleSave = useCallback(
    (percent: number, positionSeconds?: number, completed?: boolean) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        void saveProgress(percent, positionSeconds, completed);
      }, 1500);
    },
    [saveProgress]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isNative || !videoRef.current || !initialProgress?.positionSeconds) return;
    const video = videoRef.current;
    const setPosition = () => {
      if (initialProgress.positionSeconds > 0 && video.duration > initialProgress.positionSeconds) {
        video.currentTime = initialProgress.positionSeconds;
      }
    };
    if (video.readyState >= 1) setPosition();
    else video.addEventListener('loadedmetadata', setPosition, { once: true });
  }, [isNative, initialProgress?.positionSeconds]);

  const handleNativeTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration || Number.isNaN(video.duration)) return;
    const percent = (video.currentTime / video.duration) * 100;
    const completed = percent >= 90;
    scheduleSave(percent, video.currentTime, completed);
  };

  const handleMarkComplete = () => {
    void saveProgress(100, undefined, true);
  };

  if (!parsed) return null;

  const progressPercent = progress?.progressPercent ?? 0;
  const isCompleted = progress?.completed ?? false;

  let player: React.ReactNode = null;

  if (parsed.provider === 'youtube') {
    player = (
      <iframe
        src={parsed.embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    );
  } else if (parsed.provider === 'vimeo') {
    player = (
      <iframe
        src={parsed.embedUrl}
        title={title}
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    );
  } else if (parsed.provider === 'rutube') {
    player = (
      <iframe
        src={parsed.embedUrl}
        title={title}
        allow="clipboard-write; autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    );
  } else if (parsed.provider === 'vk') {
    player = (
      <iframe
        src={parsed.embedUrl}
        title={title}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    );
  } else if (parsed.provider === 'native') {
    player = (
      <video
        ref={videoRef}
        src={parsed.nativeUrl}
        controls
        className={styles.native}
        onTimeUpdate={handleNativeTimeUpdate}
        onEnded={() => void saveProgress(100, videoRef.current?.duration, true)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>{player}</div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>
            {isCompleted ? '✓ Просмотрено' : `Прогресс: ${progressPercent}%`}
          </span>
          {saving && <span className={styles.savingHint}>Сохранение…</span>}
        </div>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
        {!isNative && !isCompleted && (
          <button type="button" className={styles.completeBtn} onClick={handleMarkComplete}>
            Отметить как просмотренное
          </button>
        )}
      </div>
    </div>
  );
}
