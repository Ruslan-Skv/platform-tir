'use client';

import { type FormEvent, useEffect, useState } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

type WorkDayHolidayModalProps = {
  open: boolean;
  busy: boolean;
  todayIso: string;
  onClose: () => void;
  onSubmit: (payload: { title?: string; dateFrom: string; dateTo: string }) => Promise<void>;
};

/** Объявление дня (или периода дней) нерабочим для всех — только суперадмин. */
export function WorkDayHolidayModal({
  open,
  busy,
  todayIso,
  onClose,
  onSubmit,
}: WorkDayHolidayModalProps) {
  const [title, setTitle] = useState('');
  const [dateFrom, setDateFrom] = useState(todayIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDateFrom(todayIso);
    setDateTo(todayIso);
    setError(null);
  }, [open, todayIso]);

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dateFrom || !dateTo) {
      setError('Укажите даты начала и окончания');
      return;
    }
    if (dateFrom > dateTo) {
      setError('Дата начала не может быть позже даты окончания');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        title: title.trim() || undefined,
        dateFrom,
        dateTo,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось объявить выходные');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Объявить выходные"
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
          День (или период) становится нерабочим для всех сотрудников: прогул за него не
          фиксируется, а выход на работу помечается как «Работа в выходной».
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="work-day-holiday-title">Название</label>
            <input
              id="work-day-holiday-title"
              type="text"
              value={title}
              disabled={busy}
              placeholder="Например: Новый год"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="work-day-holiday-from">Дата начала *</label>
            <input
              id="work-day-holiday-from"
              type="date"
              value={dateFrom}
              disabled={busy}
              required
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="work-day-holiday-to">Дата окончания *</label>
            <input
              id="work-day-holiday-to"
              type="date"
              value={dateTo}
              disabled={busy}
              required
              onChange={(e) => setDateTo(e.target.value)}
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
            disabled={busy || !dateFrom || !dateTo || dateFrom > dateTo}
          >
            {busy ? 'Сохранение…' : 'Объявить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
