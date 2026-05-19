'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ClientDirectoryRow,
  type ClientDirectorySortBy,
  type CrmCustomerEntityType,
  type CrmUser,
  getClientDirectory,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { AddCrmCustomerModal } from './AddCrmCustomerModal';
import { CrmCustomerDetailModal } from './CrmCustomerDetailModal';
import { CrmCustomerTrashModal } from './CrmCustomerTrashModal';
import { CustomerReadonlyPanel } from './CustomerReadonlyPanel';
import styles from './CustomersPage.module.css';
import {
  formatCrmAuditActor,
  formatCrmDateTime,
  formatCrmEntityType,
  formatCrmUserOptionLabel,
  resolveCrmCreatedByActor,
} from './crmCustomerDisplay';
import { formatCrmPhoneOrDash } from './crmCustomerPhone';

const PAGE_SIZE = 25;
const DIRECTORY_SORT_STORAGE_KEY = 'admin_customers_directory_sort';

type DirectorySortOrder = 'asc' | 'desc';

function parseClientDirectorySortBy(value: string): ClientDirectorySortBy {
  if (value === 'createdAt') return 'createdAt';
  if (value === 'lastMeasurementDate') return 'lastMeasurementDate';
  if (value === 'lastContractDate') return 'lastContractDate';
  return 'displayName';
}

function loadDirectorySort(): { sortBy: ClientDirectorySortBy; sortOrder: DirectorySortOrder } {
  if (typeof window === 'undefined') {
    return { sortBy: 'displayName', sortOrder: 'asc' };
  }
  try {
    const raw = localStorage.getItem(DIRECTORY_SORT_STORAGE_KEY);
    if (!raw) return { sortBy: 'displayName', sortOrder: 'asc' };
    const parsed = JSON.parse(raw) as { sortBy?: string; sortOrder?: string };
    const sortBy = parseClientDirectorySortBy(parsed.sortBy ?? 'displayName');
    const sortOrder: DirectorySortOrder = parsed.sortOrder === 'desc' ? 'desc' : 'asc';
    return { sortBy, sortOrder };
  } catch {
    return { sortBy: 'displayName', sortOrder: 'asc' };
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateDdMmYyyy(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  const [y, m, dayPart] = iso.split('-');
  const day = dayPart?.slice(0, 2);
  if (y && m && day) return `${day}.${m}.${y}`;
  return iso;
}

type CustomerTypeFilter = 'all' | CrmCustomerEntityType;

const TYPE_FILTER_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'PERSON', label: 'ФЛ' },
  { value: 'ENTREPRENEUR', label: 'ИП' },
  { value: 'COMPANY', label: 'ЮЛ' },
];

export function CustomersPage() {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>('all');
  const [authorFilter, setAuthorFilter] = useState('');
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);

  const [directoryRows, setDirectoryRows] = useState<ClientDirectoryRow[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryTotal, setDirectoryTotal] = useState(0);

  const [selectedDirectoryRowId, setSelectedDirectoryRowId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const [directorySortBy, setDirectorySortBy] = useState<ClientDirectorySortBy>(
    () => loadDirectorySort().sortBy
  );
  const [directorySortOrder, setDirectorySortOrder] = useState<DirectorySortOrder>(
    () => loadDirectorySort().sortOrder
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        DIRECTORY_SORT_STORAGE_KEY,
        JSON.stringify({ sortBy: directorySortBy, sortOrder: directorySortOrder })
      );
    } catch {
      /* ignore */
    }
  }, [directorySortBy, directorySortOrder]);

  useEffect(() => {
    getCrmUsers()
      .then(setCrmUsers)
      .catch(() => setCrmUsers([]));
  }, []);

  const authorSelectOptions = useMemo(
    () =>
      [...crmUsers].sort((a, b) =>
        formatCrmUserOptionLabel(a).localeCompare(formatCrmUserOptionLabel(b), 'ru')
      ),
    [crmUsers]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 380);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setDirectoryPage(1);
  }, [searchQuery, typeFilter, authorFilter, directorySortBy, directorySortOrder]);

  const handleDirectorySortChange = useCallback((sortBy: string, sortOrder: DirectorySortOrder) => {
    setDirectorySortBy(parseClientDirectorySortBy(sortBy));
    setDirectorySortOrder(sortOrder);
    setDirectoryPage(1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClientDirectory({
      search: searchQuery || undefined,
      page: directoryPage,
      limit: PAGE_SIZE,
      entityType: typeFilter === 'all' ? undefined : typeFilter,
      createdById: authorFilter || undefined,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
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
  }, [
    searchQuery,
    directoryPage,
    listRefreshKey,
    typeFilter,
    authorFilter,
    directorySortBy,
    directorySortOrder,
  ]);

  const selectedDirectoryRow = useMemo(
    () => directoryRows.find((r) => r.id === selectedDirectoryRowId) ?? null,
    [directoryRows, selectedDirectoryRowId]
  );

  useEffect(() => {
    if (!selectedDirectoryRowId) return;
    if (!directoryRows.some((r) => r.id === selectedDirectoryRowId))
      setSelectedDirectoryRowId(null);
  }, [directoryRows, selectedDirectoryRowId]);

  const clearDirectorySelection = useCallback(() => {
    setSelectedDirectoryRowId(null);
  }, []);

  const directoryColumns = useMemo(
    () => [
      {
        key: 'created',
        title: 'Создан',
        sortable: true,
        sortKey: 'createdAt',
        render: (row: ClientDirectoryRow) =>
          row.rowSource === 'customer' ? formatCrmDateTime(row.createdAt) : '—',
      },
      {
        key: 'name',
        title: 'Клиент',
        sortable: true,
        sortKey: 'displayName',
        render: (row: ClientDirectoryRow) => (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>{row.displayName}</span>
            {row.email ? (
              <span className={styles.customerEmail}>{row.email}</span>
            ) : row.phone ? (
              <span className={styles.customerEmail}>{formatCrmPhoneOrDash(row.phone)}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'phone',
        title: 'Телефон',
        render: (row: ClientDirectoryRow) => formatCrmPhoneOrDash(row.phone),
      },
      {
        key: 'lastMeasurement',
        title: 'Посл. замер',
        sortable: true,
        sortKey: 'lastMeasurementDate',
        render: (row: ClientDirectoryRow) =>
          row.lastMeasurementDate ? formatDateDdMmYyyy(row.lastMeasurementDate) : '—',
      },
      {
        key: 'lastContract',
        title: 'Посл. договор',
        sortable: true,
        sortKey: 'lastContractDate',
        render: (row: ClientDirectoryRow) => {
          if (!row.contractCount) return '—';
          const parts: string[] = [];
          if (row.lastContractNumber) parts.push(`№ ${row.lastContractNumber}`);
          if (row.lastContractDate) parts.push(formatDateDdMmYyyy(row.lastContractDate));
          return parts.length > 0 ? parts.join(' · ') : String(row.contractCount);
        },
      },
      {
        key: 'contracts',
        title: 'Договоров',
        render: (row: ClientDirectoryRow) =>
          row.contractCount != null && row.contractCount > 0 ? String(row.contractCount) : '—',
      },
      {
        key: 'sum',
        title: 'Сумма',
        render: (row: ClientDirectoryRow) =>
          row.totalAmount != null && row.totalAmount > 0 ? formatCurrency(row.totalAmount) : '—',
      },
      {
        key: 'type',
        title: 'Тип',
        render: (row: ClientDirectoryRow) => formatCrmEntityType(row.entityType),
      },
      {
        key: 'author',
        title: 'Автор',
        render: (row: ClientDirectoryRow) =>
          row.rowSource === 'customer'
            ? formatCrmAuditActor(resolveCrmCreatedByActor({ createdBy: row.createdBy }))
            : '—',
      },
    ],
    []
  );

  const crmDetailCustomerId =
    selectedDirectoryRow?.rowSource === 'customer' ? selectedDirectoryRow.id : null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказчики и клиенты</h1>
          <span className={styles.count}>{directoryTotal} записей</span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.refreshButton}`}
            onClick={() => setListRefreshKey((k) => k + 1)}
            disabled={loading}
            title="Обновить список заказчиков"
            aria-label="Обновить список заказчиков"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? styles.refreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setAddCustomerOpen(true)}
          >
            + Добавить заказчика
          </button>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.refreshButton}`}
            onClick={() => setTrashOpen(true)}
            title="Корзина клиентов"
            aria-label="Корзина клиентов"
          >
            <TrashIcon width={18} height={18} aria-hidden />
          </button>
        </div>
      </div>

      {/* <p className={styles.tabDescription}>
        Единый справочник: карточки клиентов и заказчики из договоров без отдельной карточки. В
        таблице видно число договоров, суммы и даты последнего договора и замера.
      </p> */}

      <div className={styles.filters}>
        <div className={styles.searchGroup}>
          <input
            type="search"
            placeholder="Поиск: ФИО, телефон, e-mail, компания, адрес…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchInput}
            aria-label="Поиск по справочнику"
          />
        </div>

        <select
          id="customers-author-filter"
          className={styles.authorSelect}
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          aria-label="Автор карточки"
        >
          <option value="">Все авторы</option>
          <option value="_none">Без автора</option>
          {authorSelectOptions.map((u) => (
            <option key={u.id} value={u.id}>
              {formatCrmUserOptionLabel(u)}
            </option>
          ))}
        </select>

        <div className={styles.typeFilterButtons} role="group" aria-label="Тип клиента">
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

      {error && <p className={styles.errorText}>{error}</p>}

      <DataTable
        containerClassName={styles.directoryTable}
        data={directoryRows}
        columns={directoryColumns}
        keyExtractor={(row) => row.id}
        serverSideSort
        controlledSortBy={directorySortBy}
        controlledSortOrder={directorySortOrder}
        onSortChange={handleDirectorySortChange}
        loading={loading}
        emptyMessage={
          !loading && directoryTotal > 0 && directoryRows.length === 0
            ? 'Нет строк на этой странице.'
            : 'Нет записей. Добавьте клиента или измените поиск.'
        }
        highlightedIds={selectedDirectoryRowId ? [selectedDirectoryRowId] : undefined}
        highlightedRowClassName={styles.rowSelected}
        onRowClick={(row) => {
          setSelectedDirectoryRowId((prev) => (prev === row.id ? null : row.id));
        }}
        pagination={{
          page: directoryPage,
          limit: PAGE_SIZE,
          total: directoryTotal,
          onPageChange: setDirectoryPage,
        }}
      />

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
        onUpdated={() => setListRefreshKey((k) => k + 1)}
        onTrashed={() => {
          clearDirectorySelection();
          setListRefreshKey((k) => k + 1);
        }}
      />

      <CrmCustomerTrashModal
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={() => setListRefreshKey((k) => k + 1)}
      />

      <AddCrmCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={() => setListRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
