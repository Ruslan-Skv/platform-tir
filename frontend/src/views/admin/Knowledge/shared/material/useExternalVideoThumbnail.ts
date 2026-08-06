'use client';

import { useEffect, useState } from 'react';

import { resolveKnowledgeVideoThumbnail } from '@/shared/api/admin-knowledge';
import { getSyncVideoThumbnailUrl, needsAsyncVideoThumbnail } from '@/shared/lib/video-embed';

const thumbnailCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

async function loadAsyncThumbnail(videoUrl: string): Promise<string | null> {
  const cached = thumbnailCache.get(videoUrl);
  if (cached !== undefined) return cached;

  const pending = inflight.get(videoUrl);
  if (pending) return pending;

  const request = resolveKnowledgeVideoThumbnail(videoUrl)
    .then((result) => {
      const value = result.thumbnailUrl?.trim() || null;
      thumbnailCache.set(videoUrl, value);
      return value;
    })
    .catch(() => {
      thumbnailCache.set(videoUrl, null);
      return null;
    })
    .finally(() => {
      inflight.delete(videoUrl);
    });

  inflight.set(videoUrl, request);
  return request;
}

/**
 * Синхронное превью (YouTube) сразу; Rutube / Vimeo / VK — через API с кэшем.
 */
export function useExternalVideoThumbnail(videoUrl: string | null | undefined): string | null {
  const trimmed = videoUrl?.trim() || '';
  const syncThumb = trimmed ? getSyncVideoThumbnailUrl(trimmed) : null;
  const [asyncThumb, setAsyncThumb] = useState<string | null>(() => {
    if (!trimmed || syncThumb || !needsAsyncVideoThumbnail(trimmed)) return null;
    return thumbnailCache.get(trimmed) ?? null;
  });

  useEffect(() => {
    if (!trimmed || syncThumb || !needsAsyncVideoThumbnail(trimmed)) {
      setAsyncThumb(null);
      return;
    }

    const cached = thumbnailCache.get(trimmed);
    if (cached !== undefined) {
      setAsyncThumb(cached);
      return;
    }

    let cancelled = false;
    void loadAsyncThumbnail(trimmed).then((value) => {
      if (!cancelled) setAsyncThumb(value);
    });

    return () => {
      cancelled = true;
    };
  }, [trimmed, syncThumb]);

  return syncThumb ?? asyncThumb;
}
