'use client';

import type { KnowledgeAttachment } from '@/shared/api/admin-knowledge';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from './KnowledgeAttachmentsList.module.css';

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

interface KnowledgeAttachmentsListProps {
  attachments: KnowledgeAttachment[];
}

export function KnowledgeAttachmentsList({ attachments }: KnowledgeAttachmentsListProps) {
  if (!attachments.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>Вложения</h2>
      <ul className={styles.list}>
        {attachments.map((a) => (
          <li key={a.id}>
            <a
              href={publicUploadUrl(a.fileUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              download={a.fileName}
            >
              <span className={styles.icon} aria-hidden>
                📎
              </span>
              <span className={styles.name}>{a.fileName}</span>
              {a.fileSize != null && (
                <span className={styles.size}>{formatFileSize(a.fileSize)}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
