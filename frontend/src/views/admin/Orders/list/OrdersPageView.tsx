'use client';

import type { AdminOrderSummary } from '@/shared/api/admin-orders';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { contractsListFilterFieldClass } from '@/views/admin/ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { OrdersListFiltersPanel } from './OrdersListFiltersPanel';
import { OrdersListMobileCards } from './OrdersListMobileCards';
import { OrdersListRulesInfoTip } from './OrdersListRulesInfoTip';
import styles from './OrdersPage.module.css';
import { OrdersTrashModal } from './OrdersTrashModal';
import type { OrdersPageModel } from './hooks/useOrdersPage';
import {
  ORDERS_LIST_KIND_OPTIONS,
  PAYMENT_STATUS_FILTER_OPTIONS,
  PRODUCT_ORDER_STATUS_FILTER_OPTIONS,
  SERVICE_ORDER_STATUS_FILTER_OPTIONS,
  SERVICE_ORDER_STATUS_LABELS,
} from './orders-page.constants';
import type { OrdersPageOrder } from './orders-page.types';
import {
  formatOrderCurrency,
  formatOrderDate,
  getOrderDetailUrl,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  isServiceOrder,
} from './orders-page.utils';

type OrdersPageViewProps = {
  model: OrdersPageModel;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function OrdersPageView({ model }: OrdersPageViewProps) {
  const {
    orders,
    loading,
    total,
    page,
    setPage,
    limit,
    listKind,
    setListKind,
    orderNumberQuery,
    setOrderNumberQuery,
    customerQuery,
    setCustomerQuery,
    managerQuery,
    setManagerQuery,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    listSortBy,
    listSortOrder,
    handleListSortChange,
    selectedIds,
    setSelectedIds,
    refresh,
    kindCounts,
    statusCounts,
    paymentCounts,
    isSuperAdmin,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    requestDeleteOrder,
    handleConfirmDeleteOrder,
    deleteConfirmMessage,
    orderPendingDelete,
    setOrderPendingDelete,
    deletingOrderId,
    error,
  } = model;

  const showProductFilters = listKind !== 'service';
  const statusOptions =
    listKind === 'service'
      ? SERVICE_ORDER_STATUS_FILTER_OPTIONS
      : PRODUCT_ORDER_STATUS_FILTER_OPTIONS;

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      sortable: true,
      render: (order: OrdersPageOrder) => (
        <span className={styles.orderNumber}>
          {order.orderNumber}
          {isServiceOrder(order) && (
            <span className={styles.serviceOrderBadge} title="Заказ услуг">
              {' '}
              (услуги)
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'manager',
      title: 'Менеджер',
      sortable: true,
      render: (order: OrdersPageOrder) => {
        const mgr = isServiceOrder(order)
          ? order.createdByManager
          : (order as AdminOrderSummary).processedByManager;
        return mgr ? (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>
              {mgr.firstName} {mgr.lastName}
            </span>
            <span className={styles.customerEmail}>{mgr.email}</span>
          </div>
        ) : (
          <span className={styles.customerEmail}>—</span>
        );
      },
    },
    {
      key: 'customer',
      title: 'Клиент',
      sortable: true,
      render: (order: OrdersPageOrder) => {
        const productOrder = order as AdminOrderSummary;
        const isManagerCreated = Boolean(productOrder.createdByManagerId);
        const name = isManagerCreated
          ? `${order.customerFirstName ?? ''} ${order.customerLastName ?? ''}`.trim()
          : `${order.customerFirstName ?? productOrder.user?.firstName ?? ''} ${
              order.customerLastName ?? productOrder.user?.lastName ?? ''
            }`.trim();
        const email = isManagerCreated
          ? (order.customerEmail ?? '—')
          : (order.customerEmail ?? productOrder.user?.email ?? '—');
        return (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>{name || '—'}</span>
            <span className={styles.customerEmail}>{email}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Статус',
      sortable: true,
      render: (order: OrdersPageOrder) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
          {isServiceOrder(order)
            ? (SERVICE_ORDER_STATUS_LABELS[order.status] ?? order.status)
            : getOrderStatusLabel(order.status)}
        </span>
      ),
    },
    {
      key: 'payment',
      title: 'Оплата',
      sortable: showProductFilters,
      render: (order: OrdersPageOrder) => {
        if (isServiceOrder(order) || order.status === 'CANCELLED') {
          return <span className={styles.paymentMuted}>—</span>;
        }
        const paymentStatus = (order as AdminOrderSummary).paymentStatus ?? 'PENDING';
        return (
          <span className={`${styles.paymentBadge} ${styles[`payment${paymentStatus}`]}`}>
            {getPaymentStatusLabel(paymentStatus)}
          </span>
        );
      },
    },
    {
      key: 'total',
      title: 'Сумма',
      sortable: true,
      render: (order: OrdersPageOrder) => (
        <div className={styles.totalCell}>
          <span className={styles.totalAmount}>{formatOrderCurrency(Number(order.total))}</span>
          <span className={styles.itemsCount}>{order.itemsCount} позиций</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Дата',
      sortable: true,
      render: (order: OrdersPageOrder) => formatOrderDate(order.createdAt),
    },
    ...(isSuperAdmin
      ? [
          {
            key: 'actions',
            title: '',
            width: '56px',
            render: (order: OrdersPageOrder) => {
              const deleteBusy = deletingOrderId === order.id;
              return (
                <AdminTableIconButton
                  data-admin-mutation
                  disabled={deletingOrderId !== null && !deleteBusy}
                  aria-busy={deleteBusy}
                  aria-label={deleteBusy ? 'Перемещение в корзину…' : 'В корзину'}
                  title="В корзину"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestDeleteOrder(order);
                  }}
                >
                  <DeleteIcon className={deleteBusy ? styles.iconSpinning : undefined} />
                </AdminTableIconButton>
              );
            },
          },
        ]
      : []),
  ];

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={styles.headerTitleRow}>
            <div className={cdHub.contractsListHeaderTitleGroup}>
              <h1 className={`${cdHub.title} ${styles.title}`}>Заказы</h1>
              <OrdersListRulesInfoTip />
            </div>
            <span
              className={`${cdHub.contractsListCount} ${styles.count}`}
              title={`${total} заказов`}
            >
              <span className={styles.countDesktop}>{total} заказов</span>
              <span className={styles.countMobile}>{total}</span>
            </span>
            <div className={styles.headerIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить список заказов"
                aria-label={loading ? 'Обновление списка заказов' : 'Обновить список заказов'}
                onClick={refresh}
              />
              {isSuperAdmin ? (
                <AdminToolbarTrashButton
                  trashCount={trashCount}
                  onClick={() => setTrashOpen(true)}
                  title="Корзина заказов"
                  aria-label="Корзина заказов"
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.headerIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить список заказов"
              aria-label={loading ? 'Обновление списка заказов' : 'Обновить список заказов'}
              onClick={refresh}
            />
            {isSuperAdmin ? (
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина заказов"
                aria-label="Корзина заказов"
              />
            ) : null}
          </div>
        </div>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}

      <div className={styles.filtersStack}>
        <OrdersListFiltersPanel
          listKind={listKind}
          statusFilter={statusFilter}
          paymentFilter={paymentFilter}
          orderNumberQuery={orderNumberQuery}
          customerQuery={customerQuery}
          managerQuery={managerQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
        >
          <div className={cdHub.contractsListFiltersStack}>
            <div className={cdHub.contractsListChipRow} role="group" aria-label="Тип заказов">
              <span className={cdHub.contractsListChipRowLabel}>Тип</span>
              {ORDERS_LIST_KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  className={chipClass(listKind === opt.value)}
                  onClick={() => setListKind(opt.value)}
                >
                  {opt.label} ({kindCounts[opt.value] ?? 0})
                </button>
              ))}
            </div>

            <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус заказа">
              <span className={cdHub.contractsListChipRowLabel}>Статус</span>
              <button
                type="button"
                disabled={loading}
                className={chipClass(!statusFilter)}
                onClick={() => {
                  setStatusFilter('');
                  setPage(1);
                }}
              >
                Все ({statusCounts[''] ?? 0})
              </button>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={loading}
                  className={chipClass(statusFilter === opt.value)}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                  }}
                >
                  {opt.label} ({statusCounts[opt.value] ?? 0})
                </button>
              ))}
            </div>

            {showProductFilters ? (
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус оплаты">
                <span className={cdHub.contractsListChipRowLabel}>Оплата</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(!paymentFilter)}
                  onClick={() => {
                    setPaymentFilter('');
                    setPage(1);
                  }}
                >
                  Все ({paymentCounts[''] ?? 0})
                </button>
                {PAYMENT_STATUS_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={loading}
                    className={chipClass(paymentFilter === opt.value)}
                    onClick={() => {
                      setPaymentFilter(opt.value);
                      setPage(1);
                    }}
                  >
                    {opt.label} ({paymentCounts[opt.value] ?? 0})
                  </button>
                ))}
              </div>
            ) : null}

            <div className={cdHub.contractsListFilters}>
              <input
                type="search"
                placeholder="Номер заказа"
                value={orderNumberQuery}
                onChange={(e) => {
                  setOrderNumberQuery(e.target.value);
                  setPage(1);
                }}
                disabled={loading || listKind === 'service'}
                className={contractsListFilterFieldClass(
                  cdHub.contractsListSearchInput,
                  Boolean(orderNumberQuery.trim()),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Номер заказа"
              />
              <input
                type="search"
                placeholder="Клиент"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value);
                  setPage(1);
                }}
                disabled={loading || listKind === 'service'}
                className={contractsListFilterFieldClass(
                  cdHub.contractsListSearchInput,
                  Boolean(customerQuery.trim()),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Клиент"
              />
              <input
                type="search"
                placeholder="Менеджер"
                value={managerQuery}
                onChange={(e) => {
                  setManagerQuery(e.target.value);
                  setPage(1);
                }}
                disabled={loading || listKind === 'service'}
                className={contractsListFilterFieldClass(
                  cdHub.contractsListSearchInput,
                  Boolean(managerQuery.trim()),
                  cdHub.contractsListFilterActive
                )}
                aria-label="Менеджер"
              />
              <div className={cdHub.contractsListDateFilters}>
                <label className={cdHub.contractsListDateLabel}>
                  <span className={cdHub.contractsListDateLabelText}>Дата от</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    disabled={loading || listKind === 'service'}
                    className={contractsListFilterFieldClass(
                      cdHub.contractsListDateInput,
                      Boolean(dateFrom),
                      cdHub.contractsListFilterActive
                    )}
                    aria-label="Дата от"
                  />
                </label>
                <label className={cdHub.contractsListDateLabel}>
                  <span className={cdHub.contractsListDateLabelText}>Дата до</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    disabled={loading || listKind === 'service'}
                    className={contractsListFilterFieldClass(
                      cdHub.contractsListDateInput,
                      Boolean(dateTo),
                      cdHub.contractsListFilterActive
                    )}
                    aria-label="Дата до"
                  />
                </label>
              </div>
            </div>
          </div>
        </OrdersListFiltersPanel>
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button data-admin-mutation className={styles.bulkButton}>
            Изменить статус
          </button>
          <button className={styles.bulkButton}>Экспорт</button>
        </div>
      )}

      <OrdersListMobileCards
        orders={orders}
        loading={loading}
        isSuperAdmin={isSuperAdmin}
        deletingOrderId={deletingOrderId}
        onDeleteOrder={requestDeleteOrder}
      />

      {loading && orders.length === 0 ? (
        <div className={styles.loading}>Загрузка заказов...</div>
      ) : (
        <DataTable
          containerClassName={styles.ordersTable}
          paginationClassName={styles.ordersPagination}
          data={orders}
          columns={columns}
          keyExtractor={(order) => order.id}
          onRowClick={(order) => {
            window.location.href = getOrderDetailUrl(order);
          }}
          selectable
          onSelectionChange={setSelectedIds}
          serverSideSort
          serverSidePagination
          controlledSortBy={listSortBy}
          controlledSortOrder={listSortOrder}
          onSortChange={handleListSortChange}
          emptyMessage="Нет заказов"
          pagination={{
            page,
            limit,
            total,
            onPageChange: setPage,
          }}
        />
      )}

      <ConfirmModal
        isOpen={orderPendingDelete != null}
        onClose={() => setOrderPendingDelete(null)}
        onConfirm={handleConfirmDeleteOrder}
        title="Переместить в корзину?"
        message={deleteConfirmMessage}
        confirmText="В корзину"
        cancelText="Отмена"
        variant="danger"
      />

      {isSuperAdmin ? (
        <OrdersTrashModal
          isOpen={trashOpen}
          onClose={() => setTrashOpen(false)}
          onRestored={() => {
            refresh();
            void refreshTrashCount();
          }}
        />
      ) : null}
    </div>
  );
}
