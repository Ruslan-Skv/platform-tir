'use client';

import Link from 'next/link';

import type { Office } from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './NumberingSettingsPage.module.css';

type NumberingOfficePrefixesSectionProps = {
  offices: Office[];
  loading: boolean;
};

function formatOfficePrefix(prefix: string | null | undefined): string {
  const value = prefix?.trim();
  return value ? value : '—';
}

export function NumberingOfficePrefixesSection({
  offices,
  loading,
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
        <span className={o.prefix?.trim() ? undefined : styles.muted}>
          {formatOfficePrefix(o.prefix)}
        </span>
      ),
    },
  ];

  return (
    <>
      <p className={styles.sectionHint}>
        Первая часть номера (например, <code className={styles.code}>77</code>). Задаётся в
        справочнике{' '}
        <Link href="/admin/crm/offices" className={styles.inlineLink}>
          CRM → Офисы
        </Link>
        .
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
                  <dd className={o.prefix?.trim() ? undefined : styles.muted}>
                    {formatOfficePrefix(o.prefix)}
                  </dd>
                </div>
              </dl>
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
