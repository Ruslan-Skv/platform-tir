'use client';

import { type FormEvent } from 'react';

import type { MessengerUserRef } from '@/shared/api/messenger/admin-messenger';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../MessengerPage.module.css';
import { formatMessengerUser } from '../shared/messenger.utils';

type Props = {
  open: boolean;
  busy: boolean;
  title: string;
  memberIds: string[];
  users: MessengerUserRef[];
  onTitleChange: (value: string) => void;
  onMemberIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MessengerChannelModal({
  open,
  busy,
  title,
  memberIds,
  users,
  onTitleChange,
  onMemberIdsChange,
  onClose,
  onSubmit,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || busy) return;
    onSubmit();
  };

  const toggleMember = (id: string) => {
    if (memberIds.includes(id)) {
      onMemberIdsChange(memberIds.filter((x) => x !== id));
    } else {
      onMemberIdsChange([...memberIds, id]);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Новый канал"
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
        <p data-modal-form-hint>Создайте групповой канал и добавьте участников.</p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="messenger-channel-title">Название *</label>
            <input
              id="messenger-channel-title"
              type="text"
              value={title}
              disabled={busy}
              required
              autoFocus
              placeholder="Например: Маркетинг"
              onChange={(e) => onTitleChange(e.target.value)}
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
                      checked={memberIds.includes(u.id)}
                      disabled={busy}
                      onChange={() => toggleMember(u.id)}
                    />
                    <span>{formatMessengerUser(u)}</span>
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
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}
