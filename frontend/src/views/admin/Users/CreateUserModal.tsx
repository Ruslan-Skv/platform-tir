'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/shared/lib/api-fetch';
import { Modal } from '@/shared/ui/Modal';
import { ROLES_CONFIG } from '@/views/admin/Settings/rolesConfig';
import type { BackendRole } from '@/views/admin/Settings/rolesConfig';

import styles from './UsersPage.module.css';
import { API_URL } from './users-page.constants';

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
  formError: string | null;
  setFormError: (v: string | null) => void;
};

export function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  getAuthHeaders,
  formError,
  setFormError,
}: CreateUserModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<BackendRole>('USER');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setRole('USER');
      setIsActive(true);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError('Введите email');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Пароль не менее 6 символов');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          role,
          isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.message || 'Ошибка создания пользователя');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить пользователя" size="md">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="create-email">Email *</label>
          <input
            id="create-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="create-password">Пароль *</label>
          <input
            id="create-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не менее 6 символов"
          />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="create-firstName">Имя</label>
            <input
              id="create-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="create-lastName">Фамилия</label>
            <input
              id="create-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="create-role">Роль</label>
          <select
            id="create-role"
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
            id="create-isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <label htmlFor="create-isActive">Активен</label>
        </div>
        {formError && <p className={styles.errorMessage}>{formError}</p>}
        <div className={styles.formActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
