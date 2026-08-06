'use client';

import { useEffect, useState } from 'react';

import styles from './KnowledgeNativeVideoThumb.module.css';

type KnowledgeNativeVideoThumbProps = {
  src: string;
  className: string;
  placeholderClassName: string;
  placeholder: React.ReactNode;
};

const posterCache = new Map<string, string>();

/**
 * Кадр из MP4: seek ~20% длительности → JPEG (кэш).
 * Сохранённые чёрные обложки в карточке не используем.
 */
export function KnowledgeNativeVideoThumb({
  src,
  className,
  placeholderClassName,
  placeholder,
}: KnowledgeNativeVideoThumbProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(() => posterCache.get(src) ?? null);
  const [showVideoFallback, setShowVideoFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setPosterUrl(posterCache.get(src) ?? null);
    setShowVideoFallback(false);
    setFailed(false);
  }, [src]);

  if (failed) {
    return <div className={placeholderClassName}>{placeholder}</div>;
  }

  if (posterUrl) {
    return <img src={posterUrl} alt="" className={className} />;
  }

  return (
    <div className={styles.root}>
      {!showVideoFallback ? <div className={placeholderClassName}>{placeholder}</div> : null}
      <video
        src={src}
        muted
        playsInline
        preload="auto"
        className={`${className} ${showVideoFallback ? styles.videoVisible : styles.videoHidden}`}
        aria-hidden
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          const duration = video.duration;
          const target =
            Number.isFinite(duration) && duration > 0
              ? Math.min(Math.max(duration * 0.2, 1.5), Math.max(duration - 0.5, 0.1))
              : 1.5;
          try {
            video.currentTime = target;
          } catch {
            setFailed(true);
          }
        }}
        onSeeked={(event) => {
          const video = event.currentTarget;
          const capture = () => {
            try {
              if (!video.videoWidth || !video.videoHeight) {
                setFailed(true);
                return;
              }
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                setShowVideoFallback(true);
                return;
              }
              ctx.drawImage(video, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              posterCache.set(src, dataUrl);
              setPosterUrl(dataUrl);
            } catch {
              setShowVideoFallback(true);
            }
          };

          const anyVideo = video as HTMLVideoElement & {
            requestVideoFrameCallback?: (cb: () => void) => number;
          };
          if (typeof anyVideo.requestVideoFrameCallback === 'function') {
            anyVideo.requestVideoFrameCallback(() => capture());
          } else {
            window.setTimeout(capture, 80);
          }
        }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
