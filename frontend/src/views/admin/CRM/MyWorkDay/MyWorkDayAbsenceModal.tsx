'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

type MyWorkDayAbsenceModalProps = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason?: string; comment?: string }) => Promise<void>;
};

export function MyWorkDayAbsenceModal({
  open,
  busy,
  onClose,
  onSubmit,
}: MyWorkDayAbsenceModalProps) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setComment('');
    setError(null);
  }, [open]);

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        reason: reason.trim() || undefined,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить отлучение');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Отлучиться"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Отметьте уход с офиса на объект или по другим делам. Время отлучения попадёт в журнал
          рабочего дня. По возвращении нажмите «Вернуться».
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="my-work-day-absence-reason">Куда</label>
            <input
              id="my-work-day-absence-reason"
              type="text"
              value={reason}
              disabled={busy}
              placeholder="Например: объект, банк, клиент"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div data-modal-form-group data-modal-span>
            <label htmlFor="my-work-day-absence-comment">Комментарий</label>
            <textarea
              id="my-work-day-absence-comment"
              value={comment}
              disabled={busy}
              rows={3}
              placeholder="Необязательно"
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={busy}>
            Отмена
          </button>
          <button data-admin-mutation type="submit" data-modal-btn="primary" disabled={busy}>
            {busy ? 'Сохранение…' : 'Уйти по делам'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
