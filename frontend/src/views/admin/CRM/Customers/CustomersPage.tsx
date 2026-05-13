'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type ClientDirectoryRow,
  type ContractCustomer,
  type CrmCustomerEntityType,
  type Measurement,
  getClientDirectory,
  getContractCustomers,
  getMeasurements,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { AddCrmCustomerModal } from './AddCrmCustomerModal';
import { CrmCustomerDetailModal } from './CrmCustomerDetailModal';
import { CustomerReadonlyPanel } from './CustomerReadonlyPanel';
import styles from './CustomersPage.module.css';

const PAGE_SIZE = 25;

type MainTabId = 'all' | 'contracts' | 'measurements';

const MAIN_TABS: { id: MainTabId; label: string; hint: string }[] = [
  {
    id: 'all',
    label: 'Все',
    hint: 'Все клиенты компании: карточки в базе и заказчики только по договорам (без отдельной карточки).',
  },
  {
    id: 'contracts',
    label: 'По договорам',
    hint: 'Сводка по договорам: суммы и последние договоры.',
  },
  {
    id: 'measurements',
    label: 'Замер без договора',
    hint: 'Замеры без привязанного договора — для проработки после замера.',
  },
];

const MEASUREMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'COMPLETED', label: 'Выполнен' },
  { value: 'NEW', label: 'Принят' },
  { value: 'ASSIGNED', label: 'Назначен' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'CANCELLED', label: 'Отказ' },
  { value: 'CONVERTED', label: 'В договор (без записи?)' },
  { value: '', label: 'Все статусы' },
];

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

function formatDateDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

type CustomerTypeFilter = 'all' | CrmCustomerEntityType;

function matchesContractTypeFilter(row: ContractCustomer, filter: CustomerTypeFilter): boolean {
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

const STATUS_LABELS_MEASUREMENT: Record<string, string> = {
  NEW: 'Принят',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отказ',
  CONVERTED: 'В договор',
};

export function CustomersPage() {
  const [activeTab, setActiveTab] = useState<MainTabId>('all');

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>('all');

  const [directoryRows, setDirectoryRows] = useState<ClientDirectoryRow[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotal, setDirectoryTotal] = useState(0);

  const [contractCustomers, setContractCustomers] = useState<ContractCustomer[]>([]);

  const [measureRows, setMeasureRows] = useState<Measurement[]>([]);
  const [measurePage, setMeasurePage] = useState(1);
  const [measureTotal, setMeasureTotal] = useState(0);
  const [measureTotalPages, setMeasureTotalPages] = useState(0);
  const [measureStatus, setMeasureStatus] = useState('COMPLETED');
  const [measureOnlyLinkedCard, setMeasureOnlyLinkedCard] = useState(true);

  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedDirectoryRowId, setSelectedDirectoryRowId] = useState<string | null>(null);
  const [selectedCrmIdFromMeasurement, setSelectedCrmIdFromMeasurement] = useState<string | null>(
    null
  );
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 380);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setDirectoryPage(1);
    setMeasurePage(1);
  }, [searchQuery, activeTab]);

  useEffect(() => {
    setDirectoryPage(1);
  }, [typeFilter]);

  useEffect(() => {
    setMeasurePage(1);
  }, [measureStatus, measureOnlyLinkedCard]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab !== 'all') return undefined;
    setLoading(true);
    setError(null);
    getClientDirectory({
      search: searchQuery || undefined,
      page: directoryPage,
      limit: PAGE_SIZE,
      entityType: typeFilter === 'all' ? undefined : typeFilter,
    })
      .then((res) => {
        if (cancelled) return;
        setDirectoryRows(res.data ?? []);
        setDirectoryTotal(res.total ?? 0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки справочника');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, searchQuery, directoryPage, listRefreshKey, typeFilter]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab !== 'contracts') return undefined;
    setLoading(true);
    setError(null);
    getContractCustomers(searchQuery || undefined)
      .then(({ customers: list }) => {
        if (!cancelled) setContractCustomers(list);
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
  }, [activeTab, searchQuery, listRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    if (activeTab !== 'measurements') return undefined;
    setLoading(true);
    setError(null);
    getMeasurements({
      withoutContract: true,
      hasCustomerId: measureOnlyLinkedCard ? true : undefined,
      status: measureStatus || undefined,
      search: searchQuery || undefined,
      page: measurePage,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setMeasureRows(res.data ?? []);
        setMeasureTotal(res.total ?? 0);
        setMeasureTotalPages(res.totalPages ?? 0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки замеров');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, searchQuery, measurePage, measureStatus, measureOnlyLinkedCard, listRefreshKey]);

  const filteredContractCustomers = useMemo(
    () => contractCustomers.filter((c) => matchesContractTypeFilter(c, typeFilter)),
    [contractCustomers, typeFilter]
  );

  useEffect(() => {
    if (!selectedContractId) return;
    const exists = contractCustomers.some((c) => customerRowId(c) === selectedContractId);
    if (!exists) setSelectedContractId(null);
  }, [contractCustomers, selectedContractId]);

  useEffect(() => {
    if (!selectedContractId) return;
    const visible = filteredContractCustomers.some((c) => customerRowId(c) === selectedContractId);
    if (!visible) setSelectedContractId(null);
  }, [filteredContractCustomers, selectedContractId]);

  const selectedContractCustomer = useMemo(
    () => contractCustomers.find((c) => customerRowId(c) === selectedContractId) ?? null,
    [contractCustomers, selectedContractId]
  );

  const selectedDirectoryRow = useMemo(
    () => directoryRows.find((r) => r.id === selectedDirectoryRowId) ?? null,
    [directoryRows, selectedDirectoryRowId]
  );

  useEffect(() => {
    if (!selectedDirectoryRowId) return;
    if (!directoryRows.some((r) => r.id === selectedDirectoryRowId))
      setSelectedDirectoryRowId(null);
  }, [directoryRows, selectedDirectoryRowId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const clearContractSelection = useCallback(() => setSelectedContractId(null), []);

  const clearDirectorySelection = useCallback(() => {
    setSelectedDirectoryRowId(null);
    setSelectedCrmIdFromMeasurement(null);
  }, []);

  const contractColumns = useMemo(
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

  const directoryColumns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Клиент',
        render: (row: ClientDirectoryRow) => (
          <div className={styles.customerCell}>
            <div className={styles.customerAvatar}>
              {(row.displayName || '—')[0]?.toUpperCase() ?? '—'}
            </div>
            <div className={styles.customerInfo}>
              <span className={styles.customerName}>{row.displayName}</span>
              {row.email ? (
                <span className={styles.customerEmail}>{row.email}</span>
              ) : row.phone ? (
                <span className={styles.customerEmail}>{row.phone}</span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: 'source',
        title: 'Источник',
        render: (row: ClientDirectoryRow) => row.sourceLabel,
      },
      {
        key: 'phone',
        title: 'Телефон',
        render: (row: ClientDirectoryRow) => row.phone || '—',
      },
      {
        key: 'type',
        title: 'Тип',
        render: (row: ClientDirectoryRow) => row.entityType ?? '—',
      },
      {
        key: 'status',
        title: 'Статус',
        render: (row: ClientDirectoryRow) => row.status ?? '—',
      },
      {
        key: 'contracts',
        title: 'Договоров',
        render: (row: ClientDirectoryRow) =>
          row.contractCount != null ? String(row.contractCount) : '—',
      },
      {
        key: 'sum',
        title: 'Сумма',
        render: (row: ClientDirectoryRow) =>
          row.totalAmount != null ? formatCurrency(row.totalAmount) : '—',
      },
      {
        key: 'lastContract',
        title: 'Посл. договор',
        render: (row: ClientDirectoryRow) => formatDateDdMmYyyy(row.lastContractDate),
      },
      {
        key: 'created',
        title: 'Карточка создана',
        render: (row: ClientDirectoryRow) =>
          row.rowSource === 'customer' ? formatDateDdMmYyyy(row.createdAt) : '—',
      },
    ],
    []
  );

  const measureColumns = useMemo(
    () => [
      {
        key: 'receptionDate',
        title: 'Дата приёма',
        render: (row: Measurement) => formatDateDdMmYyyy(row.receptionDate),
      },
      {
        key: 'customerName',
        title: 'Заказчик (замер)',
        render: (row: Measurement) => row.customerName || '—',
      },
      {
        key: 'customerPhone',
        title: 'Телефон',
        render: (row: Measurement) => row.customerPhone || '—',
      },
      {
        key: 'customerAddress',
        title: 'Адрес',
        render: (row: Measurement) => row.customerAddress || '—',
      },
      {
        key: 'status',
        title: 'Статус',
        render: (row: Measurement) => STATUS_LABELS_MEASUREMENT[row.status] ?? row.status,
      },
      {
        key: 'card',
        title: 'Клиент',
        render: (row: Measurement) =>
          row.customerId ? (
            <button
              type="button"
              className={styles.linkLikeBtn}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDirectoryRowId(null);
                setSelectedCrmIdFromMeasurement(row.customerId);
              }}
            >
              Карточка
            </button>
          ) : (
            '—'
          ),
      },
      {
        key: 'open',
        title: '',
        render: (row: Measurement) => (
          <Link className={styles.tableLink} href={`/admin/measurements/${row.id}`}>
            Замер →
          </Link>
        ),
      },
    ],
    []
  );

  const tableCount =
    activeTab === 'all'
      ? directoryRows.length
      : activeTab === 'contracts'
        ? filteredContractCustomers.length
        : measureRows.length;

  const sourceCount =
    activeTab === 'all'
      ? directoryTotal
      : activeTab === 'contracts'
        ? contractCustomers.length
        : measureTotal;

  const crmDetailCustomerId =
    selectedDirectoryRow?.rowSource === 'customer'
      ? selectedDirectoryRow.id
      : selectedCrmIdFromMeasurement;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказчики и клиенты</h1>
        </div>
        <button type="button" className={styles.addButton} onClick={() => setAddCustomerOpen(true)}>
          Добавить заказчика
        </button>
      </div>

      <div className={styles.mainTabs} role="tablist" aria-label="Раздел учёта клиентов">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={
              activeTab === tab.id ? `${styles.mainTab} ${styles.mainTabActive}` : styles.mainTab
            }
            title={tab.hint}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedContractId(null);
              clearDirectorySelection();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className={styles.tabDescription}>{MAIN_TABS.find((t) => t.id === activeTab)?.hint}</p>

      <form className={styles.filters} onSubmit={handleSearchSubmit}>
        <div className={styles.searchGroup}>
          <input
            type="search"
            placeholder={
              activeTab === 'all'
                ? 'Поиск: ФИО, телефон, e-mail, компания, адрес…'
                : activeTab === 'contracts'
                  ? 'Поиск по договорам: ФИО, телефон, адрес, ИНН…'
                  : 'Поиск по замерам: ФИО, телефон, адрес…'
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>
            Найти
          </button>
        </div>

        {activeTab === 'measurements' ? (
          <div className={styles.measureReportFilters}>
            <label className={styles.measureFilterLabel}>
              <span>Статус замера</span>
              <select
                value={measureStatus}
                onChange={(e) => setMeasureStatus(e.target.value)}
                className={styles.measureFilterSelect}
              >
                {MEASUREMENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.measureCheckboxLabel}>
              <input
                type="checkbox"
                checked={measureOnlyLinkedCard}
                onChange={(e) => setMeasureOnlyLinkedCard(e.target.checked)}
              />
              Только замеры с карточкой клиента
            </label>
          </div>
        ) : null}

        {(activeTab === 'all' || activeTab === 'contracts') && (
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
                      ? `Позиций в таблице: ${tableCount}`
                      : `Показано ${tableCount} из ${sourceCount}`
                }
              >
                {loading ? (
                  <span className={styles.typeFilterCountValue}>…</span>
                ) : (
                  <>
                    <span className={styles.typeFilterCountValue}>{tableCount}</span>
                    {typeFilter !== 'all' && sourceCount > 0 ? (
                      <span className={styles.typeFilterCountTotal}>/{sourceCount}</span>
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
        )}
      </form>

      {error && <p className={styles.errorText}>{error}</p>}

      {activeTab === 'all' && (
        <DataTable
          data={directoryRows}
          columns={directoryColumns}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage={
            !loading && directoryTotal > 0 && directoryRows.length === 0
              ? 'Нет строк на этой странице.'
              : 'Нет записей. Добавьте клиента или измените поиск.'
          }
          highlightedIds={selectedDirectoryRowId ? [selectedDirectoryRowId] : undefined}
          highlightedRowClassName={styles.rowSelected}
          onRowClick={(row) => {
            setSelectedCrmIdFromMeasurement(null);
            setSelectedDirectoryRowId((prev) => (prev === row.id ? null : row.id));
          }}
          pagination={{
            page: directoryPage,
            limit: PAGE_SIZE,
            total: directoryTotal,
            onPageChange: setDirectoryPage,
          }}
        />
      )}

      {activeTab === 'contracts' && (
        <DataTable
          data={filteredContractCustomers}
          columns={contractColumns}
          keyExtractor={customerRowId}
          loading={loading}
          emptyMessage={
            !loading && contractCustomers.length > 0 && filteredContractCustomers.length === 0
              ? 'Нет строк с выбранным типом: тип берётся из сохранённого пакета «Ремонт» по договору. Смените фильтр на «Все» или проверьте документ.'
              : 'Нет заказчиков по договорам. Измените запрос поиска.'
          }
          highlightedIds={selectedContractId ? [selectedContractId] : undefined}
          highlightedRowClassName={styles.rowSelected}
          onRowClick={(row) => {
            const id = customerRowId(row);
            setSelectedContractId((prev) => (prev === id ? null : id));
          }}
        />
      )}

      {activeTab === 'measurements' && (
        <DataTable
          data={measureRows}
          columns={measureColumns}
          keyExtractor={(row) => row.id}
          loading={loading}
          emptyMessage="Нет замеров по выбранным условиям. Измените статус, фильтр по карточке клиента или поиск."
          pagination={{
            page: measurePage,
            limit: PAGE_SIZE,
            total: measureTotal,
            onPageChange: setMeasurePage,
          }}
        />
      )}

      <Modal
        isOpen={Boolean(selectedContractCustomer)}
        onClose={clearContractSelection}
        title="Карточка заказчика (по договорам)"
        size="lg"
        showCloseButton
      >
        {selectedContractCustomer ? (
          <>
            <CustomerReadonlyPanel
              customer={selectedContractCustomer}
              formatCurrency={formatCurrency}
              formatDateDdMmYyyy={formatDateDdMmYyyy}
            />
            <div data-modal-footer-info data-modal-tone="info" role="status">
              <span data-modal-footer-info-icon aria-hidden="true" />
              <span data-modal-footer-info-text>
                Данные из договоров: сумма по строке — по всем договорам в списке. Блок «Заказчик» —
                из последней версии пакета «Ремонт» по одному из договоров, если пакет сохранён.
                Редактирование договоров и пакетов — в разделе «Оформление договоров».
              </span>
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={
          selectedDirectoryRow?.rowSource === 'contract_only' &&
          Boolean(selectedDirectoryRow.contractCustomer)
        }
        onClose={() => setSelectedDirectoryRowId(null)}
        title="Заказчик по договорам (без отдельной карточки)"
        size="lg"
        showCloseButton
      >
        {selectedDirectoryRow?.rowSource === 'contract_only' &&
        selectedDirectoryRow.contractCustomer ? (
          <>
            <CustomerReadonlyPanel
              customer={selectedDirectoryRow.contractCustomer}
              formatCurrency={formatCurrency}
              formatDateDdMmYyyy={formatDateDdMmYyyy}
            />
            <div data-modal-footer-info data-modal-tone="info" role="status">
              <span data-modal-footer-info-icon aria-hidden="true" />
              <span data-modal-footer-info-text>
                Этот заказчик пока не заведён как отдельная карточка: данные только из договоров.
                При оформлении следующего договора можно выбрать существующую карточку клиента,
                чтобы вести учёт в одном месте.
              </span>
            </div>
          </>
        ) : null}
      </Modal>

      <CrmCustomerDetailModal
        customerId={crmDetailCustomerId}
        isOpen={Boolean(crmDetailCustomerId)}
        onClose={clearDirectorySelection}
      />

      <AddCrmCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={() => setListRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
