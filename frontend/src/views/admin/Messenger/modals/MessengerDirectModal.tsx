'use client';

import { type FormEvent } from 'react';

import type { MessengerUserRef } from '@/shared/api/messenger/admin-messenger';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { formatMessengerUser } from '../shared/messenger.utils';

type Props = {
  open: boolean;
  busy: boolean;
  userId: string;
  users: MessengerUserRef[];
  onUserIdChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function MessengerDirectModal({
  open,
  busy,
  userId,
  users,
  onUserIdChange,
  onClose,
  onSubmit,
}: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!userId || busy) return;
    onSubmit();
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title="Новый личный чат"
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
        <p data-modal-form-hint>Выберите сотрудника для личной переписки.</p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="messenger-dm-user">Сотрудник *</label>
            <select
              id="messenger-dm-user"
              value={userId}
              disabled={busy}
              required
              onChange={(e) => onUserIdChange(e.target.value)}
            >
              <option value="">Выберите…</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {formatMessengerUser(u)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={busy || !userId}>
            Открыть
          </button>
        </div>
      </form>
    </Modal>
  );
}
