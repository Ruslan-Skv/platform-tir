'use client';

import type { Office } from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './NumberingSettingsPage.module.css';

type NumberingOfficePrefixesSectionProps = {
  isSuperAdmin: boolean;
  offices: Office[];
  officeDrafts: Record<string, string>;
  officeSavingId: string | null;
  loading: boolean;
  onDraftChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
};

function officeSaveButton({
  isSuperAdmin,
  office,
  officeSavingId,
  onSave,
}: {
  isSuperAdmin: boolean;
  office: Office;
  officeSavingId: string | null;
  onSave: (id: string) => void;
}) {
  if (!isSuperAdmin) return <span className={styles.muted}>—</span>;
  return (
    <button
      type="button"
      data-admin-mutation
      className={styles.saveBtn}
      disabled={officeSavingId === office.id}
      onClick={() => onSave(office.id)}
    >
      {officeSavingId === office.id ? '…' : 'Сохранить'}
    </button>
  );
}

export function NumberingOfficePrefixesSection({
  isSuperAdmin,
  offices,
  officeDrafts,
  officeSavingId,
  loading,
  onDraftChange,
  onSave,
}: NumberingOfficePrefixesSectionProps) {
  const columns = [
    {
      key: 'name',
      title: 'Офис',
      render: (o: Office) => o.name,
    },
    {
      key: 'status',
      title: 'Статус',
      render: (o: Office) => (
        <span
          className={`${styles.badge} ${o.isActive ? styles.badgeActive : styles.badgeInactive}`}
        >
          {o.isActive ? 'Активен' : 'Выкл.'}
        </span>
      ),
    },
    {
      key: 'prefix',
      title: 'Префикс',
      render: (o: Office) => (
        <input
          className={styles.input}
          value={officeDrafts[o.id] ?? ''}
          onChange={(e) => onDraftChange(o.id, e.target.value)}
          disabled={!isSuperAdmin}
          placeholder="77"
          autoComplete="off"
          aria-label={`Префикс офиса ${o.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (o: Office) => officeSaveButton({ isSuperAdmin, office: o, officeSavingId, onSave }),
    },
  ];

  return (
    <>
      <p className={styles.sectionHint}>
        Первая часть номера (например, <code className={styles.code}>77</code>). У активных офисов
        префикс лучше задавать всегда.
      </p>

      <div className={styles.mobileCards} aria-label="Префиксы офисов">
        {loading && offices.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : offices.length === 0 ? (
          <p className={styles.mobileEmpty}>Офисы не найдены</p>
        ) : (
          offices.map((o) => (
            <article key={o.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{o.name}</span>
                  <span className={styles.mobileCardMeta}>
                    {o.isActive ? 'Активен' : 'Выключен'}
                  </span>
                </div>
                <span
                  className={`${styles.badge} ${o.isActive ? styles.badgeActive : styles.badgeInactive}`}
                >
                  {o.isActive ? 'Активен' : 'Выкл.'}
                </span>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Префикс</dt>
                  <dd>
                    <input
                      className={styles.input}
                      value={officeDrafts[o.id] ?? ''}
                      onChange={(e) => onDraftChange(o.id, e.target.value)}
                      disabled={!isSuperAdmin}
                      placeholder="77"
                      autoComplete="off"
                    />
                  </dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>
                {officeSaveButton({ isSuperAdmin, office: o, officeSavingId, onSave })}
              </div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={offices}
        columns={columns}
        keyExtractor={(o) => o.id}
        loading={loading}
        emptyMessage="Офисы не найдены"
      />
    </>
  );
}
