'use client';

import { useState } from 'react';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { parseVideoEmbed } from '@/shared/lib/video/video-embed';

import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
  /** Не грузить плеер (и скрипты видеохостинга) до клика по постеру-заглушке. */
  lazy?: boolean;
}

/** Кнопка-постер: плеер и сторонние скрипты (реклама/аналитика хостинга) грузятся только по клику. */
function VideoPoster({
  title,
  className,
  onPlay,
}: {
  title: string;
  className?: string;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.wrapper} ${styles.poster} ${className ?? ''}`}
      onClick={onPlay}
      aria-label={`Смотреть видео: ${title}`}
    >
      <span className={styles.posterIcon} aria-hidden="true" />
      <span className={styles.posterLabel}>{title}</span>
    </button>
  );
}

/** Плеер для YouTube, Vimeo, Rutube, VK или прямого URL видео */
export function VideoPlayer({ url, title = 'Видео', className, lazy = false }: VideoPlayerProps) {
  const [activated, setActivated] = useState(false);
  const parsed = parseVideoEmbed(url);
  if (!parsed) return null;

  if (lazy && !activated) {
    return <VideoPoster title={title} className={className} onPlay={() => setActivated(true)} />;
  }

  if (parsed.provider !== 'native') {
    const allow =
      parsed.provider === 'youtube'
        ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        : parsed.provider === 'rutube'
          ? 'clipboard-write; autoplay; fullscreen; picture-in-picture'
          : parsed.provider === 'vk'
            ? 'autoplay; encrypted-media; fullscreen; picture-in-picture'
            : 'fullscreen; picture-in-picture';

    // В ленивом режиме плеер открыт кликом — стартуем воспроизведение сразу
    const src =
      lazy && activated
        ? parsed.embedUrl + (parsed.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1'
        : parsed.embedUrl;

    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <iframe src={src} title={title} allow={allow} allowFullScreen className={styles.iframe} />
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <video
        src={publicUploadUrl(parsed.nativeUrl)}
        autoPlay={lazy && activated}
        controls
        className={styles.native}
      />
    </div>
  );
}
