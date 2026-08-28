'use client';

import { type FormEvent } from 'react';

import type { AdminUserItem } from '@/shared/api/admin-access';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../CalendarPage.module.css';

function formatUser(u: AdminUserItem): string {
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email;
}

type Props = {
  open: boolean;
  busy: boolean;
  date: string;
  title: string;
  body: string;
  timeFrom: string;
  timeTo: string;
  notifyIds: string[];
  users: AdminUserItem[];
  onDateChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onTimeFromChange: (v: string) => void;
  onTimeToChange: (v: string) => void;
  onNotifyIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CalendarCreateEventModal({
  open,
  busy,
  date,
  title,
  body,
  timeFrom,
  timeTo,
  notifyIds,
  users,
  onDateChange,
  onTitleChange,
  onBodyChange,
  onTimeFromChange,
  onTimeToChange,
  onNotifyIdsChange,
  onClose,
  onSubmit,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    onSubmit();
  };

  const toggleUser = (id: string) => {
    if (notifyIds.includes(id)) {
      onNotifyIdsChange(notifyIds.filter((x) => x !== id));
    } else {
      onNotifyIdsChange([...notifyIds, id]);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Новое событие"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={handleSubmit}
      >
        <p data-modal-form-hint>
          Событие появится в календаре. Выбранные сотрудники получат уведомление в колокольчик.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="calendar-event-title">Название *</label>
            <input
              id="calendar-event-title"
              type="text"
              value={title}
              disabled={busy}
              required
              autoFocus
              placeholder="Например: Совещание по поставкам"
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="calendar-event-date">Дата *</label>
            <input
              id="calendar-event-date"
              type="date"
              value={date}
              disabled={busy}
              required
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="calendar-event-time-from">Время с</label>
            <input
              id="calendar-event-time-from"
              type="time"
              value={timeFrom}
              disabled={busy}
              onChange={(e) => onTimeFromChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="calendar-event-time-to">Время по</label>
            <input
              id="calendar-event-time-to"
              type="time"
              value={timeTo}
              disabled={busy}
              onChange={(e) => onTimeToChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="calendar-event-body">Описание</label>
            <textarea
              id="calendar-event-body"
              rows={3}
              value={body}
              disabled={busy}
              placeholder="Детали, место, ссылка…"
              onChange={(e) => onBodyChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group data-modal-span>
            <label>Уведомить сотрудников</label>
            <div className={styles.memberPickList}>
              {users.length === 0 ? (
                <span data-modal-form-hint>Нет доступных пользователей</span>
              ) : (
                users.map((u) => (
                  <label key={u.id} className={styles.memberPickRow}>
                    <input
                      type="checkbox"
                      checked={notifyIds.includes(u.id)}
                      disabled={busy}
                      onChange={() => toggleUser(u.id)}
                    />
                    <span>{formatUser(u)}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={busy || !title.trim()}>
            Создать и уведомить
          </button>
        </div>
      </form>
    </Modal>
  );
}
