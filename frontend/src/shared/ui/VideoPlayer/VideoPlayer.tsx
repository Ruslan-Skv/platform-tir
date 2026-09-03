'use client';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { parseVideoEmbed } from '@/shared/lib/video/video-embed';

import styles from './VideoPlayer.module.css';

interface VideoPlayerProps {
  url: string;
  title?: string;
  className?: string;
}

/** Плеер для YouTube, Vimeo, Rutube, VK или прямого URL видео */
export function VideoPlayer({ url, title = 'Видео', className }: VideoPlayerProps) {
  const parsed = parseVideoEmbed(url);
  if (!parsed) return null;

  if (parsed.provider !== 'native') {
    const allow =
      parsed.provider === 'youtube'
        ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        : parsed.provider === 'rutube'
          ? 'clipboard-write; autoplay; fullscreen; picture-in-picture'
          : parsed.provider === 'vk'
            ? 'autoplay; encrypted-media; fullscreen; picture-in-picture'
            : 'fullscreen; picture-in-picture';

    return (
      <div className={`${styles.wrapper} ${className ?? ''}`}>
        <iframe
          src={parsed.embedUrl}
          title={title}
          allow={allow}
          allowFullScreen
          className={styles.iframe}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      <video src={publicUploadUrl(parsed.nativeUrl)} controls className={styles.native} />
    </div>
  );
}
