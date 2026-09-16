'use client';

import { useRef, useState } from 'react';

import { updateMeasurement, uploadMeasurementPhoto } from '@/shared/api/admin-crm';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { Modal } from '@/shared/ui/Modal';

import styles from './MeasurementPhotosModal.module.css';

export const MEASUREMENT_PHOTOS_MAX = 5;

interface MeasurementPhotosModalProps {
  /** Плавное открытие/закрытие: компонент должен быть смонтирован постоянно (как «Новое задание»). */
  isOpen: boolean;
  measurementId: string;
  measurementName?: string;
  photoUrls: string[];
  onPhotoUrlsChange: (photoUrls: string[]) => void;
  onError: (text: string) => void;
  onClose: () => void;
}

/** Фото с результатами замера: загрузка (до 5), превью, удаление (сохраняется сразу). */
export function MeasurementPhotosModal({
  isOpen,
  measurementId,
  measurementName,
  photoUrls,
  onPhotoUrlsChange,
  onError,
  onClose,
}: MeasurementPhotosModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Текущий список может отставать на итерацию цикла загрузки — держим свежую ссылку.
  const photoUrlsRef = useRef<string[]>(photoUrls);
  photoUrlsRef.current = photoUrls;

  const maxReached = photoUrls.length >= MEASUREMENT_PHOTOS_MAX;

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if ((photoUrlsRef.current?.length ?? 0) >= MEASUREMENT_PHOTOS_MAX) {
          setError(
            `Можно прикрепить не более ${MEASUREMENT_PHOTOS_MAX} фото — лишние файлы пропущены.`
          );
          break;
        }
        try {
          const { photoUrls: next } = await uploadMeasurementPhoto(measurementId, file);
          onPhotoUrlsChange(next);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Не удалось загрузить фото';
          setError(msg);
          onError(msg);
          break;
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const removePhoto = async (index: number) => {
    if (uploading) return;
    setError(null);
    const next = photoUrls.filter((_, i) => i !== index);
    try {
      const updated = await updateMeasurement(measurementId, { photoUrls: next });
      onPhotoUrlsChange(updated.photoUrls ?? next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Не удалось удалить фото';
      setError(msg);
      onError(msg);
    }
  };

  const modalTitle = measurementName
    ? `Фото замера: ${measurementName}`
    : 'Фото с результатами замера';

  return (
    <Modal
      isOpen={isOpen && Boolean(measurementId)}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      showCloseButton
    >
      <div className={styles.shell} data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={styles.modalHintFlush}>
          Прикрепите фотографии с результатами замера (jpg, png, webp, gif, до 8 МБ) — не более{' '}
          {MEASUREMENT_PHOTOS_MAX} шт. Фото сохраняется сразу, нажимать «Сохранить замер» не нужно.
          Нажмите на фото, чтобы открыть в полном размере.
        </p>

        <div className={styles.toolbarRow}>
          <input
            ref={fileInputRef}
            id="measurement-photos-input"
            type="file"
            className={styles.fileInputSrOnly}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading || maxReached}
            onChange={(e) => void handleFilesPicked(e.target.files)}
          />
          <label
            htmlFor="measurement-photos-input"
            data-modal-btn="secondary"
            className={styles.pickButton}
            data-disabled={uploading || maxReached ? '' : undefined}
          >
            {uploading ? 'Загрузка…' : 'Добавить фото'}
          </label>
          <input
            ref={cameraInputRef}
            id="measurement-photos-camera-input"
            type="file"
            className={styles.fileInputSrOnly}
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            disabled={uploading || maxReached}
            onChange={(e) => void handleFilesPicked(e.target.files)}
          />
          <label
            htmlFor="measurement-photos-camera-input"
            data-modal-btn="secondary"
            className={styles.pickButton}
            data-disabled={uploading || maxReached ? '' : undefined}
          >
            Снять на камеру
          </label>
          <span className={styles.counter}>
            {photoUrls.length} из {MEASUREMENT_PHOTOS_MAX}
          </span>
        </div>

        {error ? (
          <p data-modal-form-error role="alert">
            {error}
          </p>
        ) : null}

        {photoUrls.length === 0 && !uploading ? (
          <p className={styles.emptyState}>Фото замера ещё не прикреплены.</p>
        ) : (
          <div className={styles.photosGrid}>
            {photoUrls.map((url, index) => (
              <figure key={`${index}-${url}`} className={styles.photoCard} data-admin-mutation>
                <a
                  className={styles.photoLink}
                  href={publicUploadUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Фото замера №${index + 1} — открыть в полном размере`}
                >
                  <img
                    src={publicUploadUrl(url)}
                    alt={`Фото замера №${index + 1}`}
                    loading="lazy"
                  />
                </a>
                <figcaption className={styles.photoFooter}>
                  <span className={styles.photoOrdinal}>№{index + 1}</span>
                  <button
                    type="button"
                    className={styles.removeButton}
                    disabled={uploading}
                    onClick={() => void removePhoto(index)}
                  >
                    Удалить
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
