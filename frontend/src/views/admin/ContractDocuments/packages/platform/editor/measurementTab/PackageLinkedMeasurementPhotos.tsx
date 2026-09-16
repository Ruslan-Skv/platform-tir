'use client';

import { useCallback, useEffect, useState } from 'react';

import { getMeasurement, updateMeasurement, uploadMeasurementPhoto } from '@/shared/api/admin-crm';

import { PACKAGE_MEASUREMENT_PHOTOS_MAX } from '../../form';
import { PackageAttachedPhotosTab } from '../attachedPhotosTab/PackageAttachedPhotosTab';
import link from './PackageMeasurementLinkSection.module.css';

export type PackageLinkedMeasurementPhotosProps = {
  /** ID связанного замера — фото хранятся на замере и синхронизированы с его страницей. */
  measurementId: string;
};

/**
 * Фото замера на вкладке «Замер» пакета, когда договор связан с замером.
 * Единый источник — Measurement.photoUrls: те же фото видны и редактируются
 * на странице замера (кнопка-скрепка) и здесь.
 */
export function PackageLinkedMeasurementPhotos({
  measurementId,
}: PackageLinkedMeasurementPhotosProps) {
  const [photos, setPhotos] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    setPhotos(null);
    setLoadError(null);
    void getMeasurement(measurementId)
      .then((m) => {
        if (aborted) return;
        setPhotos(m.photoUrls ?? []);
      })
      .catch(() => {
        if (!aborted) setLoadError('Не удалось загрузить фото замера');
      });
    return () => {
      aborted = true;
    };
  }, [measurementId]);

  const removePhoto = useCallback(
    async (index: number) => {
      setPhotos((prev) => {
        if (prev == null) return prev;
        const next = prev.filter((_, i) => i !== index);
        void updateMeasurement(measurementId, { photoUrls: next })
          .then((updated) => setPhotos(updated.photoUrls ?? next))
          .catch((e) => {
            setLoadError(e instanceof Error ? e.message : 'Не удалось удалить фото');
            void getMeasurement(measurementId)
              .then((m) => setPhotos(m.photoUrls ?? []))
              .catch(() => undefined);
          });
        return next;
      });
    },
    [measurementId]
  );

  if (loadError) {
    return <p className={link.errorText}>{loadError}</p>;
  }

  return (
    <PackageAttachedPhotosTab
      packageId={measurementId}
      inputId="package-linked-measurement-photo-input"
      title="Фото замера (синхронизировано со страницей замера)"
      hint="Договор связан с замером — эти же фото видны на странице замера (кнопка-скрепка) и наоборот. Прикрепите фотографии с результатами замера (jpg, png, webp, gif, до 8 МБ) — не более 5 шт. Фото сохраняется сразу. Нажмите на фото, чтобы открыть в полном размере."
      itemNoun="фото замера"
      addButtonLabel="Добавить фото"
      emptyStateText={photos === null ? 'Загрузка…' : 'Фото замера ещё не прикреплены.'}
      photos={photos ?? []}
      maxPhotos={PACKAGE_MEASUREMENT_PHOTOS_MAX}
      uploadPhoto={(id, file) => uploadMeasurementPhoto(id, file)}
      onAppendPhoto={(imageUrl) => {
        setPhotos((prev) => [...(prev ?? []), imageUrl].slice(0, PACKAGE_MEASUREMENT_PHOTOS_MAX));
      }}
      onRemovePhoto={(index) => void removePhoto(index)}
    />
  );
}
