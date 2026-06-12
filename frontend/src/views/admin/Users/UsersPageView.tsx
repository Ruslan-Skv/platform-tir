'use client';

import { useMemo } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { ROLES_CONFIG } from '@/views/admin/Settings/rolesConfig';

import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import styles from './UsersPage.module.css';
import { ViewCabinetModal } from './ViewCabinetModal';
import type { UsersPageModel } from './hooks/useUsersPage';
import { ROLE_LABELS } from './users-page.constants';
import type { AdminUser } from './users-page.types';

type UsersPageViewProps = {
  model: UsersPageModel;
};

export function UsersPageView({ model }: UsersPageViewProps) {
  const {
    canManageUsers,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    setSelectedIds,
    createModalOpen,
    setCreateModalOpen,
    editUser,
    setEditUser,
    deleteUser,
    setDeleteUser,
    viewCabinetUser,
    setViewCabinetUser,
    formError,
    setFormError,
    fetchUsers,
    filteredUsers,
    getAuthHeaders,
    handleConfirmDelete,
  } = model;

  const columns = useMemo(
    () => [
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
    ],
    [canManageUsers, setEditUser, setDeleteUser, setViewCabinetUser]
  );

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
          onConfirm={handleConfirmDelete}
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
