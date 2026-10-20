'use client';

import Link from 'next/link';

import type { DashboardSuppliersPayableResponse } from '@/shared/api/admin-dashboard';

import styles from '../Dashboard.module.css';

const rubFormat = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Расчёты с поставщиками: «Итого к оплате» и поставщики с ненулевым сальдо
 *  (данные те же, что в сводном списке раздела /admin/suppliers).
 *  Список — в две колонки, чтобы 10–15 поставщиков не растягивали блок. */
export function SuppliersPayableWidget({
  data,
  loading,
}: {
  data: DashboardSuppliersPayableResponse | null;
  loading: boolean;
}) {
  return (
    <section className={styles.panel}>
      <div className={`${styles.panelHead} ${styles.panelHeadSales}`}>
        <span className={styles.panelIcon} aria-hidden>
          🚚
        </span>
        <div className={styles.panelHeadText}>
          <h2 className={styles.panelTitle}>Расчёты с поставщиками</h2>
          <p className={styles.panelSubtitle}>
            Сальдо поставщиков с ненулевым долгом или переплатой
          </p>
        </div>
        {data ? (
          <span className={styles.salesTotalWrap}>
            <span className={`${styles.salesTotal} ${styles.suppliersTotalTone}`}>
              {rubFormat.format(data.payableTotal)}
            </span>
          </span>
        ) : null}
        <Link href="/admin/suppliers" className={styles.panelLink}>
          Раздел →
        </Link>
      </div>
      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : !data ? (
        <p className={styles.empty}>Не удалось загрузить расчёты с поставщиками.</p>
      ) : data.suppliers.length === 0 ? (
        <p className={styles.empty}>
          Ненулевых сальдо нет: расчёты со всеми поставщиками закрыты или сведены в ноль.
        </p>
      ) : (
        <div className={styles.suppliersGrid}>
          {data.suppliers.map((row) => (
            <Link
              key={row.id}
              href={`/admin/suppliers/${row.id}`}
              className={styles.supplierRow}
              title={`${row.name} — ${row.balance > 0 ? 'к оплате' : 'переплата'}`}
            >
              <span className={styles.supplierName}>{row.name}</span>
              <span
                className={`${styles.supplierAmount}${
                  row.balance < 0 ? ` ${styles.supplierAmountOverpay}` : ''
                }`}
              >
                {rubFormat.format(row.balance)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
