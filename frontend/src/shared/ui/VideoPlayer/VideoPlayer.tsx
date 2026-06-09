'use client';

import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
}

/** Плеер для YouTube, Vimeo или прямого URL видео */
export function VideoPlayer({ url, title = 'Видео', className }: VideoPlayerProps) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      </div>
    );
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <iframe
          src={embedUrl}
          title={title}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className={styles.iframe}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <video src={trimmed} controls className={styles.native} />
    </div>
  );
}
