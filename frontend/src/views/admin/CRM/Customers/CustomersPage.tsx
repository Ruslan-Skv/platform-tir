'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ClientDirectoryRow,
  type ClientDirectorySortBy,
  type CrmCustomerEntityType,
  type CrmUser,
  getClientDirectory,
  getCrmCustomerTrash,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
  useAdminTrashCount,
} from '@/shared/ui/admin/AdminToolbarIconButton';
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
import {
  CUSTOMERS_PAGE_LIMIT_OPTIONS,
  type CustomerTypeFilter,
  type CustomersPageLimit,
  type DirectorySortOrder,
  loadCustomersDirectoryListState,
  parseClientDirectorySortBy,
  persistCustomersDirectoryListState,
  reloadCustomersDirectoryListStateFromStorage,
} from './customersDirectoryListState';

function customersFilterFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
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

const TYPE_FILTER_OPTIONS: { value: CustomerTypeFilter; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'PERSON', label: 'Физическое лицо (ФЛ)' },
  { value: 'ENTREPRENEUR', label: 'Индивидуальный предприниматель (ИП)' },
  { value: 'COMPANY', label: 'Юридическое лицо (ЮЛ)' },
];

export function CustomersPage() {
  const initialListStateRef = useRef(loadCustomersDirectoryListState());
  const initialListState = initialListStateRef.current;
  const listStateHydratedRef = useRef(false);

  const [searchInput, setSearchInput] = useState(initialListState.search);
  const [searchQuery, setSearchQuery] = useState(initialListState.search);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<CustomerTypeFilter>(initialListState.typeFilter);
  const [authorFilter, setAuthorFilter] = useState(initialListState.authorFilter);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);

  const [directoryRows, setDirectoryRows] = useState<ClientDirectoryRow[]>([]);
  const [directoryPage, setDirectoryPage] = useState(initialListState.page);
  const [directoryPageLimit, setDirectoryPageLimit] = useState<CustomersPageLimit>(
    initialListState.pageLimit
  );
  const [directoryTotal, setDirectoryTotal] = useState(0);

  const [selectedDirectoryRowId, setSelectedDirectoryRowId] = useState<string | null>(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);

  const fetchCustomerTrashTotal = useCallback(() => getCrmCustomerTrash({ page: 1, limit: 1 }), []);
  const { trashCount, refreshTrashCount } = useAdminTrashCount(
    fetchCustomerTrashTotal,
    listRefreshKey
  );

  const [directorySortBy, setDirectorySortBy] = useState<ClientDirectorySortBy>(
    initialListState.sortBy
  );
  const [directorySortOrder, setDirectorySortOrder] = useState<DirectorySortOrder>(
    initialListState.sortOrder
  );

  useEffect(() => {
    const saved = reloadCustomersDirectoryListStateFromStorage();
    setSearchInput(saved.search);
    setSearchQuery(saved.search);
    setTypeFilter(saved.typeFilter);
    setAuthorFilter(saved.authorFilter);
    setDirectorySortBy(saved.sortBy);
    setDirectorySortOrder(saved.sortOrder);
    setDirectoryPage(saved.page);
    setDirectoryPageLimit(saved.pageLimit);
    listStateHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listStateHydratedRef.current) return;
    persistCustomersDirectoryListState({
      search: searchInput,
      typeFilter,
      authorFilter,
      sortBy: directorySortBy,
      sortOrder: directorySortOrder,
      page: directoryPage,
      pageLimit: directoryPageLimit,
    });
  }, [
    searchInput,
    typeFilter,
    authorFilter,
    directorySortBy,
    directorySortOrder,
    directoryPage,
    directoryPageLimit,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(directoryTotal / directoryPageLimit));
    if (directoryPage > totalPages) setDirectoryPage(totalPages);
  }, [directoryTotal, directoryPageLimit, directoryPage]);

  useEffect(() => {
    getCrmUsers()
      .then(setCrmUsers)
      .catch(() => setCrmUsers([]));
  }, []);

  useEffect(() => {
    if (!authorFilter || authorFilter === '_none') return;
    if (!crmUsers.some((u) => u.id === authorFilter)) {
      setAuthorFilter('');
    }
  }, [authorFilter, crmUsers]);

  const authorSelectOptions = useMemo(
    () =>
      [...crmUsers].sort((a, b) =>
        formatCrmUserOptionLabel(a).localeCompare(formatCrmUserOptionLabel(b), 'ru')
      ),
    [crmUsers]
  );

  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = searchInput.trim();
      if (searchQueryRef.current !== next) {
        setDirectoryPage(1);
      }
      setSearchQuery(next);
    }, 380);
    return () => window.clearTimeout(t);
  }, [searchInput]);

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
      limit: directoryPageLimit,
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
    directoryPageLimit,
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
            className={styles.addButton}
            onClick={() => setAddCustomerOpen(true)}
          >
            + Новый заказчик
          </button>
          <AdminListRefreshButton
            onClick={() => setListRefreshKey((k) => k + 1)}
            disabled={loading}
            busy={loading}
            title="Обновить список заказчиков"
            aria-label="Обновить список заказчиков"
          />
          <AdminToolbarTrashButton
            trashCount={trashCount}
            onClick={() => setTrashOpen(true)}
            title="Корзина клиентов"
            aria-label="Корзина клиентов"
          />
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
            className={customersFilterFieldClass(
              styles.searchInput,
              Boolean(searchInput.trim()),
              styles.filterActive
            )}
            aria-label="Поиск по справочнику"
          />
        </div>

        <select
          id="customers-author-filter"
          className={customersFilterFieldClass(
            styles.authorSelect,
            Boolean(authorFilter),
            styles.filterActive
          )}
          value={authorFilter}
          onChange={(e) => {
            setAuthorFilter(e.target.value);
            setDirectoryPage(1);
          }}
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

        <select
          id="customers-type-filter"
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as CustomerTypeFilter);
            setDirectoryPage(1);
          }}
          className={customersFilterFieldClass(
            styles.authorSelect,
            typeFilter !== 'all',
            styles.filterActive
          )}
          aria-label="Тип заказчика"
        >
          {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={directoryPageLimit}
          onChange={(e) => {
            setDirectoryPageLimit(Number(e.target.value) as CustomersPageLimit);
            setDirectoryPage(1);
          }}
          disabled={loading}
          className={styles.pageLimitSelect}
          aria-label="Количество строк на странице"
        >
          {CUSTOMERS_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <DataTable
        containerClassName={styles.directoryTable}
        paginationClassName={styles.directoryPagination}
        paginationActiveClassName={styles.directoryPaginationPageActive}
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
          limit: directoryPageLimit,
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
          void refreshTrashCount();
        }}
      />

      <CrmCustomerTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
        onRestored={() => {
          setListRefreshKey((k) => k + 1);
          void refreshTrashCount();
        }}
      />

      <AddCrmCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={() => setListRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
