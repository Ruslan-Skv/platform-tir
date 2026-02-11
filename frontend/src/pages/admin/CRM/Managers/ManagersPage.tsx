'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { type CrmUser, getCrmUsers } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ManagersPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Суперадмин',
  ADMIN: 'Администратор',
  MODERATOR: 'Модератор',
  SUPPORT: 'Поддержка',
  MANAGER: 'Менеджер',
  TECHNOLOGIST: 'Технолог',
  BRIGADIER: 'Бригадир',
  LEAD_SPECIALIST_FURNITURE: 'Ведущий специалист (мебель)',
  LEAD_SPECIALIST_WINDOWS_DOORS: 'Ведущий специалист (окна/двери)',
  SURVEYOR: 'Замерщик',
  DRIVER: 'Водитель',
  INSTALLER: 'Монтажник',
};

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Все сотрудники CRM' },
  { value: 'MANAGER', label: 'Только менеджеры' },
  { value: 'SURVEYOR', label: 'Только замерщики' },
  { value: 'TECHNOLOGIST', label: 'Только технологи' },
];

function formatName(u: CrmUser) {
  const parts = [u.firstName, u.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : '—';
}

export function ManagersPage() {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const canAddManager = currentUser?.role === 'SUPER_ADMIN';

  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>('MANAGER');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCrmUsers();
      setUsers(data);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Не удалось загрузить список',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = roleFilter === '' ? users : users.filter((u) => u.role === roleFilter);

  const columns = [
    {
      key: 'name',
      title: 'ФИО',
      render: (u: CrmUser) => formatName(u),
    },
    {
      key: 'email',
      title: 'Email',
      render: (u: CrmUser) => u.email ?? '—',
    },
    {
      key: 'role',
      title: 'Роль',
      render: (u: CrmUser) => ROLE_LABELS[u.role] ?? u.role,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Менеджеры</h1>
          <span className={styles.count}>
            {filtered.length} из {users.length}
          </span>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.filterLabel}>
            Показать:
            <select
              className={styles.filterSelect}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {canAddManager && (
            <button
              type="button"
              className={styles.addButton}
              onClick={() => {
                setAddModalOpen(true);
                setAddFormError(null);
              }}
            >
              + Добавить менеджера
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <DataTable
          data={filtered}
          columns={columns}
          keyExtractor={(u) => u.id}
          loading={loading}
          emptyMessage="Нет сотрудников по выбранному фильтру"
        />
      </section>

      {canAddManager && (
        <AddManagerModal
          isOpen={addModalOpen}
          onClose={() => {
            setAddModalOpen(false);
            setAddFormError(null);
          }}
          onSuccess={() => {
            setAddModalOpen(false);
            setAddFormError(null);
            setMessage({ type: 'success', text: 'Менеджер добавлен' });
            setTimeout(() => setMessage(null), 3000);
            loadUsers();
          }}
          getAuthHeaders={getAuthHeaders}
          formError={addFormError}
          setFormError={setAddFormError}
        />
      )}
    </div>
  );
}

interface AddManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => { Authorization?: string } & Record<string, string>;
  formError: string | null;
  setFormError: (v: string | null) => void;
}

function AddManagerModal({
  isOpen,
  onClose,
  onSuccess,
  getAuthHeaders,
  formError,
  setFormError,
}: AddManagerModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setPassword('');
      setFirstName('');
      setLastName('');
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
      const res = await fetch(`${API_URL}/users`, {
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
          role: 'MANAGER',
          isActive: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError((err as { message?: string }).message || 'Ошибка создания пользователя');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить менеджера">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="add-manager-email">Email *</label>
          <input
            id="add-manager-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="manager@example.com"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="add-manager-password">Пароль *</label>
          <input
            id="add-manager-password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не менее 6 символов"
          />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="add-manager-firstName">Имя</label>
            <input
              id="add-manager-firstName"
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="add-manager-lastName">Фамилия</label>
            <input
              id="add-manager-lastName"
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        {formError && <p className={styles.formError}>{formError}</p>}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Создание…' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
