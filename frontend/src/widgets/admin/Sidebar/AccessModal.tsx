'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type AdminUserItem,
  type ResourcePermissionItem,
  getAdminAccessUsers,
  getResourcePermissions,
  revokeResourcePermission,
  setResourcePermission,
} from '@/shared/api/admin-access';

import styles from './AccessModal.module.css';

interface AccessModalProps {
  resourceId: string;
  label: string;
  onClose: () => void;
}

export function AccessModal({ resourceId, label, onClose }: AccessModalProps) {
  const [permissions, setPermissions] = useState<ResourcePermissionItem[]>([]);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState('');
  const [addPermission, setAddPermission] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [perms, userList] = await Promise.all([
        getResourcePermissions(resourceId),
        getAdminAccessUsers(),
      ]);
      setPermissions(perms);
      setUsers(userList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (!addUserId) return;
    setSaving(true);
    setError(null);
    try {
      const next = await setResourcePermission(resourceId, addUserId, addPermission);
      setPermissions(next);
      setAddUserId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    setSaving(true);
    setError(null);
    try {
      const next = await revokeResourcePermission(resourceId, userId);
      setPermissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    } finally {
      setSaving(false);
    }
  };

  const assignedUserIds = new Set(permissions.map((p) => p.userId));
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-modal-title"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 id="access-modal-title" className={styles.title}>
            Доступ: {label}
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка…</div>
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Кто имеет доступ</h3>
              {permissions.length === 0 ? (
                <p className={styles.empty}>Никому не выдан доступ к этому разделу.</p>
              ) : (
                <ul className={styles.list}>
                  {permissions.map((p) => (
                    <li key={p.userId} className={styles.listItem}>
                      <span className={styles.userName}>
                        {p.firstName || p.lastName
                          ? [p.firstName, p.lastName].filter(Boolean).join(' ')
                          : p.email}
                        {p.firstName || p.lastName ? ` (${p.email})` : ''}
                      </span>
                      <span className={styles.badge}>
                        {p.permission === 'EDIT' ? 'Редактирование' : 'Просмотр'}
                      </span>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleRevoke(p.userId)}
                        disabled={saving}
                        title="Удалить доступ"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Добавить доступ</h3>
              <div className={styles.addRow}>
                <select
                  className={styles.select}
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  disabled={saving}
                  aria-label="Пользователь"
                >
                  <option value="">Выберите пользователя</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName || u.lastName
                        ? [u.firstName, u.lastName].filter(Boolean).join(' ') + ` (${u.email})`
                        : u.email}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.selectPermission}
                  value={addPermission}
                  onChange={(e) => setAddPermission(e.target.value as 'VIEW' | 'EDIT')}
                  disabled={saving}
                  aria-label="Уровень доступа"
                >
                  <option value="VIEW">Просмотр</option>
                  <option value="EDIT">Редактирование</option>
                </select>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={handleAdd}
                  disabled={!addUserId || saving}
                >
                  Добавить
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
