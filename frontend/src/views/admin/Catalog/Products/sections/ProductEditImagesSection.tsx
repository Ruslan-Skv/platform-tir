'use client';

import { useRef, useState } from 'react';
import type { DragEvent } from 'react';

import styles from '../ProductEditPage.module.css';

type ProductEditImagesSectionProps = {
  images: string[];
  imagesHighlight: boolean;
  imageError: string | null;
  onImageUpload: (files: FileList | null) => void;
  onAddByUrl: () => void;
  onRemoveImage: (index: number) => void;
  onMoveImage: (index: number, direction: 'up' | 'down') => void;
};

export function ProductEditImagesSection({
  images,
  imagesHighlight,
  imageError,
  onImageUpload,
  onAddByUrl,
  onRemoveImage,
  onMoveImage,
}: ProductEditImagesSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    onImageUpload(e.dataTransfer.files);
  };

  return (
    <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
      <h2 className={styles.sectionTitle}>Изображения *</h2>

      {imageError && <div className={styles.imageError}>{imageError}</div>}

      <div
        className={
          imagesHighlight ? styles.fieldHighlightBlockFilled : styles.fieldHighlightBlockEmpty
        }
      >
        <div
          className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(e) => onImageUpload(e.target.files)}
            className={styles.fileInput}
          />
          <div className={styles.dropZoneContent}>
            <span className={styles.dropZoneIcon}>📷</span>
            <p className={styles.dropZoneText}>
              Перетащите изображения сюда или{' '}
              <span className={styles.dropZoneLink}>выберите файлы</span>
            </p>
            <p className={styles.dropZoneHint}>JPG, PNG, WebP, GIF до 5MB</p>
          </div>
        </div>

        <button type="button" className={styles.addUrlButton} onClick={onAddByUrl}>
          🔗 Добавить по URL
        </button>

        {images.length > 0 ? (
          <div className={styles.imagesGrid}>
            {images.map((img, index) => (
              <div key={index} className={styles.imageItem}>
                <img src={img} alt={`Изображение ${index + 1}`} />
                {index === 0 && <span className={styles.mainImageBadge}>Главное</span>}
                <div className={styles.imageActions}>
                  <button
                    type="button"
                    className={styles.imageActionBtn}
                    onClick={() => onMoveImage(index, 'up')}
                    disabled={index === 0}
                    title="Переместить влево"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={styles.imageActionBtn}
                    onClick={() => onMoveImage(index, 'down')}
                    disabled={index === images.length - 1}
                    title="Переместить вправо"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className={`${styles.imageActionBtn} ${styles.imageDeleteBtn}`}
                    onClick={() => onRemoveImage(index)}
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noImages}>Изображения не добавлены</p>
        )}
      </div>
    </div>
  );
}
