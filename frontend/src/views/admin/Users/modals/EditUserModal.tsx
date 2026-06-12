'use client';

import { useState } from 'react';

import { apiFetch } from '@/shared/lib/api-fetch';
import { Modal } from '@/shared/ui/Modal';
import { ROLES_CONFIG } from '@/views/admin/Settings';
import type { BackendRole } from '@/views/admin/Settings';

import styles from '../list/UsersPage.module.css';
import { API_URL } from '../list/users-page.constants';
import type { AdminUser } from '../list/users-page.types';

type EditUserModalProps = {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
  formError: string | null;
  setFormError: (v: string | null) => void;
};

export function EditUserModal({
  user,
  onClose,
  onSuccess,
  getAuthHeaders,
  formError,
  setFormError,
}: EditUserModalProps) {
  const [email, setEmail] = useState(user.email);
  const [firstName, setFirstName] = useState(user.firstName ?? '');
  const [lastName, setLastName] = useState(user.lastName ?? '');
  const [role, setRole] = useState<BackendRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const newEmail = email.trim();
    if (!newEmail) {
      setFormError('Введите email');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          email: newEmail,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          role,
          isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.message || 'Ошибка сохранения');
        return;
      }
      onSuccess();
    } catch {
      setFormError('Ошибка подключения к серверу');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Редактировать пользователя" size="md">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="edit-email">Email *</label>
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-firstName">Имя</label>
            <input
              id="edit-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="edit-lastName">Фамилия</label>
            <input
              id="edit-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="edit-role">Роль</label>
          <select
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value as BackendRole)}
          >
            {ROLES_CONFIG.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className={`${styles.formGroup} ${styles.checkboxGroup}`}>
          <input
            id="edit-isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="edit-isActive">Активен</label>
        </div>
        {formError && <p className={styles.errorMessage}>{formError}</p>}
        <div className={styles.formActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
