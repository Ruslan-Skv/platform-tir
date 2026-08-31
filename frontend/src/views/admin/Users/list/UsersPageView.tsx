'use client';

import { useEffect, useState } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon, EditIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import { ROLES_CONFIG } from '@/views/admin/Settings';

import { CreateUserModal } from '../modals/CreateUserModal';
import { EditUserModal } from '../modals/EditUserModal';
import { ViewCabinetModal } from '../modals/ViewCabinetModal';
import styles from './UsersPage.module.css';
import type { UsersPageModel, UsersStatusFilter } from './hooks/useUsersPage';
import { ROLE_LABELS } from './users-page.constants';
import type { AdminUser } from './users-page.types';

type UsersPageViewProps = {
  model: UsersPageModel;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

const STATUS_OPTIONS: { value: UsersStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'INACTIVE', label: 'Неактивные' },
];

export function UsersPageView({ model }: UsersPageViewProps) {
  const {
    canManageUsers,
    createModalOpen,
    deleteUser,
    deleting,
    editUser,
    fetchUsers,
    filteredUsers,
    formError,
    getAuthHeaders,
    handleConfirmDelete,
    loading,
    message,
    roleFilter,
    searchQuery,
    setCreateModalOpen,
    setDeleteUser,
    setEditUser,
    setFormError,
    setMessage,
    setRoleFilter,
    setSearchQuery,
    setSelectedIds,
    setStatusFilter,
    setViewCabinetUser,
    statusCounts,
    statusFilter,
    users,
    viewCabinetUser,
  } = model;

  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    if (message.type === 'success') {
      setSuccessText(message.text);
      setSuccessVisible(true);
      const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
      setMessage(null);
      return () => window.clearTimeout(timer);
    }
  }, [message, setMessage]);

  const countTitle =
    statusFilter === 'ALL' && !roleFilter && !searchQuery.trim()
      ? `${users.length} пользователей`
      : `${filteredUsers.length} из ${users.length} пользователей`;

  const iconsDisabled = loading || deleting;

  const rowActions = (u: AdminUser) => (
    <div className={styles.actions}>
      {canManageUsers ? (
        <button
          type="button"
          className={styles.cabinetBtn}
          title="Кабинет"
          onClick={(e) => {
            e.stopPropagation();
            setViewCabinetUser(u);
          }}
        >
          Кабинет
        </button>
      ) : null}
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Изменить"
        title="Изменить"
        onClick={(e) => {
          e.stopPropagation();
          setEditUser(u);
        }}
      >
        <EditIcon />
      </AdminTableIconButton>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Удалить"
        title="Удалить"
        onClick={(e) => {
          e.stopPropagation();
          setDeleteUser(u);
        }}
      >
        <DeleteIcon />
      </AdminTableIconButton>
    </div>
  );

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
        <span className={`${styles.badge} ${styles[`role${u.role}`] ?? ''}`}>
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
      title: 'Действия',
      render: (u: AdminUser) => rowActions(u),
    },
  ];

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить список"
        aria-label={loading ? 'Обновление списка пользователей' : 'Обновить список пользователей'}
        onClick={() => void fetchUsers()}
      />
    </div>
  );

  if (!canManageUsers) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
        <div className={cdHub.editorHeader}>
          <div className={cdHub.contractsListHeaderLeft}>
            <h1 className={cdHub.title}>Управление пользователями</h1>
          </div>
        </div>
        <p className={styles.denied}>
          Создавать, редактировать и удалять пользователей может только роль «Супер-администратор».
          Остальные роли видят этот раздел в меню, но не имеют доступа к списку и действиям.
        </p>
      </div>
    );
  }

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Управление пользователями</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{filteredUsers.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={() => setCreateModalOpen(true)}
          >
            + Пользователь
          </button>
          {iconActions('desktop')}
        </div>
      </div>

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={`${cdHub.contractsListFiltersPanel} ${styles.helpPanel}`}>
        <p className={styles.helpText}>
          Создавать и редактировать пользователей может только супер-администратор. Роли задают
          доступ к разделам админки и CRM.
        </p>
      </div>

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
            <span className={cdHub.contractsListChipRowLabel}>Статус</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={chipClass(statusFilter === opt.value)}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label} ({statusCounts[opt.value]})
              </button>
            ))}
          </div>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Поиск и роль">
            <span className={cdHub.contractsListChipRowLabel}>Фильтр</span>
            <input
              type="search"
              className={`${styles.searchInput}${searchQuery.trim() ? ` ${cdHub.contractsListFilterActive}` : ''}`}
              placeholder="Имя или email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Поиск пользователей"
            />
            <select
              className={`${styles.select}${roleFilter ? ` ${cdHub.contractsListFilterActive}` : ''}`}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Роль"
            >
              <option value="">Все роли</option>
              {ROLES_CONFIG.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.mobileCards} aria-label="Список пользователей">
        {loading && filteredUsers.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : filteredUsers.length === 0 ? (
          <p className={styles.mobileEmpty}>Нет пользователей</p>
        ) : (
          filteredUsers.map((u) => (
            <article key={u.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <div className={styles.userAvatar}>
                    {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                    {(u.lastName?.[0] ?? '').toUpperCase()}
                  </div>
                  <div className={styles.userInfo}>
                    <span className={styles.mobileCardName}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                    </span>
                    <span className={styles.mobileCardMeta}>{u.email}</span>
                  </div>
                </div>
                <span className={`${styles.badge} ${u.isActive ? styles.active : styles.inactive}`}>
                  {u.isActive ? 'Активен' : 'Неактивен'}
                </span>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Роль</dt>
                  <dd>{ROLE_LABELS[u.role] ?? u.role}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Создан</dt>
                  <dd>
                    {new Date(u.createdAt).toLocaleDateString('ru-RU', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>{rowActions(u)}</div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
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
          setMessage({ type: 'success', text: 'Пользователь создан.' });
          void fetchUsers();
        }}
        getAuthHeaders={getAuthHeaders}
        formError={formError}
        setFormError={setFormError}
      />

      {editUser ? (
        <EditUserModal
          user={editUser}
          onClose={() => {
            setEditUser(null);
            setFormError(null);
          }}
          onSuccess={() => {
            setEditUser(null);
            setFormError(null);
            setMessage({ type: 'success', text: 'Пользователь сохранён.' });
            void fetchUsers();
          }}
          getAuthHeaders={getAuthHeaders}
          formError={formError}
          setFormError={setFormError}
        />
      ) : null}

      {viewCabinetUser ? (
        <ViewCabinetModal user={viewCabinetUser} onClose={() => setViewCabinetUser(null)} />
      ) : null}

      <ConfirmModal
        isOpen={Boolean(deleteUser)}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => void handleConfirmDelete()}
        title="Удалить пользователя"
        message={`Вы уверены, что хотите удалить пользователя ${deleteUser?.email ?? ''}?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deleting}
      />
    </div>
  );
}
