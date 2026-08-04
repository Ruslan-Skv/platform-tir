'use client';

import { useMemo, useState } from 'react';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import {
  DIRECTION_LABELS,
  DIRECTION_OPTIONS,
} from '@/views/admin/CRM/Installers/installers-page.constants';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/InstallationSchedules.module.css';
import {
  STATUS_LABELS,
  formatDate,
  formatTime,
  monthBounds,
  todayIsoDate,
  weekAheadIsoDate,
} from '../shared/installation-schedules';
import { INSTALLATION_SCHEDULE_TRASH_RETENTION_NOTICE } from '../shared/installationScheduleTrashRetention';
import { InstallationScheduleForm } from './InstallationScheduleForm';
import { InstallationScheduleRowActions } from './InstallationScheduleRowActions';
import { InstallationScheduleTrashModal } from './InstallationScheduleTrashModal';
import { InstallationSchedulesListMobileCards } from './InstallationSchedulesListMobileCards';
import { InstallationSchedulesMonthCalendar } from './InstallationSchedulesMonthCalendar';
import { InstallationSchedulesRulesInfoTip } from './InstallationSchedulesRulesInfoTip';
import type { InstallationSchedulesPageModel } from './hooks/useInstallationSchedulesPage';

type StatusFilter = 'ALL' | 'PLANNED' | 'DONE' | 'FAILED';

function statusChipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function InstallationSchedulesPageView({
  model,
}: {
  model: InstallationSchedulesPageModel;
}) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    direction,
    setDirection,
    items,
    installers,
    loading,
    message,
    setMessage,
    viewMode,
    setViewMode,
    calendar,
    createOpen,
    editItem,
    deleteItem,
    setDeleteItem,
    completeItem,
    setCompleteItem,
    failItem,
    setFailItem,
    rescheduleItem,
    setRescheduleItem,
    statusNote,
    setStatusNote,
    rescheduleDate,
    setRescheduleDate,
    formValues,
    setFormValues,
    formError,
    submitting,
    refresh,
    openCreate,
    openEdit,
    closeForm,
    saveCreate,
    saveEdit,
    deleteSelected,
    completeSelected,
    failSelected,
    reopen,
    openReschedule,
    confirmReschedule,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
  } = model;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  const flashSuccess = (text: string) => {
    setSuccessText(text);
    setSuccessVisible(true);
    window.setTimeout(() => setSuccessVisible(false), 2800);
  };

  const setPeriod = (kind: 'today' | 'week' | 'month') => {
    const today = todayIsoDate();
    if (kind === 'today') {
      setDateFrom(today);
      setDateTo(today);
      return;
    }
    if (kind === 'week') {
      setDateFrom(today);
      setDateTo(weekAheadIsoDate(today));
      return;
    }
    const base = new Date(`${today}T00:00:00`);
    const bounds = monthBounds(base.getFullYear(), base.getMonth());
    setDateFrom(bounds.from);
    setDateTo(bounds.to);
  };

  const statusCounts = useMemo(
    () => ({
      ALL: items.length,
      PLANNED: items.filter((item) => item.status === 'PLANNED').length,
      DONE: items.filter((item) => item.status === 'DONE').length,
      FAILED: items.filter((item) => item.status === 'FAILED').length,
    }),
    [items]
  );

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? items : items.filter((item) => item.status === statusFilter)),
    [items, statusFilter]
  );

  const countTitle =
    statusFilter === 'ALL'
      ? `${items.length} записей`
      : `${filtered.length} из ${items.length} записей`;

  const columns = [
    {
      key: 'date',
      title: 'Дата',
      render: (item: InstallationSchedule) => formatDate(item.date),
    },
    {
      key: 'time',
      title: 'Время',
      render: (item: InstallationSchedule) => formatTime(item),
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (item: InstallationSchedule) => DIRECTION_LABELS[item.direction],
    },
    {
      key: 'installer',
      title: 'Монтажник',
      render: (item: InstallationSchedule) => item.installerName || '—',
    },
    {
      key: 'contract',
      title: 'Договор / работа',
      render: (item: InstallationSchedule) => (
        <div className={styles.contractCell}>
          <div>{item.contractNumber || '—'}</div>
          {item.workOrderLabel || item.orderInfo ? (
            <span className={styles.subline}>{item.workOrderLabel || item.orderInfo}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'customer',
      title: 'Заказчик',
      render: (item: InstallationSchedule) => (
        <div className={styles.customerCell}>
          <div>{item.customerName || '—'}</div>
          {item.customerAddress ? (
            <span className={styles.subline}>{item.customerAddress}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: InstallationSchedule) => (
        <span>
          <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
            {STATUS_LABELS[item.status]}
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
      render: (item: InstallationSchedule) => (
        <InstallationScheduleRowActions
          item={item}
          onEdit={openEdit}
          onComplete={(row) => {
            setStatusNote('');
            setCompleteItem(row);
          }}
          onFail={(row) => {
            setStatusNote('');
            setFailItem(row);
          }}
          onReschedule={openReschedule}
          onDelete={setDeleteItem}
          onReopen={(row) => {
            void wrapAction(() => reopen(row), 'Монтаж возвращён в план');
          }}
        />
      ),
    },
  ];

  const setCalendarMonth = (year: number, month: number) => {
    const bounds = monthBounds(year, month);
    setDateFrom(bounds.from);
    setDateTo(bounds.to);
  };

  const iconsDisabled = loading || submitting;
  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'Все' },
    { value: 'PLANNED', label: 'В плане' },
    { value: 'DONE', label: 'Выполнено' },
    { value: 'FAILED', label: 'Не выполнено' },
  ];

  const wrapAction = async (action: () => Promise<boolean>, success: string) => {
    const ok = await action();
    if (ok) flashSuccess(success);
  };

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Графики монтажей</h1>
                <InstallationSchedulesRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{filtered.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={iconsDisabled}
                busy={loading}
                title="Обновить список"
                aria-label={loading ? 'Обновление графика монтажей' : 'Обновить график монтажей'}
                onClick={() => void refresh()}
              />
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина графика монтажей"
                aria-label="Корзина графика монтажей"
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={() => openCreate()}
          >
            + Монтаж
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={iconsDisabled}
              busy={loading}
              title="Обновить список"
              aria-label={loading ? 'Обновление графика монтажей' : 'Обновить график монтажей'}
              onClick={() => void refresh()}
            />
            <AdminToolbarTrashButton
              trashCount={trashCount}
              onClick={() => setTrashOpen(true)}
              title="Корзина графика монтажей"
              aria-label="Корзина графика монтажей"
            />
          </div>
        </div>
      </div>

      {message ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
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

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Направление">
            <span className={cdHub.contractsListChipRowLabel}>Направление</span>
            <button
              type="button"
              disabled={loading}
              className={statusChipClass(direction === 'ALL')}
              onClick={() => setDirection('ALL')}
            >
              Все
            </button>
            {DIRECTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                className={statusChipClass(direction === option.value)}
                onClick={() => setDirection(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
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
            className={`${cdHub.contractsListChipRow}${
              viewMode === 'calendar' ? ` ${styles.showOnlyMobile}` : ''
            }`}
            role="group"
            aria-label="Быстрый период"
          >
            <span className={cdHub.contractsListChipRowLabel}>Период</span>
            {(['today', 'week', 'month'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={loading}
                className={cdHub.contractsListChip}
                onClick={() => setPeriod(kind)}
              >
                {kind === 'today' ? 'Сегодня' : kind === 'week' ? 'Неделя' : 'Месяц'}
              </button>
            ))}
          </div>

          <div
            className={`${cdHub.contractsListDateFilters}${
              viewMode === 'calendar' ? ` ${styles.showOnlyMobile}` : ''
            }`}
            role="group"
            aria-label="Период графика монтажей"
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
          <InstallationSchedulesMonthCalendar
            year={calendar.year}
            month={calendar.month}
            items={filtered}
            loading={loading}
            onMonthChange={setCalendarMonth}
            onOpen={openEdit}
            onCreate={openCreate}
          />
        </div>
        <div
          className={`${styles.viewPanel} ${styles.viewPanelTable}${
            viewMode === 'table' ? ` ${styles.viewPanelActive}` : ''
          }`}
          aria-hidden={viewMode !== 'table'}
        >
          <InstallationSchedulesListMobileCards
            data={filtered}
            loading={loading}
            onEdit={openEdit}
            onComplete={(row) => {
              setStatusNote('');
              setCompleteItem(row);
            }}
            onFail={(row) => {
              setStatusNote('');
              setFailItem(row);
            }}
            onReschedule={openReschedule}
            onDelete={setDeleteItem}
            onReopen={(row) => {
              void wrapAction(() => reopen(row), 'Монтаж возвращён в план');
            }}
          />
          <DataTable
            containerClassName={styles.directoryTable}
            data={filtered}
            columns={columns}
            keyExtractor={(item) => item.id}
            loading={loading}
            emptyMessage="В выбранный период монтажей нет"
          />
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={closeForm} title="Новый монтаж" size="lg" showCloseButton>
        <form
          data-modal-form
          data-modal-density="compact"
          onSubmit={(event) => {
            void saveCreate(event).then((ok) => {
              if (ok) flashSuccess('Монтаж добавлен');
            });
          }}
        >
          <p data-modal-form-hint className={styles.modalHintFlush}>
            Запись появится в графике на выбранную дату. Можно привязать пакет договора и
            заказ-наряд или указать данные вручную.
          </p>
          <InstallationScheduleForm
            values={formValues}
            onChange={setFormValues}
            installers={installers}
            error={formError}
          />
          <ModalActions onCancel={closeForm} busy={submitting} label="Создать" />
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(editItem)}
        onClose={closeForm}
        title="Изменить монтаж"
        size="lg"
        showCloseButton
      >
        <form
          data-modal-form
          data-modal-density="compact"
          onSubmit={(event) => {
            void saveEdit(event).then((ok) => {
              if (ok) flashSuccess('Запись обновлена');
            });
          }}
        >
          <InstallationScheduleForm
            values={formValues}
            onChange={setFormValues}
            installers={installers}
            error={formError}
          />
          <ModalActions onCancel={closeForm} busy={submitting} label="Сохранить" />
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        title="Удалить монтаж"
        message={`Запись будет перемещена в корзину. Удалить можно только монтаж со статусом «В плане». ${INSTALLATION_SCHEDULE_TRASH_RETENTION_NOTICE}`}
        confirmText={submitting ? 'Удаление…' : 'Удалить'}
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          void wrapAction(deleteSelected, 'Запись перенесена в корзину');
        }}
      />

      <InstallationScheduleTrashModal
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

      <StatusModal
        open={Boolean(completeItem)}
        title="Подтвердить выполнение"
        label="Комментарий"
        note={statusNote}
        setNote={setStatusNote}
        busy={submitting}
        onClose={() => setCompleteItem(null)}
        onConfirm={() => {
          void wrapAction(completeSelected, 'Монтаж выполнен');
        }}
        confirmText="Выполнено"
      />

      <StatusModal
        open={Boolean(failItem)}
        title="Не выполнено"
        label="Причина *"
        note={statusNote}
        setNote={setStatusNote}
        busy={submitting}
        onClose={() => setFailItem(null)}
        onConfirm={() => {
          void wrapAction(failSelected, 'Монтаж отмечен как невыполненный');
        }}
        confirmText="Сохранить"
      />

      <Modal
        isOpen={Boolean(rescheduleItem)}
        onClose={() => setRescheduleItem(null)}
        title="Перенести монтаж"
        size="md"
        showCloseButton
      >
        <div data-modal-form>
          <div data-modal-form-group>
            <label htmlFor="is-reschedule-date">Новая дата *</label>
            <input
              id="is-reschedule-date"
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </div>
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={() => setRescheduleItem(null)}
            >
              Отмена
            </button>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={submitting}
              onClick={() => {
                void wrapAction(confirmReschedule, 'Монтаж перенесён');
              }}
            >
              Перенести
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ModalActions({
  onCancel,
  busy,
  label,
}: {
  onCancel: () => void;
  busy: boolean;
  label: string;
}) {
  return (
    <div data-modal-form-actions>
      <button type="button" data-modal-btn="secondary" onClick={onCancel}>
        Отмена
      </button>
      <button type="submit" data-modal-btn="primary" disabled={busy}>
        {busy ? 'Сохранение…' : label}
      </button>
    </div>
  );
}

function StatusModal({
  open,
  title,
  label,
  note,
  setNote,
  busy,
  onClose,
  onConfirm,
  confirmText,
}: {
  open: boolean;
  title: string;
  label: string;
  note: string;
  setNote: (note: string) => void;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} title={title} size="md" showCloseButton>
      <div data-modal-form>
        <div data-modal-form-group>
          <label>{label}</label>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" data-modal-btn="primary" disabled={busy} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
