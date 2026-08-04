'use client';

import { useState } from 'react';

import type { WaybillTask } from '@/shared/api/admin-waybills';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
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
import type { WaybillStatusFilter } from '../shared/waybills-page.types';
import {
  STATUS_LABELS,
  formatMoney,
  formatTimeRange,
  formatUserLabel,
  formatWaybillDateDisplay,
  isLateEdit,
  resolveWaybillCustomerFields,
} from '../shared/waybills-page.utils';
import { WaybillTaskForm } from './WaybillTaskForm';
import { WaybillTaskRowActions } from './WaybillTaskRowActions';
import { WaybillTrashModal } from './WaybillTrashModal';
import { WaybillsListMobileCards } from './WaybillsListMobileCards';
import { WaybillsMonthCalendar } from './WaybillsMonthCalendar';
import { WaybillsRulesInfoTip } from './WaybillsRulesInfoTip';
import { WaybillsSettingsButton } from './WaybillsSettingsButton';
import { WaybillsWeekAvailabilityPanel } from './WaybillsWeekAvailabilityPanel';
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
    viewMode,
    setViewMode,
    calendarYear,
    calendarMonthIndex0,
    setCalendarMonth,
    filtered,
    tasks,
    loading,
    statusFilter,
    setStatusFilter,
    message,
    headerSuccessText,
    headerSuccessVisible,
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
    openCreateModalForDate,
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
    openRescheduleModal,
    closeRescheduleModal,
    handleRescheduleConfirm,
    rescheduleItem,
    rescheduleDate,
    setRescheduleDate,
    rescheduleTimeFrom,
    setRescheduleTimeFrom,
    rescheduleTimeTo,
    setRescheduleTimeTo,
    rescheduleError,
    searchContracts,
    applyContract,
    refresh,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    currentUserId,
    canManageWaybillSettings,
  } = model;

  const [createDateBlocked, setCreateDateBlocked] = useState(false);
  const [editDateBlocked, setEditDateBlocked] = useState(false);
  const [weekPreviewRefreshToken, setWeekPreviewRefreshToken] = useState(0);

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
          onCopy={openRescheduleModal}
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
      {canManageWaybillSettings ? (
        <WaybillsSettingsButton triggerClassName={toolbarButtonStyles.button} />
      ) : null}
      <AdminListRefreshButton
        disabled={iconsDisabled}
        busy={loading}
        title="Обновить список"
        aria-label={loading ? 'Обновление путевого листа' : 'Обновить путевой лист'}
        onClick={() => {
          void refresh();
          setWeekPreviewRefreshToken((n) => n + 1);
        }}
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
              <AdminSaveNotice
                visible={headerSuccessVisible}
                className={styles.headerSuccessNotice}
              >
                {headerSuccessText}
              </AdminSaveNotice>
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

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>{message.text}</div>
      ) : null}

      <div className={styles.viewModeRow} role="group" aria-label="Режим отображения">
        <button
          type="button"
          className={`${styles.viewModeBtn}${viewMode === 'table' ? ` ${styles.viewModeBtnActive}` : ''}`}
          onClick={() => setViewMode('table')}
        >
          Таблица
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn} ${styles.viewModeBtnCalendar}${
            viewMode === 'calendar' ? ` ${styles.viewModeBtnActive}` : ''
          }`}
          onClick={() => setViewMode('calendar')}
        >
          Календарь
        </button>
      </div>

      <div className={viewMode === 'table' ? undefined : styles.showOnlyMobile}>
        <WaybillsWeekAvailabilityPanel refreshToken={weekPreviewRefreshToken} />
      </div>

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
            className={`${cdHub.contractsListDateFilters}${
              viewMode === 'calendar' ? ` ${styles.showOnlyMobile}` : ''
            }`}
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

      <div className={styles.viewPanels}>
        <div
          className={`${styles.viewPanel} ${styles.viewPanelCalendar}${
            viewMode === 'calendar' ? ` ${styles.viewPanelActive}` : ''
          }`}
          aria-hidden={viewMode !== 'calendar'}
        >
          <WaybillsMonthCalendar
            year={calendarYear}
            monthIndex0={calendarMonthIndex0}
            onMonthChange={(year, monthIndex0) => setCalendarMonth(year, monthIndex0, true)}
            tasks={filtered}
            loading={loading}
            onOpenTask={openEditModal}
            onCreateForDate={openCreateModalForDate}
            refreshToken={weekPreviewRefreshToken}
          />
        </div>

        <div
          className={`${styles.viewPanel} ${styles.viewPanelTable}${
            viewMode === 'table' ? ` ${styles.viewPanelActive}` : ''
          }`}
          aria-hidden={viewMode !== 'table'}
        >
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
            onCopy={openRescheduleModal}
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
        </div>
      </div>
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
          <WaybillTaskForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            drivers={drivers}
            contractHits={contractHits}
            contractSearching={contractSearching}
            onSearchContracts={searchContracts}
            onApplyContract={applyContract}
            onDateBlockedChange={setCreateDateBlocked}
          />
          <ModalActions
            onCancel={closeCreateModal}
            submitting={submitting}
            submitLabel="Создать"
            disabled={createDateBlocked}
          />
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
          <WaybillTaskForm
            values={formValues}
            onChange={setFormValues}
            formError={formError}
            users={users}
            drivers={drivers}
            contractHits={contractHits}
            contractSearching={contractSearching}
            onSearchContracts={searchContracts}
            onApplyContract={applyContract}
            onDateBlockedChange={setEditDateBlocked}
          />
          <ModalActions
            onCancel={closeEditModal}
            submitting={submitting}
            disabled={editDateBlocked}
          />
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

      <Modal
        isOpen={Boolean(rescheduleItem)}
        onClose={closeRescheduleModal}
        title="Копировать на другой день"
        size="md"
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Будет создана копия задания на новую дату. Исходное задание не изменится — при
            необходимости отметьте его «Не выполнено» вручную (например, «перенос на другой день»).
          </p>
          {rescheduleItem ? (
            <p data-modal-form-hint>
              {rescheduleItem.date.slice(0, 10)}
              {rescheduleItem.direction ? ` · ${rescheduleItem.direction}` : ''}
              {` · ${formatTimeRange(rescheduleItem.timeFrom, rescheduleItem.timeTo)}`}
              <br />
              {rescheduleItem.taskText}
            </p>
          ) : null}
          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="reschedule-date">Новая дата *</label>
              <input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="reschedule-from">Время с</label>
              <input
                id="reschedule-from"
                type="time"
                value={rescheduleTimeFrom}
                onChange={(e) => setRescheduleTimeFrom(e.target.value)}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="reschedule-to">Время по</label>
              <input
                id="reschedule-to"
                type="time"
                value={rescheduleTimeTo}
                onChange={(e) => setRescheduleTimeTo(e.target.value)}
              />
            </div>
          </div>
          {rescheduleError ? <p data-modal-form-error>{rescheduleError}</p> : null}
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={closeRescheduleModal}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => void handleRescheduleConfirm()}
            >
              {submitting ? 'Перенос…' : 'Скопировать'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModalActions({
  onCancel,
  submitting,
  submitLabel = 'Сохранить',
  disabled = false,
}: {
  onCancel: () => void;
  submitting: boolean;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div data-modal-form-actions>
      <button type="button" data-modal-btn="secondary" onClick={onCancel} disabled={submitting}>
        Отмена
      </button>
      <button
        data-admin-mutation
        type="submit"
        data-modal-btn="primary"
        disabled={submitting || disabled}
      >
        {submitting ? `${submitLabel}…` : submitLabel}
      </button>
    </div>
  );
}
