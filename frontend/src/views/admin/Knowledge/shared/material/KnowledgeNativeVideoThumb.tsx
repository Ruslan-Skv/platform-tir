'use client';

import { useEffect, useState } from 'react';

import styles from './KnowledgeNativeVideoThumb.module.css';

type KnowledgeNativeVideoThumbProps = {
  src: string;
  className: string;
  placeholderClassName: string;
  placeholder: React.ReactNode;
};

/**
 * Показывает кадр из MP4: seek на ~15% длительности, иначе чёрный/первый кадр.
 */
export function KnowledgeNativeVideoThumb({
  src,
  className,
  placeholderClassName,
  placeholder,
}: KnowledgeNativeVideoThumbProps) {
  const [frameReady, setFrameReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFrameReady(false);
    setFailed(false);
  }, [src]);

  if (failed) {
    return <div className={placeholderClassName}>{placeholder}</div>;
  }

  return (
    <div className={styles.root}>
      {!frameReady ? <div className={placeholderClassName}>{placeholder}</div> : null}
      <video
        src={src}
        muted
        playsInline
        preload="auto"
        className={`${className} ${frameReady ? styles.videoVisible : styles.videoHidden}`}
        aria-hidden
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          const duration = video.duration;
          const target =
            Number.isFinite(duration) && duration > 0
              ? Math.min(Math.max(duration * 0.15, 1), Math.max(duration - 0.25, 0.1))
              : 1;
          try {
            video.currentTime = target;
          } catch {
            setFailed(true);
          }
        }}
        onSeeked={() => setFrameReady(true)}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
