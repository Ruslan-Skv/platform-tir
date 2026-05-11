'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import {
  type ContractCustomer,
  type CrmCustomerEntityType,
  getContractCustomers,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { AddCrmCustomerModal } from './AddCrmCustomerModal';
import { CustomerReadonlyPanel } from './CustomerReadonlyPanel';
import styles from './CustomersPage.module.css';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function customerRowId(row: ContractCustomer): string {
  return row.customerId ?? `${row.customerName}|${row.customerPhone}`;
}

function formatDateDdMmYyyy(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

type CustomerTypeFilter = 'all' | CrmCustomerEntityType;

function matchesTypeFilter(row: ContractCustomer, filter: CustomerTypeFilter): boolean {
  if (filter === 'all') return true;
  const t = row.documentCustomer?.type;
  return t === filter;
}

const TYPE_FILTER_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'PERSON', label: 'ФЛ' },
  { value: 'ENTREPRENEUR', label: 'ИП' },
  { value: 'COMPANY', label: 'ЮЛ' },
];

export function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ContractCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>('all');

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 380);
    return () => window.clearTimeout(t);
  }, [searchInput]);

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
  }, [searchQuery, listRefreshKey]);

  const filteredCustomers = useMemo(
    () => customers.filter((c) => matchesTypeFilter(c, typeFilter)),
    [customers, typeFilter]
  );

  useEffect(() => {
    if (!selectedId) return;
    const exists = customers.some((c) => customerRowId(c) === selectedId);
    if (!exists) setSelectedId(null);
  }, [customers, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const visible = filteredCustomers.some((c) => customerRowId(c) === selectedId);
    if (!visible) setSelectedId(null);
  }, [filteredCustomers, selectedId]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => customerRowId(c) === selectedId) ?? null,
    [customers, selectedId]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const columns = useMemo(
    () => [
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (row: ContractCustomer) => (
          <div className={styles.customerCell}>
            <div className={styles.customerAvatar}>
              {(row.customerName || '—')[0]?.toUpperCase() ?? '—'}
            </div>
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
        key: 'lastContract',
        title: 'Посл. договор',
        render: (row: ContractCustomer) =>
          row.lastContractNumber ? `№ ${row.lastContractNumber}` : '—',
      },
      {
        key: 'lastContractDate',
        title: 'Дата договора',
        render: (row: ContractCustomer) => formatDateDdMmYyyy(row.lastContractDate),
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

  const clearSelection = useCallback(() => setSelectedId(null), []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказчики</h1>
        </div>
        <button type="button" className={styles.addButton} onClick={() => setAddCustomerOpen(true)}>
          Добавить заказчика
        </button>
      </div>

      <form className={styles.filters} onSubmit={handleSearchSubmit}>
        <div className={styles.searchGroup}>
          <input
            type="search"
            placeholder="Поиск: ФИО, телефон, адрес, наименование, ИНН…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Найти
          </button>
        </div>
        <div className={styles.typeFilter}>
          <span className={styles.typeFilterCaption} id="customers-type-filter-label">
            Тип
          </span>
          <div className={styles.typeFilterToolbar}>
            <span
              className={styles.typeFilterCount}
              aria-live="polite"
              aria-atomic="true"
              title={
                loading
                  ? 'Загрузка'
                  : typeFilter === 'all'
                    ? `Позиций в таблице: ${filteredCustomers.length}`
                    : `Показано ${filteredCustomers.length} из ${customers.length}`
              }
            >
              {loading ? (
                <span className={styles.typeFilterCountValue}>…</span>
              ) : (
                <>
                  <span className={styles.typeFilterCountValue}>{filteredCustomers.length}</span>
                  {typeFilter !== 'all' && customers.length > 0 ? (
                    <span className={styles.typeFilterCountTotal}>/{customers.length}</span>
                  ) : null}
                </>
              )}
            </span>
            <div
              className={styles.typeFilterButtons}
              role="group"
              aria-labelledby="customers-type-filter-label"
            >
              {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={
                    typeFilter === value
                      ? `${styles.typeFilterBtn} ${styles.typeFilterBtnActive}`
                      : styles.typeFilterBtn
                  }
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      <DataTable
        data={filteredCustomers}
        columns={columns}
        keyExtractor={customerRowId}
        loading={loading}
        emptyMessage={
          !loading && customers.length > 0 && filteredCustomers.length === 0
            ? 'Нет строк с выбранным типом: тип берётся из сохранённого пакета «Ремонт» по договору. Смените фильтр на «Все» или проверьте документ.'
            : 'Нет заказчиков по договорам. Измените запрос поиска.'
        }
        highlightedIds={selectedId ? [selectedId] : undefined}
        highlightedRowClassName={styles.rowSelected}
        onRowClick={(row) => {
          const id = customerRowId(row);
          setSelectedId((prev) => (prev === id ? null : id));
        }}
      />

      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={clearSelection}
        title="Карточка заказчика"
        size="lg"
        showCloseButton
      >
        {selectedCustomer ? (
          <>
            <CustomerReadonlyPanel
              customer={selectedCustomer}
              formatCurrency={formatCurrency}
              formatDateDdMmYyyy={formatDateDdMmYyyy}
              onNavigateContract={clearSelection}
            />
            <div data-modal-footer-info data-modal-tone="info" role="status">
              <span data-modal-footer-info-icon aria-hidden="true" />
              <span data-modal-footer-info-text>
                Данные из договоров CRM: сумма по карточке — по всем договорам в списке; ссылка
                открывает карточку договора. Блок «Заказчик» — из последней версии пакета «Ремонт»
                по одному из договоров, если пакет сохранён.
              </span>
            </div>
            <div data-modal-actions data-modal-align="center">
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={() => {
                  clearSelection();
                  router.push(
                    `/admin/crm/contracts?search=${encodeURIComponent(selectedCustomer.customerName)}`
                  );
                }}
              >
                Поиск договоров по имени
              </button>
            </div>
          </>
        ) : null}
      </Modal>

      <AddCrmCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={() => setListRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
