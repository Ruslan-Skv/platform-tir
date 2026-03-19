'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type AdminRoleItem,
  type AdminUserItem,
  type ResourcePermissionsResponse,
  getAdminAccessRoles,
  getAdminAccessUsers,
  getResourcePermissions,
  revokeResourcePermission,
  revokeRolePermission,
  setResourcePermission,
  setRolePermission,
} from '@/shared/api/admin-access';
import { ROLES_CONFIG } from '@/views/admin/Settings/rolesConfig';

import styles from './AccessModal.module.css';

interface AccessModalProps {
  resourceId: string;
  label: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  ROLES_CONFIG.filter((r) => r.id !== 'USER' && r.id !== 'GUEST').map((r) => [r.id, r.label])
);

export function AccessModal({ resourceId, label, onClose }: AccessModalProps) {
  const [permissions, setPermissions] = useState<ResourcePermissionsResponse | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState('');
  const [addRoleId, setAddRoleId] = useState('');
  const [addPermission, setAddPermission] = useState<'VIEW' | 'EDIT' | 'DENIED'>('VIEW');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [perms, userList, roleList] = await Promise.all([
        getResourcePermissions(resourceId),
        getAdminAccessUsers(),
        getAdminAccessRoles(),
      ]);
      setPermissions(perms);
      setUsers(userList);
      setRoles(roleList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [resourceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddUser = async () => {
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

  const handleAddRole = async () => {
    if (!addRoleId) return;
    setSaving(true);
    setError(null);
    try {
      const next = await setRolePermission(resourceId, addRoleId, addPermission);
      setPermissions(next);
      setAddRoleId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeUser = async (userId: string) => {
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

  const handleRevokeRole = async (roleId: string) => {
    setSaving(true);
    setError(null);
    try {
      const next = await revokeRolePermission(resourceId, roleId);
      setPermissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    } finally {
      setSaving(false);
    }
  };

  const handleDenyUser = async (userId: string) => {
    setSaving(true);
    setError(null);
    try {
      const next = await setResourcePermission(resourceId, userId, 'DENIED');
      setPermissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось закрыть доступ');
    } finally {
      setSaving(false);
    }
  };

  const handleDenyRole = async (roleId: string) => {
    setSaving(true);
    setError(null);
    try {
      const next = await setRolePermission(resourceId, roleId, 'DENIED');
      setPermissions(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось закрыть доступ');
    } finally {
      setSaving(false);
    }
  };

  const grantedUsers = permissions?.users.filter((p) => p.permission !== 'DENIED') ?? [];
  const deniedUsers = permissions?.users.filter((p) => p.permission === 'DENIED') ?? [];
  const grantedRoles = permissions?.roles.filter((p) => p.permission !== 'DENIED') ?? [];
  const deniedRoles = permissions?.roles.filter((p) => p.permission === 'DENIED') ?? [];
  const assignedUserIds = new Set(permissions?.users.map((p) => p.id) ?? []);
  const assignedRoleIds = new Set(permissions?.roles.map((p) => p.id) ?? []);
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));
  const availableRoles = roles.filter((r) => !assignedRoleIds.has(r.id));

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

            {/* Пользователи */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>По пользователям</h3>
              {grantedUsers.length === 0 && deniedUsers.length === 0 ? (
                <p className={styles.empty}>Нет назначений по пользователям.</p>
              ) : (
                <ul className={styles.list}>
                  {grantedUsers.map((p) => (
                    <li key={`u-${p.id}`} className={styles.listItem}>
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
                        onClick={() => handleDenyUser(p.id)}
                        disabled={saving}
                        title="Закрыть доступ"
                      >
                        Закрыть доступ
                      </button>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleRevokeUser(p.id)}
                        disabled={saving}
                        title="Удалить — вернётся доступ по роли"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                  {deniedUsers.map((p) => (
                    <li key={`u-${p.id}`} className={styles.listItem}>
                      <span className={styles.userName}>
                        {p.firstName || p.lastName
                          ? [p.firstName, p.lastName].filter(Boolean).join(' ')
                          : p.email}
                        {p.firstName || p.lastName ? ` (${p.email})` : ''}
                      </span>
                      <span className={styles.badgeDenied}>Доступ закрыт</span>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleRevokeUser(p.id)}
                        disabled={saving}
                        title="Восстановить доступ по роли"
                      >
                        Восстановить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
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
                  onChange={(e) => setAddPermission(e.target.value as 'VIEW' | 'EDIT' | 'DENIED')}
                  disabled={saving}
                  aria-label="Уровень доступа"
                >
                  <option value="VIEW">Просмотр</option>
                  <option value="EDIT">Редактирование</option>
                  <option value="DENIED">Закрыть доступ</option>
                </select>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={handleAddUser}
                  disabled={!addUserId || saving}
                >
                  {addPermission === 'DENIED' ? 'Запретить' : 'Добавить'}
                </button>
              </div>
            </div>

            {/* Роли */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>
                По ролям (влияет на всех пользователей с этой ролью)
              </h3>
              {grantedRoles.length === 0 && deniedRoles.length === 0 ? (
                <p className={styles.empty}>Нет назначений по ролям.</p>
              ) : (
                <ul className={styles.list}>
                  {grantedRoles.map((p) => (
                    <li key={`r-${p.id}`} className={styles.listItem}>
                      <span className={styles.userName}>{ROLE_LABELS[p.role] || p.role}</span>
                      <span className={styles.badge}>
                        {p.permission === 'EDIT' ? 'Редактирование' : 'Просмотр'}
                      </span>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleDenyRole(p.id)}
                        disabled={saving}
                        title="Закрыть доступ для всех с этой ролью"
                      >
                        Закрыть доступ
                      </button>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleRevokeRole(p.id)}
                        disabled={saving}
                        title="Удалить — вернётся доступ по умолчанию для роли"
                      >
                        Удалить
                      </button>
                    </li>
                  ))}
                  {deniedRoles.map((p) => (
                    <li key={`r-${p.id}`} className={styles.listItem}>
                      <span className={styles.userName}>{ROLE_LABELS[p.role] || p.role}</span>
                      <span className={styles.badgeDenied}>Доступ закрыт</span>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => handleRevokeRole(p.id)}
                        disabled={saving}
                        title="Восстановить доступ по умолчанию"
                      >
                        Восстановить
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.addRow}>
                <select
                  className={styles.select}
                  value={addRoleId}
                  onChange={(e) => setAddRoleId(e.target.value)}
                  disabled={saving}
                  aria-label="Роль"
                >
                  <option value="">Выберите роль</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {ROLE_LABELS[r.id] || r.label}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.selectPermission}
                  value={addPermission}
                  onChange={(e) => setAddPermission(e.target.value as 'VIEW' | 'EDIT' | 'DENIED')}
                  disabled={saving}
                  aria-label="Уровень доступа"
                >
                  <option value="VIEW">Просмотр</option>
                  <option value="EDIT">Редактирование</option>
                  <option value="DENIED">Закрыть доступ</option>
                </select>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={handleAddRole}
                  disabled={!addRoleId || saving}
                >
                  {addPermission === 'DENIED' ? 'Запретить' : 'Добавить'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
