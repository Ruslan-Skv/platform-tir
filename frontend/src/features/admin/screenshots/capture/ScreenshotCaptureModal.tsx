'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { uploadAdminScreenshot } from '@/shared/api/admin-screenshots';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

import styles from './ScreenshotCaptureModal.module.css';
import type { CapturedScreenshot } from './useScreenshotCapture';

type ScreenshotCaptureModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Снятый кадр (null — захват не удался, показываем error). */
  captured: CapturedScreenshot | null;
  error: string | null;
  /** «Снять заново» — родитель запускает захват повторно. */
  onRetake: () => void;
};

/** Предпросмотр снятого скриншота: комментарий + сохранение в раздел «Скриншоты». */
export function ScreenshotCaptureModal({
  isOpen,
  onClose,
  captured,
  error,
  onRetake,
}: ScreenshotCaptureModalProps) {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setComment('');
      setSaving(false);
      setSaveError(null);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!captured || saving || saved) return;
    setSaving(true);
    setSaveError(null);
    try {
      await uploadAdminScreenshot({
        file: captured.blob,
        comment,
        pageUrl: window.location.pathname,
        width: captured.width,
        height: captured.height,
      });
      setSaved(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Не удалось сохранить скриншот');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Скриншот" size="lg" alignTop compactOnMobile>
      {saved ? (
        <div className={styles.body}>
          <div className={styles.success}>
            <span>Скриншот сохранён — суперадмин сможет его посмотреть.</span>
            <span>
              Все скриншоты хранятся 3 суток в разделе{' '}
              <Link href="/admin/screenshots" className={styles.successLink} onClick={onClose}>
                «Скриншоты»
              </Link>
              .
            </span>
          </div>
          <div className={styles.actions}>
            <Button variant="primary" onClick={onClose}>
              Готово
            </Button>
          </div>
        </div>
      ) : captured ? (
        <div className={styles.body}>
          <img className={styles.preview} src={captured.previewUrl} alt="Предпросмотр скриншота" />
          <div className={styles.meta}>
            <span>
              {captured.width} × {captured.height} пикс.
            </span>
            <span>Страница: {typeof window !== 'undefined' ? window.location.pathname : ''}</span>
          </div>
          <label className={styles.commentLabel}>
            Комментарий (что случилось — необязательно)
            <textarea
              className={styles.comment}
              value={comment}
              maxLength={500}
              placeholder="Например: не открывается карточка заказа"
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          {saveError && <div className={styles.error}>{saveError}</div>}
          <div className={styles.actions}>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Отмена
            </Button>
            <Button variant="outline" onClick={onRetake} disabled={saving}>
              Снять заново
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.error}>
            {error ?? 'Не удалось сделать снимок экрана. Попробуйте ещё раз.'}
          </div>
          <div className={styles.actions}>
            <Button variant="outline" onClick={onClose}>
              Закрыть
            </Button>
            <Button variant="primary" onClick={onRetake}>
              Попробовать снова
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
