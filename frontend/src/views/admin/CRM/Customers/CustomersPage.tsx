'use client';

import { useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { type ContractCustomer, getContractCustomers } from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './CustomersPage.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

export function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ContractCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getContractCustomers(searchQuery || undefined)
      .then(({ customers: list }) => {
        if (!cancelled) setCustomers(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchQuery]);

  const columns = useMemo(
    () => [
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (row: ContractCustomer) => (
          <div className={styles.customerCell}>
            <div className={styles.customerAvatar}>{(row.customerName || '—')[0]}</div>
            <div className={styles.customerInfo}>
              <span className={styles.customerName}>{row.customerName}</span>
              {row.customerPhone && row.customerPhone !== '—' && (
                <span className={styles.customerEmail}>{row.customerPhone}</span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: 'customerPhone',
        title: 'Телефон',
        render: (row: ContractCustomer) => row.customerPhone || '—',
      },
      {
        key: 'customerAddress',
        title: 'Адрес',
        render: (row: ContractCustomer) => row.customerAddress || '—',
      },
      {
        key: 'contractCount',
        title: 'Договоров',
        render: (row: ContractCustomer) => row.contractCount,
      },
      {
        key: 'totalAmount',
        title: 'Сумма',
        render: (row: ContractCustomer) => formatCurrency(row.totalAmount),
      },
      {
        key: 'manager',
        title: 'Менеджер',
        render: (row: ContractCustomer) =>
          row.manager
            ? [row.manager.firstName, row.manager.lastName].filter(Boolean).join(' ') || '—'
            : '—',
      },
    ],
    []
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Клиенты</h1>
          <span className={styles.count}>{customers.length} заказчиков</span>
        </div>
      </div>

      <form className={styles.filters} onSubmit={handleSearchSubmit}>
        <input
          type="search"
          placeholder="Поиск по имени, телефону, адресу..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Найти
        </button>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      <DataTable
        data={customers}
        columns={columns}
        keyExtractor={(row) => `${row.customerName}|${row.customerPhone}`}
        loading={loading}
        emptyMessage="Нет заказчиков из договоров"
        onRowClick={(row) => {
          if (row.lastContractId) {
            router.push(`/admin/crm/contracts/${row.lastContractId}`);
          } else {
            router.push(`/admin/crm/contracts?search=${encodeURIComponent(row.customerName)}`);
          }
        }}
      />
    </div>
  );
}
