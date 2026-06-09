'use client';

import { useRef, useState } from 'react';

import {
  type KnowledgeAttachmentInput,
  uploadKnowledgeAttachment,
} from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './KnowledgeAttachmentsEditor.module.css';

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface KnowledgeAttachmentsEditorProps {
  attachments: KnowledgeAttachmentInput[];
  onChange: (attachments: KnowledgeAttachmentInput[]) => void;
}

export function KnowledgeAttachmentsEditor({
  attachments,
  onChange,
}: KnowledgeAttachmentsEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadKnowledgeAttachment(file);
      onChange([
        ...attachments,
        {
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          fileSize: uploaded.fileSize,
          mimeType: uploaded.mimeType,
          sortOrder: attachments.length,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.editor}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv,image/*"
        onChange={handleUpload}
        className={styles.hiddenInput}
      />
      <button
        type="button"
        className={styles.uploadBtn}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Загрузка…' : '+ Добавить вложение'}
      </button>
      <p className={styles.hint}>PDF, Word, Excel, PowerPoint, ZIP, изображения — до 25 МБ</p>
      {error && <p className={styles.error}>{error}</p>}

      {attachments.length > 0 && (
        <ul className={styles.list}>
          {attachments.map((a, i) => (
            <li key={`${a.fileUrl}-${i}`} className={styles.item}>
              <a
                href={publicUploadUrl(a.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.fileLink}
              >
                📎 {a.fileName}
                {a.fileSize ? ` (${formatFileSize(a.fileSize)})` : ''}
              </a>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeAttachment(i)}
                aria-label="Удалить вложение"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
