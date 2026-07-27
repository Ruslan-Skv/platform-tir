'use client';

import { useEffect, useState } from 'react';

import {
  type CrmDirection,
  getCrmDirections,
  getUserCrmDirectionIds,
  setUserCrmDirectionIds,
} from '@/shared/api/admin-crm';
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
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [directionIds, setDirectionIds] = useState<string[]>([]);
  const [directionsLoading, setDirectionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDirectionsLoading(true);
      try {
        const [dirs, ids] = await Promise.all([
          getCrmDirections(),
          getUserCrmDirectionIds(user.id),
        ]);
        if (cancelled) return;
        setDirections(dirs.filter((d) => d.isActive).sort((a, b) => a.sortOrder - b.sortOrder));
        setDirectionIds(ids);
      } catch {
        if (!cancelled) {
          setFormError('Не удалось загрузить направления пользователя');
        }
      } finally {
        if (!cancelled) setDirectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, setFormError]);

  const toggleDirection = (id: string) => {
    setDirectionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
      await setUserCrmDirectionIds(user.id, directionIds);
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Ошибка подключения к серверу');
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
        <div className={styles.formGroup}>
          <label>Направления (можно несколько)</label>
          <p className={styles.directionsHint}>
            Для менеджеров и ведущих специалистов — какие потоки договоров они ведут.
          </p>
          {directionsLoading ? (
            <p className={styles.directionsHint}>Загрузка направлений…</p>
          ) : directions.length === 0 ? (
            <p className={styles.directionsHint}>Справочник направлений пуст.</p>
          ) : (
            <div className={styles.directionsCheckboxGrid}>
              {directions.map((d) => (
                <label key={d.id} className={styles.directionCheckboxItem}>
                  <input
                    type="checkbox"
                    checked={directionIds.includes(d.id)}
                    onChange={() => toggleDirection(d.id)}
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>
          )}
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
          <button
            data-admin-mutation
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || directionsLoading}
          >
            {submitting ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
