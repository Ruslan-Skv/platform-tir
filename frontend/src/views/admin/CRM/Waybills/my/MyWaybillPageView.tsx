'use client';

import type { WaybillTask } from '@/shared/api/admin-waybills';
import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/Waybills.module.css';
import type { WaybillStatusFilter } from '../shared/waybills-page.types';
import {
  STATUS_LABELS,
  formatMoney,
  formatTimeRange,
  formatUserLabel,
  formatWaybillDateDisplay,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import { MyWaybillDriverActions } from './MyWaybillDriverActions';
import { MyWaybillMobileCards } from './MyWaybillMobileCards';
import type { MyWaybillPageModel } from './hooks/useMyWaybillPage';

type MyWaybillPageViewProps = {
  model: MyWaybillPageModel;
};

function statusChipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function MyWaybillPageView({ model }: MyWaybillPageViewProps) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtered,
    tasks,
    loading,
    statusFilter,
    setStatusFilter,
    message,
    failItem,
    setFailItem,
    failNote,
    setFailNote,
    completeItem,
    setCompleteItem,
    completeNote,
    setCompleteNote,
    submitting,
    openCompleteModal,
    handleCompleteConfirm,
    handleFailConfirm,
    refresh,
  } = model;

  const statusCounts = {
    ALL: tasks.length,
    PLANNED: tasks.filter((t) => t.status === 'PLANNED').length,
    DONE: tasks.filter((t) => t.status === 'DONE').length,
    FAILED: tasks.filter((t) => t.status === 'FAILED').length,
  };

  const countTitle =
    statusFilter === 'ALL'
      ? `${tasks.length} заданий`
      : `${filtered.length} из ${tasks.length} заданий`;

  const statusOptions: { value: WaybillStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Все' },
    { value: 'PLANNED', label: 'В плане' },
    { value: 'DONE', label: 'Выполнено' },
    { value: 'FAILED', label: 'Не выполнено' },
  ];

  const iconsDisabled = loading || submitting;

  const columns = [
    {
      key: 'date',
      title: 'Дата',
      render: (item: WaybillTask) => formatWaybillDateDisplay(item.date),
    },
    {
      key: 'time',
      title: 'Время',
      render: (item: WaybillTask) => formatTimeRange(item.timeFrom, item.timeTo),
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (item: WaybillTask) => item.direction || '—',
    },
    {
      key: 'task',
      title: 'Задание',
      render: (item: WaybillTask) => <div className={styles.taskCell}>{item.taskText}</div>,
    },
    {
      key: 'customer',
      title: 'Заказчик',
      render: (item: WaybillTask) => {
        const customer = resolveWaybillCustomerFields(item);
        if (
          !customer.customerName &&
          !customer.customerAddress &&
          customer.customerPhones.length === 0
        ) {
          return '—';
        }
        const mapsUrl = customer.customerAddress
          ? `https://yandex.ru/maps/?text=${encodeURIComponent(customer.customerAddress)}`
          : null;
        return (
          <div className={styles.customerCell}>
            <div>{customer.customerName || '—'}</div>
            <div>
              {customer.customerAddress || '—'}
              {mapsUrl ? (
                <>
                  {' '}
                  <a className={styles.mapLink} href={mapsUrl} target="_blank" rel="noreferrer">
                    карта
                  </a>
                </>
              ) : null}
            </div>
            {customer.customerPhones.length > 0 ? (
              customer.customerPhones.map((phone) => <div key={phone}>{phone}</div>)
            ) : (
              <div>—</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'delivery',
      title: 'Доставка',
      render: (item: WaybillTask) => formatMoney(item.deliveryCost, item.deliveryPayer),
    },
    {
      key: 'movers',
      title: 'Грузчики',
      render: (item: WaybillTask) => formatMoney(item.moversCost, item.moversPayer),
    },
    {
      key: 'responsible',
      title: 'Отв.',
      render: (item: WaybillTask) => formatUserLabel(item.responsible),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: WaybillTask) => (
        <span>
          <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
          {item.completionNote ? (
            <div className={styles.cardMeta}>{item.completionNote}</div>
          ) : null}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (item: WaybillTask) => (
        <MyWaybillDriverActions
          item={item}
          onComplete={openCompleteModal}
          onFail={(task) => {
            setFailNote('');
            setFailItem(task);
          }}
        />
      ),
    },
  ];

  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить маршрут"
        aria-label={loading ? 'Обновление маршрута' : 'Обновить маршрут'}
        onClick={() => void refresh()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Мой маршрут</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{filtered.length}</span>
              </span>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {iconActions('desktop')}
        </div>
      </div>

      {message ? (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      ) : null}

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус заданий">
            <span className={cdHub.contractsListChipRowLabel}>Статус</span>
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={statusChipClass(statusFilter === opt.value)}
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label} ({statusCounts[opt.value]})
              </button>
            ))}
          </div>
          <div className={cdHub.contractsListDateFilters} role="group" aria-label="Период маршрута">
            <label className={cdHub.contractsListDateLabel}>
              <span className={cdHub.contractsListDateLabelText}>Дата от</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                disabled={loading}
                className={
                  dateFrom
                    ? `${cdHub.contractsListDateInput} ${cdHub.contractsListFilterActive}`
                    : cdHub.contractsListDateInput
                }
                aria-label="Дата от"
              />
            </label>
            <label className={cdHub.contractsListDateLabel}>
              <span className={cdHub.contractsListDateLabelText}>Дата до</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                disabled={loading}
                className={
                  dateTo
                    ? `${cdHub.contractsListDateInput} ${cdHub.contractsListFilterActive}`
                    : cdHub.contractsListDateInput
                }
                aria-label="Дата до"
              />
            </label>
          </div>
        </div>
      </div>

      <MyWaybillMobileCards
        data={filtered}
        loading={loading}
        submitting={submitting}
        onComplete={openCompleteModal}
        onFail={(task) => {
          setFailNote('');
          setFailItem(task);
        }}
      />

      <DataTable
        containerClassName={styles.directoryTable}
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="На выбранный период заданий нет"
      />

      <Modal
        isOpen={Boolean(completeItem)}
        onClose={() => setCompleteItem(null)}
        title="Подтвердить выполнение"
        size="md"
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Отметить задание как выполненное? При необходимости добавьте комментарий.
          </p>
          {completeItem ? (
            <p data-modal-form-hint>
              {completeItem.date.slice(0, 10)} ·{' '}
              {formatTimeRange(completeItem.timeFrom, completeItem.timeTo)}
              {completeItem.direction ? ` · ${completeItem.direction}` : ''}
              <br />
              {completeItem.taskText}
            </p>
          ) : null}
          <div data-modal-form-group>
            <label htmlFor="my-complete-note">Комментарий</label>
            <textarea
              id="my-complete-note"
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              rows={3}
              placeholder="Например: накладная подписана, оплата получена…"
            />
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setCompleteItem(null)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => void handleCompleteConfirm()}
            >
              {submitting ? 'Сохранение…' : 'Выполнено'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(failItem)}
        onClose={() => setFailItem(null)}
        title="Не выполнено"
        size="md"
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <div data-modal-form-group>
            <label htmlFor="my-fail-note">Причина невыполнения *</label>
            <textarea
              id="my-fail-note"
              value={failNote}
              onChange={(e) => setFailNote(e.target.value)}
              rows={3}
              placeholder="Клиент не открыл, перенос на завтра…"
            />
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setFailItem(null)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => void handleFailConfirm()}
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
