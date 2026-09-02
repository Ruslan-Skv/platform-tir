'use client';

import type { CrmUser } from '@/shared/api/admin-crm';
import { getRoleLabel } from '@/shared/config/admin-roles';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './NumberingSettingsPage.module.css';
import { formatNumberingUserLabel } from './numberingSettingsUtils';

type NumberingEmployeeCodesSectionProps = {
  isSuperAdmin: boolean;
  users: CrmUser[];
  userDrafts: Record<string, string>;
  userSavingId: string | null;
  loading: boolean;
  onDraftChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
};

function userSaveButton({
  isSuperAdmin,
  user,
  userSavingId,
  onSave,
}: {
  isSuperAdmin: boolean;
  user: CrmUser;
  userSavingId: string | null;
  onSave: (id: string) => void;
}) {
  if (!isSuperAdmin) return <span className={styles.muted}>—</span>;
  return (
    <button
      type="button"
      data-admin-mutation
      className={styles.saveBtn}
      disabled={userSavingId === user.id}
      onClick={() => onSave(user.id)}
    >
      {userSavingId === user.id ? '…' : 'Сохранить'}
    </button>
  );
}

export function NumberingEmployeeCodesSection({
  isSuperAdmin,
  users,
  userDrafts,
  userSavingId,
  loading,
  onDraftChange,
  onSave,
}: NumberingEmployeeCodesSectionProps) {
  const columns = [
    {
      key: 'user',
      title: 'Сотрудник',
      render: (u: CrmUser) => (
        <div>
          <div>{formatNumberingUserLabel(u)}</div>
          <span className={styles.subline}>{u.email}</span>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Роль',
      render: (u: CrmUser) => getRoleLabel(u.role) || u.role,
    },
    {
      key: 'code',
      title: 'Код',
      render: (u: CrmUser) => (
        <input
          className={styles.input}
          value={userDrafts[u.id] ?? ''}
          onChange={(e) => onDraftChange(u.id, e.target.value)}
          disabled={!isSuperAdmin}
          placeholder="напр. 1"
          autoComplete="off"
          aria-label={`Код сотрудника ${formatNumberingUserLabel(u)}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (u: CrmUser) => userSaveButton({ isSuperAdmin, user: u, userSavingId, onSave }),
    },
  ];

  return (
    <>
      <p className={styles.sectionHint}>
        Один код на человека — и для менеджера, и для замерщика (например, <code>1</code> и{' '}
        <code>3</code> в номере 77/1/3д-5).
      </p>

      <div className={styles.mobileCards} aria-label="Коды сотрудников">
        {loading && users.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : users.length === 0 ? (
          <p className={styles.mobileEmpty}>Сотрудники не найдены</p>
        ) : (
          users.map((u) => (
            <article key={u.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{formatNumberingUserLabel(u)}</span>
                  <span className={styles.mobileCardMeta}>
                    {getRoleLabel(u.role) || u.role} · {u.email}
                  </span>
                </div>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Код</dt>
                  <dd>
                    <input
                      className={styles.input}
                      value={userDrafts[u.id] ?? ''}
                      onChange={(e) => onDraftChange(u.id, e.target.value)}
                      disabled={!isSuperAdmin}
                      placeholder="напр. 1"
                      autoComplete="off"
                    />
                  </dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>
                {userSaveButton({ isSuperAdmin, user: u, userSavingId, onSave })}
              </div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={users}
        columns={columns}
        keyExtractor={(u) => u.id}
        loading={loading}
        emptyMessage="Сотрудники не найдены"
      />
    </>
  );
}
