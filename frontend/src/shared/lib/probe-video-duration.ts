/**
 * Reads media duration in seconds from a local File or remote/public video URL.
 * Returns null if metadata cannot be loaded.
 */
export function probeVideoDurationSeconds(source: File | string): Promise<number | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);

  const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
  const src = typeof source === 'string' ? source : objectUrl!;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    let settled = false;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      video.removeAttribute('src');
      video.load();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(value);
    };

    const timer = window.setTimeout(() => finish(null), 15000);

    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = video.duration;
      if (Number.isFinite(duration) && duration > 0) {
        finish(duration);
        return;
      }
      finish(null);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };

    video.src = src;
  });
}

/** Whole minutes for forms / `readingTimeMinutes` (at least 1 if duration > 0). */
export function videoDurationSecondsToMinutes(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.max(1, Math.round(seconds / 60));
}
