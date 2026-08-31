'use client';

import type { CrmDirection } from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './NumberingSettingsPage.module.css';

type NumberingDirectionsSectionProps = {
  isSuperAdmin: boolean;
  directions: CrmDirection[];
  directionDrafts: Record<string, string>;
  directionSavingId: string | null;
  loading: boolean;
  onDraftChange: (id: string, value: string) => void;
  onSave: (id: string) => void;
};

function directionSaveButton({
  isSuperAdmin,
  direction,
  directionSavingId,
  onSave,
}: {
  isSuperAdmin: boolean;
  direction: CrmDirection;
  directionSavingId: string | null;
  onSave: (id: string) => void;
}) {
  if (!isSuperAdmin) return <span className={styles.muted}>—</span>;
  return (
    <button
      type="button"
      data-admin-mutation
      className={styles.saveBtn}
      disabled={directionSavingId === direction.id}
      onClick={() => onSave(direction.id)}
    >
      {directionSavingId === direction.id ? '…' : 'Сохранить'}
    </button>
  );
}

export function NumberingDirectionsSection({
  isSuperAdmin,
  directions,
  directionDrafts,
  directionSavingId,
  loading,
  onDraftChange,
  onSave,
}: NumberingDirectionsSectionProps) {
  const columns = [
    {
      key: 'name',
      title: 'Направление',
      render: (d: CrmDirection) => d.name,
    },
    {
      key: 'letter',
      title: 'Буква',
      render: (d: CrmDirection) => (
        <input
          className={styles.input}
          value={directionDrafts[d.id] ?? ''}
          onChange={(e) => onDraftChange(d.id, e.target.value)}
          disabled={!isSuperAdmin}
          placeholder="д"
          autoComplete="off"
          aria-label={`Буква направления ${d.name}`}
        />
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (d: CrmDirection) =>
        directionSaveButton({ isSuperAdmin, direction: d, directionSavingId, onSave }),
    },
  ];

  return (
    <>
      <p className={styles.sectionHint}>
        Формат: 77/1/3<strong>д</strong>-5 — буква направления (д = Двери, о = Окна, …).
      </p>

      <div className={styles.mobileCards} aria-label="Буквы направлений">
        {loading && directions.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : directions.length === 0 ? (
          <p className={styles.mobileEmpty}>Направления не найдены</p>
        ) : (
          directions.map((d) => (
            <article key={d.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{d.name}</span>
                </div>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Буква</dt>
                  <dd>
                    <input
                      className={styles.input}
                      value={directionDrafts[d.id] ?? ''}
                      onChange={(e) => onDraftChange(d.id, e.target.value)}
                      disabled={!isSuperAdmin}
                      placeholder="д"
                      autoComplete="off"
                    />
                  </dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>
                {directionSaveButton({ isSuperAdmin, direction: d, directionSavingId, onSave })}
              </div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={directions}
        columns={columns}
        keyExtractor={(d) => d.id}
        loading={loading}
        emptyMessage="Направления не найдены"
      />
    </>
  );
}
