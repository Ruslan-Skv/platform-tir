'use client';

import { type Dispatch, type SetStateAction, useRef, useState } from 'react';

import { uploadPackageMeasurementPhoto } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { PACKAGE_MEASUREMENT_PHOTOS_MAX } from '../../form';
import type { PackageFormData } from '../../form';
import cd from './PackageMeasurementTab.module.css';

export type PackageMeasurementTabProps = {
  packageId: string;
  form: PackageFormData;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

/** Вкладка «Замер»: фото с результатами замера (до 5 изображений). */
export function PackageMeasurementTab({
  packageId,
  form,
  setForm,
  touchPackageData,
}: PackageMeasurementTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const photos = form.measurementPhotoUrls;
  const maxReached = photos.length >= PACKAGE_MEASUREMENT_PHOTOS_MAX;

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;
    setUploadError(null);
    setUploading(true);
    let count = photos.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= PACKAGE_MEASUREMENT_PHOTOS_MAX) {
          setUploadError(
            `Можно прикрепить не более ${PACKAGE_MEASUREMENT_PHOTOS_MAX} фото — лишние файлы пропущены.`
          );
          break;
        }
        try {
          const { imageUrl } = await uploadPackageMeasurementPhoto(packageId, file);
          count += 1;
          setForm((prev) => ({
            ...prev,
            measurementPhotoUrls: [...prev.measurementPhotoUrls, imageUrl].slice(
              0,
              PACKAGE_MEASUREMENT_PHOTOS_MAX
            ),
          }));
          touchPackageData();
        } catch (e) {
          setUploadError(e instanceof Error ? e.message : 'Не удалось загрузить фото');
          break;
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    if (uploading) return;
    setUploadError(null);
    setForm((prev) => ({
      ...prev,
      measurementPhotoUrls: prev.measurementPhotoUrls.filter((_, i) => i !== index),
    }));
    touchPackageData();
  };

  return (
    <div className={cd.measurementTabRoot}>
      <section className={cd.sectionCard}>
        <h3 className={cd.sectionTitle}>Замер</h3>
        <p className={cd.sectionHint}>
          Прикрепите фотографии с результатами замера (jpg, png, webp, gif, до 8 МБ) — не более{' '}
          {PACKAGE_MEASUREMENT_PHOTOS_MAX} шт. Нажмите на фото, чтобы открыть в полном размере.
        </p>
        <div className={cd.toolbarRow}>
          <input
            ref={fileInputRef}
            id="package-measurement-photo-input"
            type="file"
            className={cd.fileInputSrOnly}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading || maxReached}
            onChange={(e) => void handleFilesPicked(e.target.files)}
          />
          <label
            htmlFor="package-measurement-photo-input"
            data-modal-btn="secondary"
            className={`${cdWorkspace.secondaryBtn} ${cd.pickButton}`}
            data-disabled={uploading || maxReached ? '' : undefined}
          >
            {uploading ? 'Загрузка…' : 'Добавить фото'}
          </label>
          <span className={cd.counter}>
            {photos.length} из {PACKAGE_MEASUREMENT_PHOTOS_MAX}
          </span>
        </div>
        {uploadError ? (
          <p className={cd.errorText} role="alert">
            {uploadError}
          </p>
        ) : null}
        {photos.length === 0 && !uploading ? (
          <p className={cd.emptyState}>Фото замера ещё не прикреплены.</p>
        ) : (
          <div className={cd.photosGrid}>
            {photos.map((url, index) => (
              <figure key={`${index}-${url}`} className={cd.photoCard} data-admin-mutation>
                <a
                  className={cd.photoLink}
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
                <figcaption className={cd.photoFooter}>
                  <span className={cd.photoOrdinal}>№{index + 1}</span>
                  <button
                    type="button"
                    className={cd.removeButton}
                    disabled={uploading}
                    onClick={() => removePhoto(index)}
                  >
                    Удалить
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
