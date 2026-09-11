'use client';

import { useRef, useState } from 'react';

import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cd from './PackageAttachedPhotosTab.module.css';

export type PackageAttachedPhotosTabProps = {
  packageId: string;
  /** Уникальный id для input type=file (без пробелов). */
  inputId: string;
  title: string;
  hint: string;
  /** Подпись одного элемента: «фото замера», «чертеж» — для подписей, alt и ошибок. */
  itemNoun: string;
  /** Подпись кнопки выбора файлов. */
  addButtonLabel: string;
  emptyStateText: string;
  photos: string[];
  maxPhotos: number;
  uploadPhoto: (packageId: string, file: File) => Promise<{ imageUrl: string }>;
  /** Вызывается после каждой успешной загрузки (прогрессивное сохранение). */
  onAppendPhoto: (imageUrl: string) => void;
  onRemovePhoto: (index: number) => void;
};

/**
 * Общая вкладка с прикрепляемыми изображениями (вкладки «Замер» и «Чертежи»):
 * выбор файлов (можно несколько), сетка превью, удаление, лимит количества.
 */
export function PackageAttachedPhotosTab({
  packageId,
  inputId,
  title,
  hint,
  itemNoun,
  addButtonLabel,
  emptyStateText,
  photos,
  maxPhotos,
  uploadPhoto,
  onAppendPhoto,
  onRemovePhoto,
}: PackageAttachedPhotosTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const maxReached = photos.length >= maxPhotos;

  const handleFilesPicked = async (files: FileList | null) => {
    if (!files || files.length === 0 || uploading) return;
    setUploadError(null);
    setUploading(true);
    let count = photos.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= maxPhotos) {
          setUploadError(
            `Можно прикрепить не более ${maxPhotos} (${itemNoun}) — лишние файлы пропущены.`
          );
          break;
        }
        try {
          const { imageUrl } = await uploadPhoto(packageId, file);
          count += 1;
          onAppendPhoto(imageUrl);
        } catch (e) {
          setUploadError(e instanceof Error ? e.message : `Не удалось загрузить ${itemNoun}`);
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
    onRemovePhoto(index);
  };

  return (
    <div className={cd.attachedPhotosTabRoot}>
      <section className={cd.sectionCard}>
        <h3 className={cd.sectionTitle}>{title}</h3>
        <p className={cd.sectionHint}>{hint}</p>
        <div className={cd.toolbarRow}>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            className={cd.fileInputSrOnly}
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            disabled={uploading || maxReached}
            onChange={(e) => void handleFilesPicked(e.target.files)}
          />
          <label
            htmlFor={inputId}
            data-modal-btn="secondary"
            className={`${cdWorkspace.secondaryBtn} ${cd.pickButton}`}
            data-disabled={uploading || maxReached ? '' : undefined}
          >
            {uploading ? 'Загрузка…' : addButtonLabel}
          </label>
          <span className={cd.counter}>
            {photos.length} из {maxPhotos}
          </span>
        </div>
        {uploadError ? (
          <p className={cd.errorText} role="alert">
            {uploadError}
          </p>
        ) : null}
        {photos.length === 0 && !uploading ? (
          <p className={cd.emptyState}>{emptyStateText}</p>
        ) : (
          <div className={cd.photosGrid}>
            {photos.map((url, index) => (
              <figure key={`${index}-${url}`} className={cd.photoCard} data-admin-mutation>
                <a
                  className={cd.photoLink}
                  href={publicUploadUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${itemNoun} №${index + 1} — открыть в полном размере`}
                >
                  <img
                    src={publicUploadUrl(url)}
                    alt={`${itemNoun} №${index + 1}`}
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
