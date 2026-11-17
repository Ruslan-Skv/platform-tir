'use client';

import { useCallback, useRef } from 'react';

/** Снятый кадр: blob для отправки + object URL для предпросмотра. */
export interface CapturedScreenshot {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

/** Ожидание первого кадра видео (requestVideoFrameCallback точнее таймера). */
function waitForFirstFrame(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    if (typeof video.requestVideoFrameCallback === 'function') {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      video.requestVideoFrameCallback(() => finish());
      // страховка, если колбэк не пришёл (некоторые браузеры/виртуальные камеры)
      window.setTimeout(finish, 1500);
      return;
    }
    window.setTimeout(resolve, 250);
  });
}

/**
 * Захват кадра экрана через Screen Capture API — как в «Удалённой помощи».
 * Вызывать строго синхронно из обработчика клика (требование браузера).
 * Пользователь выбирает источник (текущая вкладка предвыбрана), кадр снимается
 * сразу, поток останавливается. При отмене выбора возвращает null.
 */
export function useScreenshotCapture() {
  const capturingRef = useRef(false);

  const capture = useCallback(async (): Promise<CapturedScreenshot | null> => {
    if (capturingRef.current) return null;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error(
        'Браузер не поддерживает захват экрана. Откройте админку на компьютере в Chrome, Edge или Firefox.'
      );
    }

    capturingRef.current = true;
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'exclude',
      } as DisplayMediaStreamOptions);

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Не удалось получить изображение экрана'));
        window.setTimeout(() => resolve(), 2000);
      });
      await video.play().catch(() => undefined);
      await waitForFirstFrame(video);

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        throw new Error('Не удалось получить изображение экрана');
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Не удалось подготовить снимок');
      }
      context.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        throw new Error('Не удалось подготовить снимок');
      }

      video.srcObject = null;
      return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError')
      ) {
        return null; // пользователь закрыл окно выбора источника
      }
      throw error;
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      capturingRef.current = false;
    }
  }, []);

  return { capture };
}
