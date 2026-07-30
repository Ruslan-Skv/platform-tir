'use client';

import type { Office } from '@/shared/api/admin-crm';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './NumberingSettingsPage.module.css';

type NumberingOfficePrefixesSectionProps = {
  isSuperAdmin: boolean;
  offices: Office[];
  officeDrafts: Record<string, string>;
  officeSavingId: string | null;
  onDraftChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
};

export function NumberingOfficePrefixesSection({
  isSuperAdmin,
  offices,
  officeDrafts,
  officeSavingId,
  onDraftChange,
  onSave,
}: NumberingOfficePrefixesSectionProps) {
  return (
    <section className={cdTemplates.sectionCard}>
      <h3 className={cdTemplates.sectionTitle} style={{ marginTop: 0 }}>
        Префиксы офисов
      </h3>
      <p className={cdTemplates.hint} style={{ marginTop: 0 }}>
        Первая часть номера (например, <code>77</code>). У активных офисов префикс лучше задавать
        всегда.
      </p>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Офис</th>
              <th>Статус</th>
              <th>Префикс</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {offices.map((o) => (
              <tr key={o.id}>
                <td>{o.name}</td>
                <td>{o.isActive ? 'Активен' : 'Выкл.'}</td>
                <td>
                  <input
                    className={styles.input}
                    value={officeDrafts[o.id] ?? ''}
                    onChange={(e) => onDraftChange(o.id, e.target.value)}
                    disabled={!isSuperAdmin}
                    placeholder="77"
                    autoComplete="off"
                  />
                </td>
                <td>
                  {isSuperAdmin ? (
                    <button
                      type="button"
                      className={cdWorkspace.secondaryBtn}
                      disabled={officeSavingId === o.id}
                      onClick={() => onSave(o.id)}
                    >
                      {officeSavingId === o.id ? '…' : 'Сохранить'}
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
