'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { probeVideoDurationSeconds } from '@/shared/lib/probe-video-duration';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { isNativeVideoFileUrl } from '@/shared/lib/video-embed';

import { formatVideoDurationLabel, getMaterialVideoDuration } from '../knowledge-utils';

type KnowledgeMaterialVideoDurationTagProps = {
  type?: string;
  videoUrl?: string | null;
  readingTimeMinutes?: number | null;
  className?: string;
  /** Префикс перед значением, например подпись «Длительность: » на странице материала. */
  labelPrefix?: ReactNode;
};

/**
 * Показывает длительность видео на карточке / в мета.
 * Берёт сохранённые минуты или читает metadata у загруженного MP4.
 */
export function KnowledgeMaterialVideoDurationTag({
  type,
  videoUrl,
  readingTimeMinutes,
  className,
  labelPrefix,
}: KnowledgeMaterialVideoDurationTagProps) {
  const storedMinutes = getMaterialVideoDuration({ type, readingTimeMinutes });
  const nativeUrl =
    type === 'VIDEO' && videoUrl && isNativeVideoFileUrl(videoUrl)
      ? publicUploadUrl(videoUrl)
      : null;

  const [probedSeconds, setProbedSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (storedMinutes != null && storedMinutes > 0) {
      setProbedSeconds(null);
      return;
    }
    if (!nativeUrl) {
      setProbedSeconds(null);
      return;
    }
    let cancelled = false;
    void probeVideoDurationSeconds(nativeUrl).then((seconds) => {
      if (cancelled) return;
      setProbedSeconds(seconds != null && seconds > 0 ? seconds : null);
    });
    return () => {
      cancelled = true;
    };
  }, [nativeUrl, storedMinutes]);

  const label = formatVideoDurationLabel({
    minutes: storedMinutes,
    seconds: probedSeconds,
  });
  if (!label) return null;

  return (
    <span className={className}>
      {labelPrefix != null ? (
        <>
          {labelPrefix} {label}
        </>
      ) : (
        <>⏱ {label}</>
      )}
    </span>
  );
}

export function materialMayShowVideoDuration(material: {
  type?: string;
  videoUrl?: string | null;
  readingTimeMinutes?: number | null;
}): boolean {
  if (material.type !== 'VIDEO') return false;
  if (getMaterialVideoDuration(material)) return true;
  return Boolean(material.videoUrl && isNativeVideoFileUrl(material.videoUrl));
}
