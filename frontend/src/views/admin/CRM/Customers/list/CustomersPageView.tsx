'use client';

import { useMemo } from 'react';

import type { ClientDirectoryRow } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { AddCrmCustomerModal } from '../modals/AddCrmCustomerModal';
import { CrmCustomerDetailModal } from '../modals/CrmCustomerDetailModal';
import { CrmCustomerTrashModal } from '../modals/CrmCustomerTrashModal';
import { CustomerReadonlyPanel } from '../shared/CustomerReadonlyPanel';
import {
  formatCrmAuditActor,
  formatCrmDateTime,
  formatCrmEntityType,
  formatCrmUserOptionLabel,
  resolveCrmCreatedByActor,
} from '../shared/crmCustomerDisplay';
import { formatCrmPhoneOrDash } from '../shared/crmCustomerPhone';
import type { CustomerTypeFilter, CustomersPageLimit } from '../shared/customersDirectoryListState';
import styles from './CustomersPage.module.css';
import { TYPE_FILTER_OPTIONS } from './customers-page.constants';
import {
  customersFilterFieldClass,
  formatCurrency,
  formatDateDdMmYyyy,
} from './customers-page.utils';
import type { CustomersPageModel } from './hooks/useCustomersPage';

type CustomersPageViewProps = {
  model: CustomersPageModel;
};

export function CustomersPageView({ model }: CustomersPageViewProps) {
  const {
    searchInput,
    setSearchInput,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    authorFilter,
    setAuthorFilter,
    directoryRows,
    directoryPage,
    setDirectoryPage,
    directoryPageLimit,
    setDirectoryPageLimit,
    directoryTotal,
    selectedDirectoryRowId,
    setSelectedDirectoryRowId,
    addCustomerOpen,
    setAddCustomerOpen,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    directorySortBy,
    directorySortOrder,
    authorSelectOptions,
    handleDirectorySortChange,
    selectedDirectoryRow,
    clearDirectorySelection,
    crmDetailCustomerId,
    bumpListRefresh,
    pageLimitOptions,
  } = model;

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
            onClick={bumpListRefresh}
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
          {pageLimitOptions.map((n) => (
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
        onUpdated={bumpListRefresh}
        onTrashed={() => {
          clearDirectorySelection();
          bumpListRefresh();
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
          bumpListRefresh();
          void refreshTrashCount();
        }}
      />

      <AddCrmCustomerModal
        isOpen={addCustomerOpen}
        onClose={() => setAddCustomerOpen(false)}
        onCreated={bumpListRefresh}
      />
    </div>
  );
}
