'use client';

import { useRef } from 'react';

import { resolveAdminUploadUrl } from '@/shared/api/admin-quiz';

import styles from '../MebelQuizPage.module.css';
import { fileLabelFromUrl } from '../mebel-quiz-page.utils';

type QuizAdminFileUploadProps = {
  url: string | null | undefined;
  onUrlChange: (value: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading?: boolean;
  accept: string;
  uploadLabel: string;
  placeholder?: string;
  emptyHint?: string;
};

export function QuizAdminFileUpload({
  url,
  onUrlChange,
  onFileSelect,
  uploading = false,
  accept,
  uploadLabel,
  placeholder,
  emptyHint = 'Файл не загружен',
}: QuizAdminFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileName = fileLabelFromUrl(url);
  const fileHref = url ? resolveAdminUploadUrl(url) : '';

  return (
    <div className={styles.fileUpload}>
      <div className={styles.fileRow}>
        <input
          type="text"
          value={url ?? ''}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder={placeholder}
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className={styles.fileInputHidden}
          onChange={onFileSelect}
        />
        <button
          type="button"
          className={styles.fileUploadBtn}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? 'Загрузка…' : uploadLabel}
        </button>
      </div>
      {fileName ? (
        <p className={styles.fileStatus}>
          Загружен:{' '}
          <a href={fileHref} target="_blank" rel="noopener noreferrer">
            {fileName}
          </a>
        </p>
      ) : (
        <p className={styles.fileStatusMuted}>{emptyHint}</p>
      )}
    </div>
  );
}
