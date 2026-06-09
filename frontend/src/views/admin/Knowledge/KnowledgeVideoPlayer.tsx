'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type KnowledgeVideoProgress,
  updateKnowledgeVideoProgress,
} from '@/shared/api/admin-knowledge';

import styles from './KnowledgeVideoPlayer.module.css';

interface KnowledgeVideoPlayerProps {
  materialId: string;
  url: string;
  title?: string;
  initialProgress?: KnowledgeVideoProgress | null;
}

function isNativeVideoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (/youtube\.com|youtu\.be|vimeo\.com/i.test(trimmed)) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(trimmed) || trimmed.startsWith('/uploads/');
}

function getEmbedType(url: string): 'youtube' | 'vimeo' | 'native' {
  if (isNativeVideoUrl(url)) return 'native';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/vimeo\.com/i.test(url)) return 'vimeo';
  return 'native';
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

  const embedType = getEmbedType(url);

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
    if (embedType !== 'native' || !videoRef.current || !initialProgress?.positionSeconds) return;
    const video = videoRef.current;
    const setPosition = () => {
      if (initialProgress.positionSeconds > 0 && video.duration > initialProgress.positionSeconds) {
        video.currentTime = initialProgress.positionSeconds;
      }
    };
    if (video.readyState >= 1) setPosition();
    else video.addEventListener('loadedmetadata', setPosition, { once: true });
  }, [embedType, initialProgress?.positionSeconds]);

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

  const trimmed = url.trim();
  if (!trimmed) return null;

  const progressPercent = progress?.progressPercent ?? 0;
  const isCompleted = progress?.completed ?? false;

  let player: React.ReactNode = null;

  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    player = (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}?rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    );
  } else {
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
      player = (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          title={title}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      );
    } else {
      player = (
        <video
          ref={videoRef}
          src={trimmed}
          controls
          className={styles.native}
          onTimeUpdate={handleNativeTimeUpdate}
          onEnded={() => void saveProgress(100, videoRef.current?.duration, true)}
        />
      );
    }
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
        {embedType !== 'native' && !isCompleted && (
          <button type="button" className={styles.completeBtn} onClick={handleMarkComplete}>
            Отметить как просмотренное
          </button>
        )}
      </div>
    </div>
  );
}
