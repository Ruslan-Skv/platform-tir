'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { ROLES_CONFIG } from '@/pages/admin/Settings/rolesConfig';
import type { BackendRole } from '@/pages/admin/Settings/rolesConfig';
import { getAdminUserCabinetData } from '@/shared/api/admin-user-cabinet';
import type { UserCabinetData } from '@/shared/api/admin-user-cabinet';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './UsersPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: BackendRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<BackendRole, string> = Object.fromEntries(
  ROLES_CONFIG.map((r) => [r.id, r.label])
) as Record<BackendRole, string>;

export function UsersPage() {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const canManageUsers = currentUser?.role === 'SUPER_ADMIN';
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [viewCabinetUser, setViewCabinetUser] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!canManageUsers) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });
      if (!res.ok) throw new Error('Ошибка загрузки пользователей');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, canManageUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (!canManageUsers) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Управление пользователями</h1>
        </div>
        <p className={styles.errorMessage}>
          Создавать, редактировать и удалять пользователей может только роль «Супер-администратор».
          Остальные роли (администратор, контент-менеджер, модератор и др.) видят этот раздел в
          меню, но не имеют доступа к списку и действиям.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !searchQuery ||
      [u.email, u.firstName ?? '', u.lastName ?? ''].some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const columns = [
    {
      key: 'user',
      title: 'Пользователь',
      render: (u: AdminUser) => (
        <div className={styles.userCell}>
          <div className={styles.userAvatar}>
            {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
            {(u.lastName?.[0] ?? '').toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
            </span>
            <span className={styles.userEmail}>{u.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Роль',
      render: (u: AdminUser) => (
        <span className={`${styles.badge} ${styles[`role${u.role}`]}`}>
          {ROLE_LABELS[u.role] ?? u.role}
        </span>
      ),
    },
    {
      key: 'isActive',
      title: 'Статус',
      render: (u: AdminUser) => (
        <span className={`${styles.badge} ${u.isActive ? styles.active : styles.inactive}`}>
          {u.isActive ? 'Активен' : 'Неактивен'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Создан',
      render: (u: AdminUser) =>
        new Date(u.createdAt).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
    },
    {
      key: 'actions',
      title: '',
      render: (u: AdminUser) => (
        <div className={styles.actionsCell}>
          {canManageUsers && (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={(e) => {
                e.stopPropagation();
                setViewCabinetUser(u);
              }}
            >
              Кабинет
            </button>
          )}
          <button
            type="button"
            className={styles.actionBtn}
            onClick={(e) => {
              e.stopPropagation();
              setEditUser(u);
            }}
          >
            Изменить
          </button>
          <button
            type="button"
            className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
            onClick={(e) => {
              e.stopPropagation();
              setDeleteUser(u);
            }}
          >
            Удалить
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Управление пользователями</h1>
          <span className={styles.count}>{filteredUsers.length} пользователей</span>
        </div>
        <button className={styles.addButton} onClick={() => setCreateModalOpen(true)}>
          + Добавить пользователя
        </button>
      </div>
      <p className={styles.pageDescription}>
        В системе восемь ролей: супер-администратор, администратор, контент-менеджер, модератор,
        поддержка, партнёр, пользователь, гость. Создавать и редактировать пользователей может
        только супер-администратор.
      </p>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по имени или email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все роли</option>
          {ROLES_CONFIG.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        data={filteredUsers}
        columns={columns}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyMessage="Нет пользователей"
        selectable
        onSelectionChange={setSelectedIds}
        pagination={{
          page: 1,
          limit: 20,
          total: filteredUsers.length,
          onPageChange: () => {},
        }}
      />

      <CreateUserModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFormError(null);
        }}
        onSuccess={() => {
          setCreateModalOpen(false);
          setFormError(null);
          fetchUsers();
        }}
        getAuthHeaders={getAuthHeaders}
        formError={formError}
        setFormError={setFormError}
      />

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => {
            setEditUser(null);
            setFormError(null);
          }}
          onSuccess={() => {
            setEditUser(null);
            setFormError(null);
            fetchUsers();
          }}
          getAuthHeaders={getAuthHeaders}
          formError={formError}
          setFormError={setFormError}
        />
      )}

      {viewCabinetUser && (
        <ViewCabinetModal user={viewCabinetUser} onClose={() => setViewCabinetUser(null)} />
      )}

      {deleteUser && (
        <ConfirmModal
          isOpen={!!deleteUser}
          onClose={() => setDeleteUser(null)}
          onConfirm={async () => {
            if (!deleteUser) return;
            try {
              const res = await fetch(`${API_URL}/users/${deleteUser.id}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
              });
              if (!res.ok) throw new Error('Ошибка удаления');
              setDeleteUser(null);
              fetchUsers();
            } catch (e) {
              console.error(e);
            }
          }}
          title="Удалить пользователя"
          message={`Вы уверены, что хотите удалить пользователя ${deleteUser.email}?`}
          confirmText="Удалить"
          cancelText="Отмена"
          variant="danger"
        />
      )}
    </div>
  );
}

interface ViewCabinetModalProps {
  user: AdminUser;
  onClose: () => void;
}

function ViewCabinetModal({ user, onClose }: ViewCabinetModalProps) {
  const [data, setData] = useState<UserCabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminUserCabinetData(user.id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatPrice = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Личный кабинет: ${user.email}`} size="xl">
      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : data ? (
        <div className={styles.cabinetModal}>
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Профиль</h3>
            <dl className={styles.cabinetDl}>
              <dt>Email</dt>
              <dd>{data.user.email}</dd>
              <dt>Имя</dt>
              <dd>{data.user.firstName || '—'}</dd>
              <dt>Фамилия</dt>
              <dd>{data.user.lastName || '—'}</dd>
              <dt>Телефон</dt>
              <dd>{data.user.phone || '—'}</dd>
              <dt>Роль</dt>
              <dd>{ROLE_LABELS[data.user.role as BackendRole] ?? data.user.role}</dd>
              <dt>Статус</dt>
              <dd>{data.user.isActive ? 'Активен' : 'Неактивен'}</dd>
            </dl>
          </section>
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Настройки уведомлений</h3>
            <p>
              Уведомлять при ответе в чате поддержки:{' '}
              {data.notificationSettings.notifyOnSupportChatReply ? 'Да' : 'Нет'}
            </p>
          </section>
          {data.notifications && data.notifications.length > 0 && (
            <section className={styles.cabinetSection}>
              <h3 className={styles.cabinetSectionTitle}>
                История уведомлений ({data.notifications.length})
              </h3>
              <p className={styles.cabinetHint}>
                История уведомлений доступна только для просмотра. Редактирование и удаление
                недоступны.
              </p>
              <div className={styles.cabinetNotifications}>
                {data.notifications.map((n) => (
                  <div key={n.id} className={styles.cabinetNotificationCard}>
                    <div className={styles.cabinetNotificationHeader}>
                      <span className={styles.cabinetNotificationTitle}>{n.title}</span>
                      <span className={styles.cabinetNotificationDate}>
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <div className={styles.cabinetNotificationMessage}>{n.message}</div>
                    {n.type && (
                      <span className={styles.cabinetNotificationType}>
                        {n.type === 'support_chat'
                          ? 'Чат поддержки'
                          : n.type === 'order_status'
                            ? 'Статус заказа'
                            : n.type === 'system'
                              ? 'Системное'
                              : n.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Заказы ({data.orders.length})</h3>
            {data.orders.length === 0 ? (
              <p className={styles.empty}>Заказов нет</p>
            ) : (
              <div className={styles.cabinetOrders}>
                {data.orders.map((order) => (
                  <div key={order.id} className={styles.cabinetOrderCard}>
                    <div className={styles.cabinetOrderHeader}>
                      <span className={styles.cabinetOrderNumber}>{order.orderNumber}</span>
                      <span className={styles.cabinetOrderDate}>{formatDate(order.createdAt)}</span>
                      <span className={styles.cabinetOrderStatus}>{order.status}</span>
                    </div>
                    <div className={styles.cabinetOrderTotal}>
                      Итого: {formatPrice(order.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
  formError: string | null;
  setFormError: (v: string | null) => void;
}

function CreateUserModal({
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
    } catch (e) {
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

interface EditUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
  getAuthHeaders: () => { Authorization: string } | Record<string, string>;
  formError: string | null;
  setFormError: (v: string | null) => void;
}

function EditUserModal({
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
      const res = await fetch(`${API_URL}/users/${user.id}`, {
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
    } catch (e) {
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
