'use client';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DIRECTION_LABELS } from '@/views/admin/CRM/Installers/installers-page.constants';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/InstallationSchedules.module.css';
import { STATUS_LABELS, formatDate, formatTime } from '../shared/installation-schedules';
import { MyInstallationScheduleActions } from './MyInstallationScheduleActions';
import { MyInstallationSchedulesMobileCards } from './MyInstallationSchedulesMobileCards';
import type {
  InstallationStatusFilter,
  MyInstallationSchedulesPageModel,
} from './hooks/useMyInstallationSchedulesPage';

type Props = {
  model: MyInstallationSchedulesPageModel;
};

function statusChipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function MyInstallationSchedulesPageView({ model }: Props) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    filtered,
    items,
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
    ALL: items.length,
    PLANNED: items.filter((t) => t.status === 'PLANNED').length,
    DONE: items.filter((t) => t.status === 'DONE').length,
    FAILED: items.filter((t) => t.status === 'FAILED').length,
  };

  const countTitle =
    statusFilter === 'ALL'
      ? `${items.length} монтажей`
      : `${filtered.length} из ${items.length} монтажей`;

  const statusOptions: { value: InstallationStatusFilter; label: string }[] = [
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
      key: 'work',
      title: 'Заказ-наряд',
      render: (item: InstallationSchedule) => (
        <div className={styles.taskCell}>
          <div>{item.workOrderLabel || '—'}</div>
          {item.contractNumber ? (
            <div className={styles.cardMeta}>Дог. {item.contractNumber}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'customer',
      title: 'Заказчик',
      render: (item: InstallationSchedule) => {
        const phones =
          item.customerPhones?.length > 0
            ? item.customerPhones
            : item.customerPhone
              ? [item.customerPhone]
              : [];
        if (!item.customerName && !item.customerAddress && phones.length === 0) return '—';
        const mapsUrl = item.customerAddress
          ? `https://yandex.ru/maps/?text=${encodeURIComponent(item.customerAddress)}`
          : null;
        return (
          <div className={styles.customerCell}>
            <div>{item.customerName || '—'}</div>
            <div>
              {item.customerAddress || '—'}
              {mapsUrl ? (
                <>
                  {' '}
                  <a className={styles.mapLink} href={mapsUrl} target="_blank" rel="noreferrer">
                    карта
                  </a>
                </>
              ) : null}
            </div>
            {phones.length > 0 ? (
              phones.map((phone) => <div key={phone}>{phone}</div>)
            ) : (
              <div>—</div>
            )}
          </div>
        );
      },
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
        <MyInstallationScheduleActions
          item={item}
          onComplete={openCompleteModal}
          onFail={(entry) => {
            setFailNote('');
            setFailItem(entry);
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
        title="Обновить монтажи"
        aria-label={loading ? 'Обновление монтажей' : 'Обновить монтажи'}
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
                <h1 className={cdHub.title}>Мои монтажи</h1>
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
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус монтажей">
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
          <div className={cdHub.contractsListDateFilters} role="group" aria-label="Период монтажей">
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

      <MyInstallationSchedulesMobileCards
        data={filtered}
        loading={loading}
        submitting={submitting}
        onComplete={openCompleteModal}
        onFail={(entry) => {
          setFailNote('');
          setFailItem(entry);
        }}
      />

      <DataTable
        containerClassName={styles.directoryTable}
        data={filtered}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="На выбранный период монтажей нет"
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
            Отметить монтаж как выполненный? При необходимости добавьте комментарий.
          </p>
          {completeItem ? (
            <p data-modal-form-hint>
              {formatDate(completeItem.date)} · {formatTime(completeItem)} ·{' '}
              {DIRECTION_LABELS[completeItem.direction]}
              <br />
              {completeItem.workOrderLabel || completeItem.contractNumber || 'Монтаж'}
            </p>
          ) : null}
          <div data-modal-form-group>
            <label htmlFor="my-install-complete-note">Комментарий</label>
            <textarea
              id="my-install-complete-note"
              value={completeNote}
              onChange={(e) => setCompleteNote(e.target.value)}
              rows={3}
              placeholder="Например: работы сданы, акт подписан…"
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
            <label htmlFor="my-install-fail-note">Причина невыполнения *</label>
            <textarea
              id="my-install-fail-note"
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
