'use client';

import { useEffect, useState } from 'react';

import {
  type WaybillTask,
  type WaybillTaskAttachment,
  deleteWaybillAttachment,
  uploadWaybillAttachments,
} from '@/shared/api/admin-waybills';
import { Modal } from '@/shared/ui/Modal';

import styles from '../shared/Waybills.module.css';
import { formatWaybillDateDisplay } from '../shared/waybills-page.utils';

const ACCEPT = '.pdf,image/*,.doc,.docx,.xls,.xlsx,.rtf,.txt';

type WaybillAttachmentsModalProps = {
  /** Задание; null — модалка закрыта. Компонент всегда смонтирован ради плавной анимации. */
  item: WaybillTask | null;
  onClose: () => void;
  /** Вызывается после любой смены вложений (для обновления таблицы). */
  onChanged: () => void | Promise<void>;
};

export function WaybillAttachmentsModal({
  item,
  onClose,
  onChanged,
}: WaybillAttachmentsModalProps) {
  const [attachments, setAttachments] = useState<WaybillTaskAttachment[]>(item?.attachments ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // При открытии на другом задании — подхватываем его вложения и сбрасываем ошибку.
  useEffect(() => {
    setAttachments(item?.attachments ?? []);
    setError(null);
  }, [item?.id, item?.attachments]);

  if (!item) {
    return (
      <Modal isOpen={false} onClose={onClose} title="Файлы задания" size="md" showCloseButton>
        <div data-modal-form data-modal-density="compact" />
      </Modal>
    );
  }

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const created = await uploadWaybillAttachments(item.id, files);
      setAttachments((prev) => [...prev, ...created]);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файлы');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setBusy(true);
    setError(null);
    try {
      await deleteWaybillAttachment(attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить файл');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Файлы задания" size="md" showCloseButton>
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={styles.modalHintFlush}>
          {formatWaybillDateDisplay(item.date)} · {item.taskText}
        </p>

        {attachments.length === 0 ? (
          <p data-modal-form-hint>
            Файлов пока нет — загрузите их, водитель увидит их в «Мой маршрут».
          </p>
        ) : (
          <ul className={styles.attachmentList}>
            {attachments.map((attachment) => (
              <li key={attachment.id} className={styles.attachmentRow}>
                <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                  {attachment.fileName}
                </a>
                <span className={styles.attachmentRowActions}>
                  <a
                    className={styles.attachmentDownloadLink}
                    href={attachment.fileUrl}
                    download={attachment.fileName}
                  >
                    Скачать
                  </a>
                  <button
                    data-admin-mutation
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.attachmentRemoveBtn}
                    disabled={busy}
                    onClick={() => void handleDelete(attachment.id)}
                    aria-label={`Удалить файл ${attachment.fileName}`}
                  >
                    Удалить
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-group>
          <label htmlFor="wb-attachments-quick">Добавить файлы</label>
          <input
            id="wb-attachments-quick"
            type="file"
            multiple
            accept={ACCEPT}
            disabled={busy}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = '';
              void handleUpload(files);
            }}
          />
          <span className={styles.fieldHint}>
            PDF, изображения, Word, Excel — до 10 файлов по 25 МБ.
          </span>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
