'use client';

import { useEffect, useState } from 'react';

import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { getNativeVideoPosterSrc, isNativeVideoFileUrl } from '@/shared/lib/video-embed';

import { getMaterialTypeIcon } from '../knowledge-utils';
import { KnowledgeNativeVideoThumb } from './KnowledgeNativeVideoThumb';
import { useExternalVideoThumbnail } from './useExternalVideoThumbnail';

type KnowledgeMaterialCardThumbProps = {
  type: KnowledgeMaterialType;
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  imageClassName: string;
  placeholderClassName: string;
};

export function KnowledgeMaterialCardThumb({
  type,
  thumbnailUrl,
  videoUrl,
  imageClassName,
  placeholderClassName,
}: KnowledgeMaterialCardThumbProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const isNativeVideo =
    type === 'VIDEO' && Boolean(videoUrl) && isNativeVideoFileUrl(videoUrl ?? '');

  // Для MP4 всегда кадр из файла (сохранённая обложка часто бывает чёрной с начала ролика).
  // Для Rutube/VK/Vimeo — API-превью, даже если своей обложки нет.
  const externalThumb = useExternalVideoThumbnail(
    !isNativeVideo && type === 'VIDEO' ? videoUrl : null
  );

  const preferredSrc = isNativeVideo
    ? null
    : thumbnailUrl
      ? publicUploadUrl(thumbnailUrl)
      : externalThumb
        ? externalThumb
        : null;

  useEffect(() => {
    setImageFailed(false);
  }, [preferredSrc, videoUrl]);

  const placeholderIcon = <span aria-hidden>{getMaterialTypeIcon(type)}</span>;
  const imageSrc = !imageFailed ? preferredSrc : null;

  if (isNativeVideo && videoUrl) {
    const posterSrc = getNativeVideoPosterSrc(publicUploadUrl(videoUrl));
    if (posterSrc) {
      return (
        <KnowledgeNativeVideoThumb
          src={posterSrc}
          className={imageClassName}
          placeholderClassName={placeholderClassName}
          placeholder={placeholderIcon}
        />
      );
    }
  }

  if (imageSrc) {
    return (
      <img
        key={imageSrc}
        src={imageSrc}
        alt=""
        className={imageClassName}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return <div className={placeholderClassName}>{placeholderIcon}</div>;
}
