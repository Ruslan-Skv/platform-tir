'use client';

import Link from 'next/link';

import styles from './SupplierSettlementsPage.module.css';
import type { SupplierSettlementsPageModel } from './hooks/useSupplierSettlementsPage';
import type { Supplier } from './supplier-settlements-page.types';
import { formatTotal } from './supplier-settlements-page.utils';

type SupplierSettlementsPageViewProps = {
  model: SupplierSettlementsPageModel;
};

function SupplierCardItem({ supplier, total = 0 }: { supplier: Supplier; total?: number }) {
  const value = total ?? 0;
  const cardVariant =
    value === 0 ? styles.cardZero : value > 0 ? styles.cardPositive : styles.cardNegative;

  return (
    <Link
      href={`/admin/crm/supplier-settlements/${supplier.id}`}
      className={`${styles.card} ${cardVariant}`}
    >
      <div className={styles.cardValue}>{supplier.legalName}</div>
      <div className={styles.cardValueSecondary}>{supplier.commercialName || '—'}</div>
      <div className={styles.cardTotal}>К оплате: {formatTotal(value)}</div>
    </Link>
  );
}

export function SupplierSettlementsPageView({ model }: SupplierSettlementsPageViewProps) {
  const { suppliers, totals, loading, grandTotal } = model;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Расчёты с поставщиками</h1>
        <Link href="/admin/catalog/suppliers" className={styles.linkToSuppliers}>
          Управление поставщиками →
        </Link>
      </div>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка...</p>
        </div>
      ) : suppliers.length === 0 ? (
        <div className={styles.empty}>
          <p>Поставщики не найдены. Добавьте поставщиков в разделе «Поставщики».</p>
          <Link href="/admin/catalog/suppliers/new" className={styles.addLink}>
            Добавить поставщика
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.grandTotal}>Итого к оплате: {formatTotal(grandTotal)}</div>
          <div className={styles.grid}>
            {suppliers.map((supplier) => (
              <SupplierCardItem key={supplier.id} supplier={supplier} total={totals[supplier.id]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
