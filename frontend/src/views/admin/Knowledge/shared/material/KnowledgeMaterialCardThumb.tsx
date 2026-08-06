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
  const externalThumb = useExternalVideoThumbnail(
    !thumbnailUrl && type === 'VIDEO' ? videoUrl : null
  );

  const preferredSrc = thumbnailUrl
    ? publicUploadUrl(thumbnailUrl)
    : externalThumb
      ? externalThumb
      : null;

  useEffect(() => {
    setImageFailed(false);
  }, [preferredSrc]);

  const placeholderIcon = <span aria-hidden>{getMaterialTypeIcon(type)}</span>;
  const imageSrc = !imageFailed ? preferredSrc : null;

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

  if (type === 'VIDEO' && videoUrl && isNativeVideoFileUrl(videoUrl)) {
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

  return <div className={placeholderClassName}>{placeholderIcon}</div>;
}
