/**
 * Captures a still frame from a local video File for use as a thumbnail.
 */
export async function captureVideoFileFrame(file: File, seekSeconds = 1): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Не удалось прочитать видео для обложки'));
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    // Берём кадр ближе к 15% ролика — в начале часто чёрный экран / заставка.
    const target =
      duration > 0
        ? Math.min(Math.max(duration * 0.15, seekSeconds), Math.max(duration - 0.25, 0.1))
        : seekSeconds;

    if (video.readyState < 1) {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('Не удалось прочитать видео для обложки'));
      });
    }

    video.currentTime = target;
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error('Не удалось получить кадр из видео'));
    });

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Не удалось создать обложку из видео');
    }
    ctx.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Не удалось создать обложку из видео'));
        },
        'image/jpeg',
        0.85
      );
    });

    return new File([blob], `video-thumb-${Date.now()}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
