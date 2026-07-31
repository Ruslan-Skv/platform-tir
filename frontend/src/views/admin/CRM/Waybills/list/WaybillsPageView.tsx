'use client';

import { useEffect, useState } from 'react';

import type { Contract, CrmUser } from '@/shared/api/admin-crm';
import {
  type DriverAvailabilityStatus,
  type WaybillTask,
  resolveDriverDeliveryAvailability,
} from '@/shared/api/admin-waybills';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import toolbarButtonStyles from '@/shared/ui/admin/AdminToolbarIconButton/AdminToolbarIconButton.module.css';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/Waybills.module.css';
import { WAYBILL_TRASH_RETENTION_NOTICE } from '../shared/waybillTrashRetention';
import type { WaybillFormValues, WaybillStatusFilter } from '../shared/waybills-page.types';
import {
  STATUS_LABELS,
  WAYBILL_DIRECTION_SUGGESTIONS,
  formatMoney,
  formatTimeRange,
  formatUserLabel,
  isLateEdit,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import { WaybillTaskRowActions } from './WaybillTaskRowActions';
import { WaybillTrashModal } from './WaybillTrashModal';
import { WaybillsListMobileCards } from './WaybillsListMobileCards';
import { WaybillsRulesInfoTip } from './WaybillsRulesInfoTip';
import { WaybillsSettingsButton } from './WaybillsSettingsButton';
import type { WaybillsPageModel } from './hooks/useWaybillsPage';

type WaybillsPageViewProps = {
  model: WaybillsPageModel;
};

function statusChipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function WaybillsPageView({ model }: WaybillsPageViewProps) {
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
    users,
    drivers,
    createModalOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    failItem,
    setFailItem,
    failNote,
    setFailNote,
    completeItem,
    setCompleteItem,
    completeNote,
    setCompleteNote,
    formValues,
    setFormValues,
    formError,
    submitting,
    contractHits,
    contractSearching,
    openCreateModal,
    openEditModal,
    closeCreateModal,
    closeEditModal,
    handleCreate,
    handleEdit,
    handleDelete,
    openCompleteModal,
    handleCompleteConfirm,
    handleFailConfirm,
    handleReopen,
    searchContracts,
    applyContract,
    refresh,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    currentUserId,
    isSuperAdmin,
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

  const columns = [
    {
      key: 'date',
      title: 'Дата',
      render: (item: WaybillTask) => item.date.slice(0, 10),
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
        return (
          <div className={styles.customerCell}>
            <div>{customer.customerName || '—'}</div>
            <div>{customer.customerAddress || '—'}</div>
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
      key: 'driver',
      title: 'Водитель',
      render: (item: WaybillTask) => formatUserLabel(item.driver),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: WaybillTask) => (
        <span>
          <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
            {STATUS_LABELS[item.status] ?? item.status}
          </span>
          {isLateEdit(item.date, item.updatedAt, item.createdAt) ? (
            <span className={styles.lateFlag} title="Изменено после 08:00">
              после 08:00
            </span>
          ) : null}
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
        <WaybillTaskRowActions
          item={item}
          currentUserId={currentUserId}
          onEdit={openEditModal}
          onComplete={openCompleteModal}
          onFail={(task) => {
            setFailNote('');
            setFailItem(task);
          }}
          onDelete={setDeleteItem}
          onReopen={(task) => void handleReopen(task)}
        />
      ),
    },
  ];

  const statusOptions: { value: WaybillStatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Все' },
    { value: 'PLANNED', label: 'В плане' },
    { value: 'DONE', label: 'Выполнено' },
    { value: 'FAILED', label: 'Не выполнено' },
  ];

  const iconsDisabled = loading || submitting;
  const iconActions = (placement: 'desktop' | 'mobile') => (
    <div
      className={
        placement === 'mobile'
          ? cdHub.contractsHeaderIconActionsMobile
          : cdHub.contractsHeaderIconActionsDesktop
      }
    >
      {isSuperAdmin ? (
        <WaybillsSettingsButton triggerClassName={toolbarButtonStyles.button} />
      ) : null}
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить список"
        aria-label={loading ? 'Обновление путевого листа' : 'Обновить путевой лист'}
        onClick={() => void refresh()}
      />
      <AdminToolbarTrashButton
        trashCount={trashCount}
        onClick={() => setTrashOpen(true)}
        title="Корзина путевого листа"
        aria-label="Корзина путевого листа"
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
                <h1 className={cdHub.title}>Путевой лист</h1>
                <WaybillsRulesInfoTip />
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
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={openCreateModal}
          >
            + Задание
          </button>
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
          <div
            className={cdHub.contractsListDateFilters}
            role="group"
            aria-label="Период путевого листа"
          >
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

      <WaybillsListMobileCards
        data={filtered}
        loading={loading}
        currentUserId={currentUserId}
        onEdit={openEditModal}
        onComplete={openCompleteModal}
        onFail={(task) => {
          setFailNote('');
          setFailItem(task);
        }}
        onDelete={setDeleteItem}
        onReopen={(task) => void handleReopen(task)}
      />

      <DataTable
        containerClassName={styles.directoryTable}
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="На этот день заданий нет"
      />
      <Modal
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        title="Новое задание"
        size="lg"
        showCloseButton
      >
        <form data-modal-form data-modal-density="compact" onSubmit={handleCreate}>
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Задание появится в путевом листе на выбранную дату и в «Моём маршруте» у назначенного
            водителя.
          </p>
          <WaybillForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            drivers={drivers}
            contractHits={contractHits}
            contractSearching={contractSearching}
            onSearchContracts={searchContracts}
            onApplyContract={applyContract}
          />
          <ModalActions onCancel={closeCreateModal} submitting={submitting} submitLabel="Создать" />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editItem)}
        onClose={closeEditModal}
        title="Изменить задание"
        size="lg"
        showCloseButton
      >
        <form data-modal-form data-modal-density="compact" onSubmit={handleEdit}>
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Изменения сразу отобразятся в путевом листе и у водителя.
          </p>
          <WaybillForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            drivers={drivers}
            contractHits={contractHits}
            contractSearching={contractSearching}
            onSearchContracts={searchContracts}
            onApplyContract={applyContract}
          />
          <ModalActions onCancel={closeEditModal} submitting={submitting} />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        title="Удалить задание"
        message={`Задание будет перемещено в корзину. Удалить можно только своё задание со статусом «В плане». ${WAYBILL_TRASH_RETENTION_NOTICE}`}
        confirmText={submitting ? 'Удаление…' : 'В корзину'}
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDelete}
      />

      <WaybillTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
        onRestored={() => {
          void refresh();
          void refreshTrashCount();
        }}
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
              {completeItem.date.slice(0, 10)}
              {completeItem.direction ? ` · ${completeItem.direction}` : ''}
              {` · ${formatTimeRange(completeItem.timeFrom, completeItem.timeTo)}`}
              <br />
              {completeItem.taskText}
            </p>
          ) : null}
          <div data-modal-form-group>
            <label htmlFor="complete-note">Комментарий</label>
            <textarea
              id="complete-note"
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
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Задание останется в путевом листе — укажите причину, почему доставка не выполнена.
          </p>
          <div data-modal-form-group>
            <label htmlFor="fail-note">Причина невыполнения *</label>
            <textarea
              id="fail-note"
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

function WaybillForm({
  values,
  onChange,
  formError,
  users,
  drivers,
  contractHits,
  contractSearching,
  onSearchContracts,
  onApplyContract,
}: {
  values: WaybillFormValues;
  onChange: (next: WaybillFormValues) => void;
  formError: string | null;
  users: CrmUser[];
  drivers: CrmUser[];
  contractHits: Contract[];
  contractSearching: boolean;
  onSearchContracts: (q: string) => void;
  onApplyContract: (c: Contract) => void;
}) {
  const [availability, setAvailability] = useState<DriverAvailabilityStatus[]>([]);

  useEffect(() => {
    if (!values.date) {
      setAvailability([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void resolveDriverDeliveryAvailability({
        date: values.date,
        timeFrom: values.timeFrom || null,
      })
        .then((rows) => {
          if (!cancelled) setAvailability(rows);
        })
        .catch(() => {
          if (!cancelled) setAvailability([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [values.date, values.timeFrom]);

  const availabilityById = new Map(availability.map((a) => [a.userId, a]));
  const selectedAvailability = values.driverUserId
    ? availabilityById.get(values.driverUserId)
    : undefined;
  const driverWarning =
    selectedAvailability &&
    selectedAvailability.hasScheme &&
    selectedAvailability.isActive &&
    !selectedAvailability.available
      ? selectedAvailability.kind === 'OFF'
        ? 'По схеме в этот день у водителя выходной на доставках. Назначение всё равно возможно.'
        : `По схеме водитель доступен ${selectedAvailability.label}. Время задания вне окна — назначение всё равно возможно.`
      : null;

  return (
    <>
      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="wb-date">Дата *</label>
          <input
            id="wb-date"
            type="date"
            value={values.date}
            onChange={(e) => onChange({ ...values, date: e.target.value })}
            required
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-direction">Направление</label>
          <input
            id="wb-direction"
            list="wb-direction-list"
            value={values.direction}
            onChange={(e) => onChange({ ...values, direction: e.target.value })}
            placeholder="двери, бавария…"
          />
          <datalist id="wb-direction-list">
            {WAYBILL_DIRECTION_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-from">Время с</label>
          <input
            id="wb-from"
            type="time"
            value={values.timeFrom}
            onChange={(e) => onChange({ ...values, timeFrom: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-to">Время по</label>
          <input
            id="wb-to"
            type="time"
            value={values.timeTo}
            onChange={(e) => onChange({ ...values, timeTo: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-task">Задание водителю *</label>
          <textarea
            id="wb-task"
            value={values.taskText}
            onChange={(e) => onChange({ ...values, taskText: e.target.value })}
            required
            rows={3}
            placeholder="Склад, счёт, что проверить / купить…"
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-contract">Договор (поиск по номеру)</label>
          <input
            id="wb-contract"
            type="text"
            value={values.contractSearch}
            onChange={(e) => {
              const contractSearch = e.target.value;
              onChange({ ...values, contractSearch, contractId: '' });
              void onSearchContracts(contractSearch);
            }}
            placeholder="371Д-463"
          />
          {contractSearching ? (
            <span className={styles.fieldHint}>Поиск…</span>
          ) : (
            <span className={styles.fieldHint}>
              Выберите договор — подставятся ФИО, адрес и телефон
            </span>
          )}
          {contractHits.length > 0 ? (
            <ul className={styles.contractHits}>
              {contractHits.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onApplyContract(c)}>
                    {c.contractNumber} — {c.customerName || 'без имени'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-customer-name">ФИО</label>
          <input
            id="wb-customer-name"
            type="text"
            value={values.customerName}
            onChange={(e) => onChange({ ...values, customerName: e.target.value })}
            placeholder="Иванов Иван Иванович"
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label>Телефоны</label>
          <div className={styles.phoneFields}>
            {values.customerPhones.map((phone, index) => (
              <div key={index} className={styles.phoneFieldRow}>
                <input
                  id={index === 0 ? 'wb-customer-phone' : undefined}
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const customerPhones = [...values.customerPhones];
                    customerPhones[index] = e.target.value;
                    onChange({ ...values, customerPhones });
                  }}
                  placeholder="+7(900)-000-00-00"
                  aria-label={index === 0 ? 'Телефон' : `Телефон ${index + 1}`}
                />
                {values.customerPhones.length > 1 ? (
                  <button
                    data-admin-mutation
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.phoneRemoveBtn}
                    onClick={() => {
                      const customerPhones = values.customerPhones.filter((_, i) => i !== index);
                      onChange({
                        ...values,
                        customerPhones: customerPhones.length > 0 ? customerPhones : [''],
                      });
                    }}
                    aria-label={`Удалить телефон ${index + 1}`}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            ))}
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="secondary"
              className={styles.phoneAddBtn}
              onClick={() =>
                onChange({ ...values, customerPhones: [...values.customerPhones, ''] })
              }
            >
              + Добавить телефон
            </button>
          </div>
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-customer-address">Адрес</label>
          <input
            id="wb-customer-address"
            type="text"
            value={values.customerAddress}
            onChange={(e) => onChange({ ...values, customerAddress: e.target.value })}
            placeholder="Город, улица, дом…"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-delivery-cost">Стоимость доставки</label>
          <input
            id="wb-delivery-cost"
            type="number"
            step="0.01"
            value={values.deliveryCost}
            onChange={(e) => onChange({ ...values, deliveryCost: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-delivery-payer">Кто платит (доставка)</label>
          <input
            id="wb-delivery-payer"
            type="text"
            value={values.deliveryPayer}
            onChange={(e) => onChange({ ...values, deliveryPayer: e.target.value })}
            placeholder="Заказчик / Привокзальная…"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-movers-cost">Стоимость грузчиков</label>
          <input
            id="wb-movers-cost"
            type="number"
            step="0.01"
            value={values.moversCost}
            onChange={(e) => onChange({ ...values, moversCost: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-movers-payer">Кто платит (грузчики)</label>
          <input
            id="wb-movers-payer"
            type="text"
            value={values.moversPayer}
            onChange={(e) => onChange({ ...values, moversPayer: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-responsible">Ответственный</label>
          <select
            id="wb-responsible"
            value={values.responsibleUserId}
            onChange={(e) => onChange({ ...values, responsibleUserId: e.target.value })}
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {formatUserLabel(u)}
              </option>
            ))}
          </select>
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-driver">Водитель</label>
          <select
            id="wb-driver"
            value={values.driverUserId}
            onChange={(e) => onChange({ ...values, driverUserId: e.target.value })}
          >
            <option value="">—</option>
            {(drivers.length ? drivers : users).map((u) => {
              const status = availabilityById.get(u.id);
              const suffix = status?.hasScheme && status.isActive ? ` · ${status.label}` : '';
              return (
                <option key={u.id} value={u.id}>
                  {formatUserLabel(u)}
                  {u.role === 'DRIVER' ? ' (водитель)' : ''}
                  {suffix}
                </option>
              );
            })}
          </select>
          {selectedAvailability?.hasScheme && selectedAvailability.isActive ? (
            <span className={styles.fieldHint}>
              На {values.date}: {selectedAvailability.label}
            </span>
          ) : null}
          {driverWarning ? <p data-modal-form-error>{driverWarning}</p> : null}
        </div>
      </div>
      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}

function ModalActions({
  onCancel,
  submitting,
  submitLabel = 'Сохранить',
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel?: string;
}) {
  return (
    <div data-modal-form-actions>
      <button type="button" data-modal-btn="secondary" onClick={onCancel} disabled={submitting}>
        Отмена
      </button>
      <button data-admin-mutation type="submit" data-modal-btn="primary" disabled={submitting}>
        {submitting ? `${submitLabel}…` : submitLabel}
      </button>
    </div>
  );
}
