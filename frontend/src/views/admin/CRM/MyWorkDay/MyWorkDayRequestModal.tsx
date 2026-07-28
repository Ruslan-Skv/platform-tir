'use client';

import { type FormEvent, useEffect, useState } from 'react';

import type { WorkDayRequestType } from '@/shared/api/admin-work-days';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

const REQUEST_TYPE_LABELS: Record<WorkDayRequestType, string> = {
  DAY_OFF: 'Запросить выходной',
  EARLY_LEAVE: 'Уйти пораньше',
  LATE_ARRIVAL: 'Прийти попозже',
};

const REQUEST_HINTS: Record<WorkDayRequestType, string> = {
  DAY_OFF:
    'Дата будет считаться нерабочей после подтверждения руководителем. Пока запрос на рассмотрении, можно отменить его в списке ниже.',
  EARLY_LEAVE:
    'После подтверждения можно завершить рабочий день раньше окончания смены без штрафа за ранний уход.',
  LATE_ARRIVAL: 'После подтверждения можно начать день позже начала смены без штрафа за опоздание.',
};

const DEFAULT_TIME: Record<'EARLY_LEAVE' | 'LATE_ARRIVAL', string> = {
  EARLY_LEAVE: '17:00',
  LATE_ARRIVAL: '10:00',
};

function needsProposedTime(
  type: WorkDayRequestType | null
): type is 'EARLY_LEAVE' | 'LATE_ARRIVAL' {
  return type === 'EARLY_LEAVE' || type === 'LATE_ARRIVAL';
}

type MyWorkDayRequestModalProps = {
  open: boolean;
  type: WorkDayRequestType | null;
  busy: boolean;
  todayIso: string;
  onClose: () => void;
  onSubmit: (payload: {
    type: WorkDayRequestType;
    requestDate: string;
    proposedEndTime?: string;
    comment?: string;
  }) => Promise<void>;
};

export function MyWorkDayRequestModal({
  open,
  type,
  busy,
  todayIso,
  onClose,
  onSubmit,
}: MyWorkDayRequestModalProps) {
  const [formDate, setFormDate] = useState(todayIso);
  const [formTime, setFormTime] = useState('17:00');
  const [formComment, setFormComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormDate(todayIso);
    setFormTime(needsProposedTime(type) ? DEFAULT_TIME[type] : '17:00');
    setFormComment('');
    setError(null);
  }, [open, type, todayIso]);

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!type || !formDate) {
      setError('Укажите дату');
      return;
    }
    if (needsProposedTime(type) && !formTime) {
      setError(
        type === 'EARLY_LEAVE' ? 'Укажите желаемое время ухода' : 'Укажите желаемое время прихода'
      );
      return;
    }

    setError(null);
    try {
      await onSubmit({
        type,
        requestDate: formDate,
        proposedEndTime: needsProposedTime(type) ? formTime : undefined,
        comment: formComment.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить запрос');
    }
  };

  return (
    <Modal
      isOpen={open && type != null}
      onClose={handleClose}
      title={type ? REQUEST_TYPE_LABELS[type] : ''}
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
        {type ? (
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            {REQUEST_HINTS[type]}
          </p>
        ) : null}

        <div data-modal-form-grid>
          <div data-modal-form-group {...(type === 'DAY_OFF' ? { 'data-modal-span': true } : {})}>
            <label htmlFor="my-work-day-request-date">Дата *</label>
            <input
              id="my-work-day-request-date"
              type="date"
              value={formDate}
              disabled={busy}
              required
              onChange={(e) => setFormDate(e.target.value)}
            />
          </div>

          {needsProposedTime(type) ? (
            <div data-modal-form-group>
              <label htmlFor="my-work-day-request-time">
                {type === 'EARLY_LEAVE' ? 'Желаемое время ухода *' : 'Желаемое время прихода *'}
              </label>
              <input
                id="my-work-day-request-time"
                type="time"
                value={formTime}
                disabled={busy}
                required
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>
          ) : null}

          <div data-modal-form-group data-modal-span>
            <label htmlFor="my-work-day-request-comment">Комментарий</label>
            <textarea
              id="my-work-day-request-comment"
              value={formComment}
              disabled={busy}
              rows={3}
              placeholder="Необязательно"
              onChange={(e) => setFormComment(e.target.value)}
            />
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={busy}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || !formDate || (needsProposedTime(type) && !formTime)}
          >
            {busy ? 'Отправка…' : 'Отправить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
