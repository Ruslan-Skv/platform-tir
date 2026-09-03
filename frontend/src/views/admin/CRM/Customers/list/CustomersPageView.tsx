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
import type { CustomersPageLimit } from '../shared/customersDirectoryListState';
import { CustomersListFiltersPanel } from './CustomersListFiltersPanel';
import { CustomersListRulesInfoTip } from './CustomersListRulesInfoTip';
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

function chipClass(active: boolean): string {
  return `${styles.chip}${active ? ` ${styles.chipActive}` : ''}`;
}

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
    listScope,
    setListScope,
    scopeCounts,
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

  const showAuthorFilter = listScope !== 'mine';

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
          <div className={styles.headerTitleRow}>
            <div className={styles.headerTitleCluster}>
              <div className={styles.headerTitleGroup}>
                <h1 className={styles.title}>Заказчики и клиенты</h1>
                <CustomersListRulesInfoTip />
              </div>
              <span className={styles.count} title={`${directoryTotal} записей`}>
                <span className={styles.countDesktop}>{directoryTotal} записей</span>
                <span className={styles.countMobile}>{directoryTotal}</span>
              </span>
            </div>
            <div className={styles.headerIconActionsMobile}>
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
        </div>
        <div className={styles.headerActions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.addButton}
            onClick={() => setAddCustomerOpen(true)}
          >
            + Новый заказчик
          </button>
          <div className={styles.headerIconActionsDesktop}>
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
      </div>

      <div className={styles.filtersStack}>
        <CustomersListFiltersPanel
          listScope={listScope}
          typeFilter={typeFilter}
          search={searchInput}
          authorFilter={authorFilter}
          authorOptions={authorSelectOptions}
          limit={directoryPageLimit}
        >
          <div className={styles.chipRow} role="group" aria-label="Область списка заказчиков">
            <span className={styles.chipRowLabel}>Очередь</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(listScope === 'mine')}
              onClick={() => setListScope('mine')}
            >
              Мои ({scopeCounts.mine ?? 0})
            </button>
            <button
              type="button"
              disabled={loading}
              className={chipClass(listScope === 'all')}
              onClick={() => setListScope('all')}
            >
              Все ({scopeCounts.all ?? 0})
            </button>
          </div>

          <div className={styles.chipRow} role="group" aria-label="Тип заказчика">
            <span className={styles.chipRowLabel}>Тип</span>
            {TYPE_FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                disabled={loading}
                className={chipClass(typeFilter === value)}
                onClick={() => setTypeFilter(value)}
              >
                {label}
              </button>
            ))}
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

            {showAuthorFilter ? (
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
            ) : null}

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
        </CustomersListFiltersPanel>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.mobileCards} aria-label="Список заказчиков">
        {loading && directoryRows.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : directoryRows.length === 0 ? (
          <p className={styles.mobileEmpty}>
            {!loading && directoryTotal > 0
              ? 'Нет строк на этой странице.'
              : 'Нет записей. Добавьте клиента или измените поиск.'}
          </p>
        ) : (
          directoryRows.map((row) => {
            const phone = formatCrmPhoneOrDash(row.phone);
            const contractParts: string[] = [];
            if (row.lastContractNumber) contractParts.push(`№ ${row.lastContractNumber}`);
            if (row.lastContractDate) contractParts.push(formatDateDdMmYyyy(row.lastContractDate));
            const contractLabel =
              contractParts.length > 0
                ? contractParts.join(' · ')
                : row.contractCount
                  ? String(row.contractCount)
                  : '—';
            const authorLabel =
              row.rowSource === 'customer'
                ? formatCrmAuditActor(resolveCrmCreatedByActor({ createdBy: row.createdBy }))
                : '—';
            const selected = selectedDirectoryRowId === row.id;
            return (
              <button
                key={row.id}
                type="button"
                className={`${styles.mobileCard}${selected ? ` ${styles.mobileCardSelected}` : ''}`}
                onClick={() => {
                  setSelectedDirectoryRowId((prev) => (prev === row.id ? null : row.id));
                }}
              >
                <div className={styles.mobileCardTop}>
                  <div>
                    <div className={styles.mobileCardName}>{row.displayName}</div>
                    {phone !== '—' ? <div className={styles.mobileCardMeta}>{phone}</div> : null}
                    {row.email ? <div className={styles.mobileCardMeta}>{row.email}</div> : null}
                  </div>
                  <span className={styles.mobileCardType}>
                    {formatCrmEntityType(row.entityType)}
                  </span>
                </div>
                <dl className={styles.mobileCardRows}>
                  <div className={styles.mobileCardRow}>
                    <dt>Создан</dt>
                    <dd>{row.rowSource === 'customer' ? formatCrmDateTime(row.createdAt) : '—'}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Посл. замер</dt>
                    <dd>
                      {row.lastMeasurementDate ? formatDateDdMmYyyy(row.lastMeasurementDate) : '—'}
                    </dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Договор</dt>
                    <dd>{contractLabel}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Сумма</dt>
                    <dd>
                      {row.totalAmount != null && row.totalAmount > 0
                        ? formatCurrency(row.totalAmount)
                        : '—'}
                    </dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Автор</dt>
                    <dd>{authorLabel}</dd>
                  </div>
                </dl>
              </button>
            );
          })
        )}
      </div>

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
        compactOnMobile
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
