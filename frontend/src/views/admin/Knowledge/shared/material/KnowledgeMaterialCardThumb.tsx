'use client';

import { useEffect, useState } from 'react';

import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import {
  getNativeVideoPosterSrc,
  isNativeVideoFileUrl,
  isVkVideoUrl,
} from '@/shared/lib/video/video-embed';

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
  const isVkVideo = type === 'VIDEO' && Boolean(videoUrl) && isVkVideoUrl(videoUrl ?? '');

  // VK: стабильной обложки нет — всегда иконка (автопревью часто даёт мусор).
  // MP4: кадр из файла. Rutube/Vimeo/YouTube: превью.
  const externalThumb = useExternalVideoThumbnail(
    !isNativeVideo && !isVkVideo && type === 'VIDEO' ? videoUrl : null
  );

  const preferredSrc =
    isNativeVideo || isVkVideo
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

  if (isVkVideo) {
    return <div className={placeholderClassName}>{placeholderIcon}</div>;
  }

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
