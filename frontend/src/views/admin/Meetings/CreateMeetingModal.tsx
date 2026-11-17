'use client';

import { type FormEvent } from 'react';

import type { AdminUserItem } from '@/shared/api/admin-access';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from './MeetingsPage.module.css';

function formatUser(u: AdminUserItem): string {
  const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return name || u.email;
}

type Props = {
  open: boolean;
  busy: boolean;
  title: string;
  description: string;
  date: string;
  time: string;
  participantIds: string[];
  users: AdminUserItem[];
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onParticipantIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateMeetingModal({
  open,
  busy,
  title,
  description,
  date,
  time,
  participantIds,
  users,
  onTitleChange,
  onDescriptionChange,
  onDateChange,
  onTimeChange,
  onParticipantIdsChange,
  onClose,
  onSubmit,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    onSubmit();
  };

  const toggleUser = (id: string) => {
    if (participantIds.includes(id)) {
      onParticipantIdsChange(participantIds.filter((x) => x !== id));
    } else {
      onParticipantIdsChange([...participantIds, id]);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Новое онлайн-собрание"
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
          Видеоконференция внутри админки (до 8 участников). Участники получат уведомление, собрание
          появится в календаре. Без даты — начнётся сразу после входа.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="meeting-title">Название *</label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              disabled={busy}
              required
              autoFocus
              placeholder="Например: Планёрка понедельник"
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="meeting-date">Дата</label>
            <input
              id="meeting-date"
              type="date"
              value={date}
              disabled={busy}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="meeting-time">Время</label>
            <input
              id="meeting-time"
              type="time"
              value={time}
              disabled={busy}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="meeting-description">Описание</label>
            <textarea
              id="meeting-description"
              rows={3}
              value={description}
              disabled={busy}
              placeholder="Повестка, материалы…"
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
          <div data-modal-form-group data-modal-span>
            <label>Участники</label>
            <div className={styles.memberPickList}>
              {users.length === 0 ? (
                <span data-modal-form-hint>Нет доступных пользователей</span>
              ) : (
                users.map((u) => (
                  <label key={u.id} className={styles.memberPickRow}>
                    <input
                      type="checkbox"
                      checked={participantIds.includes(u.id)}
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
            Создать и пригласить
          </button>
        </div>
      </form>
    </Modal>
  );
}
