'use client';

import { type FormEvent, useEffect, useState } from 'react';

import type { WorkDayLeaveType, WorkDayUserSchedule } from '@/shared/api/admin-work-days';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

const LEAVE_TYPE_LABELS: Record<WorkDayLeaveType, string> = {
  VACATION: 'Отпуск',
  SICK: 'Больничный',
};

function userDisplayName(user: WorkDayUserSchedule): string {
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ');
  return name || user.email;
}

type WorkDayLeaveModalProps = {
  open: boolean;
  busy: boolean;
  users: WorkDayUserSchedule[];
  todayIso: string;
  onClose: () => void;
  onSubmit: (payload: {
    userId: string;
    type: WorkDayLeaveType;
    dateFrom: string;
    dateTo: string;
    comment?: string;
  }) => Promise<void>;
};

/** Отметка отпуска или больничного за период — в том числе задним числом (только суперадмин). */
export function WorkDayLeaveModal({
  open,
  busy,
  users,
  todayIso,
  onClose,
  onSubmit,
}: WorkDayLeaveModalProps) {
  const [userId, setUserId] = useState('');
  const [type, setType] = useState<WorkDayLeaveType>('VACATION');
  const [dateFrom, setDateFrom] = useState(todayIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUserId(users.length === 1 ? users[0].id : '');
    setType('VACATION');
    setDateFrom(todayIso);
    setDateTo(todayIso);
    setComment('');
    setError(null);
  }, [open, users, todayIso]);

  const handleClose = () => {
    if (busy) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Выберите сотрудника');
      return;
    }
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
        userId,
        type,
        dateFrom,
        dateTo,
        comment: comment.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отметить отпуск/больничный');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Отпуск / больничный"
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
          Дни периода отмечаются в журнале как «Отпуск» или «Больничный» и не считаются прогулом.
          Можно указать прошедшие даты — отметка применяется задним числом.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="work-day-leave-user">Сотрудник *</label>
            <select
              id="work-day-leave-user"
              value={userId}
              disabled={busy}
              required
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">— Выберите —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userDisplayName(u)}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="work-day-leave-type">Тип *</label>
            <select
              id="work-day-leave-type"
              value={type}
              disabled={busy}
              onChange={(e) => setType(e.target.value as WorkDayLeaveType)}
            >
              {(Object.keys(LEAVE_TYPE_LABELS) as WorkDayLeaveType[]).map((t) => (
                <option key={t} value={t}>
                  {LEAVE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="work-day-leave-from">Дата начала *</label>
            <input
              id="work-day-leave-from"
              type="date"
              value={dateFrom}
              disabled={busy}
              required
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="work-day-leave-to">Дата окончания *</label>
            <input
              id="work-day-leave-to"
              type="date"
              value={dateTo}
              disabled={busy}
              required
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div data-modal-form-group data-modal-span>
            <label htmlFor="work-day-leave-comment">Комментарий</label>
            <textarea
              id="work-day-leave-comment"
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
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || !userId || !dateFrom || !dateTo || dateFrom > dateTo}
          >
            {busy ? 'Сохранение…' : 'Отметить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
