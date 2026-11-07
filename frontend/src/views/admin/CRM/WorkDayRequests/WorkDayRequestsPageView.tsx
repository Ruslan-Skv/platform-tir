'use client';

import {
  type WorkDayRequestStatus,
  type WorkDayRequestType,
  isWorkDayPeriodRequestType,
} from '@/shared/api/crm/admin-work-days';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './WorkDayRequestsPage.module.css';
import type { WorkDayRequestsPageModel } from './hooks/useWorkDayRequestsPage';

type WorkDayRequestsPageViewProps = {
  model: WorkDayRequestsPageModel;
};

const TYPE_LABELS: Record<WorkDayRequestType, string> = {
  DAY_OFF: 'Выходной',
  EARLY_LEAVE: 'Уйти пораньше',
  LATE_ARRIVAL: 'Прийти попозже',
  SICK_LEAVE: 'Больничный',
  VACATION_LEAVE: 'Отпуск',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Подтверждён',
  REJECTED: 'Отклонён',
  CANCELLED: 'Отменён',
};

const STATUS_FILTERS: { value: WorkDayRequestStatus | 'ALL'; label: string }[] = [
  { value: 'PENDING', label: 'Ожидают' },
  { value: 'APPROVED', label: 'Подтверждённые' },
  { value: 'REJECTED', label: 'Отклонённые' },
  { value: 'ALL', label: 'Все' },
];

/** Типы запросов с переключателем автоудовлетворения (подписи как у кнопок сотрудника). */
const AUTO_APPROVE_TYPES: { type: WorkDayRequestType; label: string }[] = [
  { type: 'LATE_ARRIVAL', label: 'Прийти попозже' },
  { type: 'EARLY_LEAVE', label: 'Уйти пораньше' },
  { type: 'SICK_LEAVE', label: 'Отметить больничный' },
  { type: 'DAY_OFF', label: 'Взять выходной' },
  { type: 'VACATION_LEAVE', label: 'Отметить отпуск' },
];

function userLabel(row: {
  user?: { firstName: string | null; lastName: string | null; email: string } | null;
}): string {
  if (!row.user) return '—';
  const name = [row.user.lastName, row.user.firstName].filter(Boolean).join(' ');
  return name || row.user.email;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function WorkDayRequestsPageView({ model }: WorkDayRequestsPageViewProps) {
  const {
    rows,
    loading,
    error,
    busyId,
    statusFilter,
    setStatusFilter,
    highlightId,
    load,
    approve,
    reject,
    autoApprovedTypes,
    settingsLoading,
    settingsBusyType,
    toggleAutoApprove,
  } = model;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsListHeaderTitleGroup}>
            <h1 className={styles.title}>Запросы рабочего дня</h1>
          </div>
          <span className={cdHub.contractsListCount}>{rows.length}</span>
        </div>
        <div className={cdChrome.headerButtonsRow}>
          <AdminListRefreshButton
            disabled={loading}
            busy={loading}
            title="Обновить"
            aria-label="Обновить список запросов"
            onClick={() => void load()}
          />
        </div>
      </div>

      <div className={styles.filters} role="group" aria-label="Статус запроса">
        {STATUS_FILTERS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`${styles.filterChip} ${statusFilter === opt.value ? styles.filterChipActive : ''}`}
            disabled={loading}
            onClick={() => setStatusFilter(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.settingsCard} aria-label="Настройки автоудовлетворения запросов">
        <h2 className={styles.settingsTitle}>Автоудовлетворение запросов</h2>
        <p className={styles.settingsHint}>
          Включённые типы запросов согласовываются сразу при отправке сотрудником — без ожидания
          ручного подтверждения суперадмином.
        </p>
        <ul className={styles.settingsList}>
          {AUTO_APPROVE_TYPES.map((item) => (
            <li key={item.type}>
              <label className={styles.settingsLabel}>
                <input
                  type="checkbox"
                  checked={autoApprovedTypes.includes(item.type)}
                  disabled={settingsLoading || settingsBusyType === item.type}
                  onChange={() => void toggleAutoApprove(item.type)}
                />
                <span>{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>Запросов нет</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li
              id={`work-day-request-${row.id}`}
              key={row.id}
              className={`${styles.card} ${highlightId === row.id ? styles.cardHighlight : ''}`}
            >
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>{TYPE_LABELS[row.type]}</h2>
                <span className={styles.cardMeta}>
                  {formatDate(row.requestDate)}
                  {isWorkDayPeriodRequestType(row.type) &&
                  row.requestDateTo &&
                  row.requestDateTo !== row.requestDate
                    ? ` – ${formatDate(row.requestDateTo)}`
                    : ''}
                </span>
                {row.proposedEndTime ? (
                  <span className={styles.cardMeta}>
                    {row.type === 'LATE_ARRIVAL' ? 'к' : 'до'} {row.proposedEndTime}
                  </span>
                ) : null}
              </div>
              <p className={styles.cardMeta}>
                {userLabel(row)}
                {row.user?.email ? ` · ${row.user.email}` : ''}
              </p>
              {row.comment ? <p className={styles.cardComment}>{row.comment}</p> : null}
              {row.status === 'PENDING' ? (
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.approveBtn}
                    disabled={busyId === row.id}
                    onClick={() => void approve(row.id)}
                  >
                    {busyId === row.id ? '…' : 'Подтвердить'}
                  </button>
                  <button
                    type="button"
                    className={styles.rejectBtn}
                    disabled={busyId === row.id}
                    onClick={() => void reject(row.id)}
                  >
                    Отклонить
                  </button>
                </div>
              ) : (
                <p className={styles.cardMeta}>
                  Статус: {STATUS_LABELS[row.status] ?? row.status}
                  {row.reviewComment ? ` · ${row.reviewComment}` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
