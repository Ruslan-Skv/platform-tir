'use client';

import styles from './ProductDetailPage.module.css';

type ProductVideoPlayerProps = {
  url: string;
};

/** Плеер для YouTube, Vimeo или прямого URL видео */
export function ProductVideoPlayer({ url }: ProductVideoPlayerProps) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const ytMatch =
    trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    const embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;
    return (
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title="Видео о товаре"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      </div>
    );
  }

  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return (
      <div className={styles.videoWrapper}>
        <iframe
          src={embedUrl}
          title="Видео о товаре"
          allow="fullscreen; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      </div>
    );
  }

  return (
    <div className={styles.videoWrapper}>
      <video src={trimmed} controls className={styles.videoNative} />
    </div>
  );
}
