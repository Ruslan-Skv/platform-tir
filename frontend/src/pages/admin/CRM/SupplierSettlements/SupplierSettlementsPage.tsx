'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import { getSupplierSettlementTotals } from '@/shared/api/admin-crm';

import styles from './SupplierSettlementsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function formatTotal(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface Supplier {
  id: string;
  legalName: string;
  commercialName?: string | null;
}

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

export function SupplierSettlementsPage() {
  const { getAuthHeaders } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const [suppliersRes, totalsData] = await Promise.all([
        fetch(`${API_URL}/admin/catalog/suppliers?limit=1000`, {
          headers: getAuthHeaders(),
        }),
        getSupplierSettlementTotals(),
      ]);
      if (suppliersRes.ok) {
        const data = await suppliersRes.json();
        setSuppliers(data.data || []);
      }
      const totalsMap: Record<string, number> = {};
      for (const [id, t] of Object.entries(totalsData)) {
        totalsMap[id] = (t as { total: number }).total;
      }
      setTotals(totalsMap);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Refetch when user returns to this tab (e.g. after adding supplier in another tab or in "Поставщики")
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchSuppliers();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchSuppliers]);

  const grandTotal = useMemo(
    () => suppliers.reduce((sum, s) => sum + (totals[s.id] ?? 0), 0),
    [suppliers, totals]
  );

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
