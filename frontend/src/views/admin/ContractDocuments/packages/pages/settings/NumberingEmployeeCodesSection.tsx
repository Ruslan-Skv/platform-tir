'use client';

import type { CrmUser } from '@/shared/api/admin-crm';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './NumberingSettingsPage.module.css';
import { formatNumberingUserLabel } from './numberingSettingsUtils';

type NumberingEmployeeCodesSectionProps = {
  isSuperAdmin: boolean;
  users: CrmUser[];
  userDrafts: Record<string, string>;
  userSavingId: string | null;
  userFilter: string;
  onFilterChange: (value: string) => void;
  onDraftChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
};

export function NumberingEmployeeCodesSection({
  isSuperAdmin,
  users,
  userDrafts,
  userSavingId,
  userFilter,
  onFilterChange,
  onDraftChange,
  onSave,
}: NumberingEmployeeCodesSectionProps) {
  return (
    <section className={cdTemplates.sectionCard}>
      <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
        Коды сотрудников
      </h3>
      <p className={cdTemplates.hint} style={{ marginTop: 0 }}>
        Один код на человека — и для менеджера, и для замерщика (например, <code>1</code> и{' '}
        <code>3</code> в номере 77/1/3д-5).
      </p>
      <div className={cdEstimateTab.field} style={{ maxWidth: 320, marginBottom: 12 }}>
        <label htmlFor="numbering-user-filter">Поиск</label>
        <input
          id="numbering-user-filter"
          value={userFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder="ФИО, email, код…"
          autoComplete="off"
        />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Роль</th>
              <th>Код</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div>{formatNumberingUserLabel(u)}</div>
                  <div className={styles.muted}>{u.email}</div>
                </td>
                <td>{u.role}</td>
                <td>
                  <input
                    className={styles.input}
                    value={userDrafts[u.id] ?? ''}
                    onChange={(e) => onDraftChange(u.id, e.target.value)}
                    disabled={!isSuperAdmin}
                    placeholder="1"
                    autoComplete="off"
                  />
                </td>
                <td>
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      className={cdWorkspace.secondaryBtn}
                      disabled={userSavingId === u.id}
                      onClick={() => onSave(u.id)}
                    >
                      {userSavingId === u.id ? '…' : 'Сохранить'}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
