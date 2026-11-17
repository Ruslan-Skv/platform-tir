'use client';

import { CameraIcon } from '@heroicons/react/24/outline';

import { useCallback, useRef, useState } from 'react';

import { ScreenshotCaptureModal } from './capture/ScreenshotCaptureModal';
import { type CapturedScreenshot, useScreenshotCapture } from './capture/useScreenshotCapture';

type ScreenshotCaptureButtonProps = {
  /** Класс кнопки (стиль iconButton шапки админки). */
  className?: string;
  iconClassName?: string;
};

/**
 * Кнопка 📷 в шапке админки: захват экрана через браузер и сохранение
 * скриншота в раздел «Скриншоты» (видит суперадмин и сам автор).
 */
export function ScreenshotCaptureButton({
  className,
  iconClassName,
}: ScreenshotCaptureButtonProps = {}) {
  const { capture } = useScreenshotCapture();
  const [modalOpen, setModalOpen] = useState(false);
  const [captured, setCaptured] = useState<CapturedScreenshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const startCapture = useCallback(() => {
    // getDisplayMedia обязан вызываться синхронно в жесте клика
    void (async () => {
      try {
        const shot = await capture();
        releasePreview();
        if (shot) {
          previewUrlRef.current = shot.previewUrl;
          setCaptured(shot);
          setError(null);
        } else {
          setCaptured(null); // пользователь отменил выбор источника
          setError(null);
          setModalOpen(false);
          return;
        }
        setModalOpen(true);
      } catch (e) {
        releasePreview();
        setCaptured(null);
        setError(e instanceof Error ? e.message : 'Не удалось сделать снимок экрана');
        setModalOpen(true);
      }
    })();
  }, [capture, releasePreview]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const retake = useCallback(() => {
    setModalOpen(false);
    releasePreview();
    setCaptured(null);
    // небольшой сдвиг, чтобы модалка закрылась до вызова браузерного окна
    window.setTimeout(() => startCapture(), 120);
  }, [releasePreview, startCapture]);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={startCapture}
        title="Сделать скриншот и отправить в раздел «Скриншоты»"
        aria-label="Сделать скриншот"
      >
        <CameraIcon className={iconClassName} aria-hidden />
      </button>

      <ScreenshotCaptureModal
        isOpen={modalOpen}
        onClose={closeModal}
        captured={captured}
        error={error}
        onRetake={retake}
      />
    </>
  );
}
