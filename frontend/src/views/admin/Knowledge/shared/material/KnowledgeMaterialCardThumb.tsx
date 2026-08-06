'use client';

import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { getNativeVideoPosterSrc, isNativeVideoFileUrl } from '@/shared/lib/video-embed';

import { getMaterialTypeIcon } from '../knowledge-utils';
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
  const externalThumb = useExternalVideoThumbnail(
    !thumbnailUrl && type === 'VIDEO' ? videoUrl : null
  );

  if (thumbnailUrl) {
    return <img src={publicUploadUrl(thumbnailUrl)} alt="" className={imageClassName} />;
  }

  if (type === 'VIDEO' && videoUrl) {
    if (externalThumb) {
      return <img src={externalThumb} alt="" className={imageClassName} />;
    }

    if (isNativeVideoFileUrl(videoUrl)) {
      const posterSrc = getNativeVideoPosterSrc(publicUploadUrl(videoUrl));
      if (posterSrc) {
        return (
          <video
            src={posterSrc}
            muted
            playsInline
            preload="metadata"
            className={imageClassName}
            style={{ pointerEvents: 'none' }}
            aria-hidden
          />
        );
      }
    }
  }

  return (
    <div className={placeholderClassName}>
      <span aria-hidden>{getMaterialTypeIcon(type)}</span>
    </div>
  );
}
