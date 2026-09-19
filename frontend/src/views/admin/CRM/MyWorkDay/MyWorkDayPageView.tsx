'use client';

import { useMemo, useState } from 'react';

import { WorkDaysIpHelp } from '@/features/admin/work-day/WorkDaysIpHelp';
import {
  buildWorkDayEndSummary,
  hasWorkDayViolations,
} from '@/features/admin/work-day/work-day-summary';
import { useAuth } from '@/features/auth';
import type {
  WorkDayJournalRow,
  WorkDayRecord,
  WorkDayRequestType,
} from '@/shared/api/admin-work-days';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { contractsListFilterFieldClass } from '@/views/admin/ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import {
  formatWorkDayAbsenceInterval,
  formatWorkDayDate,
  formatWorkDayTime,
  isWorkDayDayOffRow,
  isWorkDayTruancyRow,
  workDayAbsenceMinutes,
  workDayRequestBadgeLabel,
  workDayRowClassName,
  workDayStatusLabel,
} from '../WorkDays/work-days-display.utils';
import { MyWorkDayAbsenceModal } from './MyWorkDayAbsenceModal';
import styles from './MyWorkDayPage.module.css';
import { MyWorkDayRequestModal } from './MyWorkDayRequestModal';
import { MyWorkDayRulesInfoTip } from './MyWorkDayRulesInfoTip';
import type { MyWorkDayPageModel } from './hooks/useMyWorkDayPage';

type MyWorkDayPageViewProps = {
  model: MyWorkDayPageModel;
};

const REQUEST_TYPE_LABELS: Record<WorkDayRequestType, string> = {
  DAY_OFF: 'Выходной',
  EARLY_LEAVE: 'Уйти пораньше',
  LATE_ARRIVAL: 'Прийти попозже',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  APPROVED: 'Подтверждён',
  REJECTED: 'Отклонён',
  CANCELLED: 'Отменён',
};

function AbsenceCell({ row }: { row: WorkDayRecord }) {
  const absences = row.absences ?? [];
  const minutes = workDayAbsenceMinutes(row);
  if (absences.length === 0) return <>—</>;

  return (
    <div className={styles.absenceCell}>
      <span className={styles.absenceTotal}>{Math.round(minutes)} мин</span>
      <ul className={styles.absenceList}>
        {absences.map((a) => (
          <li key={a.id}>
            {formatWorkDayAbsenceInterval(a.startedAt, a.endedAt)}
            {a.reason ? ` · ${a.reason}` : ''}
            {!a.endedAt ? ' (сейчас)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestsCell({ row }: { row: WorkDayJournalRow }) {
  const requests = row.requests ?? [];
  if (requests.length === 0) return <>—</>;

  return (
    <div className={styles.requestBadges}>
      {requests.map((req) => (
        <span
          key={req.id}
          className={`${styles.requestBadge} ${
            req.status === 'APPROVED' ? styles.requestBadgeApproved : styles.requestBadgePending
          }`}
        >
          {workDayRequestBadgeLabel(req)}
        </span>
      ))}
    </div>
  );
}

export function MyWorkDayPageView({ model }: MyWorkDayPageViewProps) {
  const {
    liveStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    rows,
    stats,
    requests,
    loading,
    error,
    requestBusy,
    absenceBusy,
    restartBusy,
    load,
    restartToday,
    submitRequest,
    cancelRequest,
    startAbsence,
    endAbsence,
  } = model;

  const { user } = useAuth();
  const displayName = useMemo(
    () => user?.firstName?.trim() || user?.lastName?.trim() || 'Коллега',
    [user?.firstName, user?.lastName]
  );

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [modalType, setModalType] = useState<WorkDayRequestType | null>(null);
  const [absenceModalOpen, setAbsenceModalOpen] = useState(false);

  const todayDay = liveStatus?.todayWorkDay;
  const todayOpen = todayDay?.status === 'OPEN';
  const hasOpenAbsence = Boolean(liveStatus?.hasOpenAbsence);
  const endSummary =
    todayDay && todayDay.status !== 'OPEN' && hasWorkDayViolations(todayDay)
      ? buildWorkDayEndSummary(displayName, todayDay)
      : null;

  // Кнопка старта дня прямо со страницы: нужна в том числе для работы в свой выходной,
  // когда виджет учёта при входе в админку не блокирует интерфейс.
  const trackedStatus = liveStatus?.tracked ? liveStatus : null;
  const startOffice = trackedStatus?.office ?? null;
  const startDayButton =
    trackedStatus && !todayDay && startOffice ? (
      <button
        type="button"
        className={cdChrome.contractsListHeaderAddBtn}
        disabled={restartBusy}
        title={
          trackedStatus.isWorkDayToday
            ? 'Отметить начало рабочего дня'
            : 'День будет отмечен как «работа в выходной»'
        }
        onClick={() => void restartToday(startOffice.id)}
      >
        {restartBusy ? 'Открытие…' : 'Начать рабочий день'}
      </button>
    ) : null;
  const dayOffWorkHint =
    trackedStatus && !todayDay ? (
      <p className={styles.todayNoticeNote}>
        Если выйти на работу, день будет отмечен как «работа в выходной».
      </p>
    ) : null;

  const openModal = (type: WorkDayRequestType) => {
    setModalType(type);
  };

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>Мой рабочий день</h1>
                <MyWorkDayRulesInfoTip />
              </div>
              <span
                className={`${cdHub.contractsListCount} ${styles.count}`}
                title={`${rows.length} записей`}
              >
                <span className={cdHub.contractsListCountDesktop}>{rows.length} записей</span>
                <span className={cdHub.contractsListCountMobile}>{rows.length}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить"
                aria-label={loading ? 'Обновление журнала' : 'Обновить журнал'}
                onClick={() => void load()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${styles.headerActions}`}>
          <button
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={requestBusy}
            onClick={() => openModal('DAY_OFF')}
          >
            Запросить выходной
          </button>
          <button
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={requestBusy}
            onClick={() => openModal('LATE_ARRIVAL')}
          >
            Прийти попозже
          </button>
          <button
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={requestBusy}
            onClick={() => openModal('EARLY_LEAVE')}
          >
            Уйти пораньше
          </button>
          {hasOpenAbsence ? (
            <button
              type="button"
              className={styles.returnBtn}
              disabled={absenceBusy || !todayOpen}
              title={!todayOpen ? 'Нужен открытый рабочий день' : 'Отметить возвращение в офис'}
              onClick={() => void endAbsence()}
            >
              {absenceBusy ? '…' : 'Вернуться'}
            </button>
          ) : (
            <button
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={absenceBusy || !todayOpen}
              title={!todayOpen ? 'Сначала начните рабочий день' : 'Отметить уход с офиса по делам'}
              onClick={() => setAbsenceModalOpen(true)}
            >
              Отлучиться
            </button>
          )}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить"
              aria-label={loading ? 'Обновление журнала' : 'Обновить журнал'}
              onClick={() => void load()}
            />
          </div>
        </div>
      </div>

      <div className={styles.ipHelpWrap}>
        <WorkDaysIpHelp variant="compact" />
      </div>

      {liveStatus?.tracked ? (
        <div className={styles.todayCard}>
          <h2 className={styles.todayTitle}>Сегодня</h2>
          {liveStatus.approvedDayOff ? (
            <div className={styles.todayFinished}>
              <div className={styles.todayFinishedInfo}>
                <p className={styles.todayText}>Согласованный выходной — явка не требуется.</p>
                {dayOffWorkHint}
              </div>
              {startDayButton}
            </div>
          ) : !liveStatus.isWorkDayToday ? (
            <div className={styles.todayFinished}>
              <div className={styles.todayFinishedInfo}>
                <p className={styles.todayText}>
                  Сегодня выходной по вашему графику — работать не обязательно.
                </p>
                {dayOffWorkHint}
              </div>
              {startDayButton}
            </div>
          ) : todayOpen ? (
            <p className={styles.todayText}>
              На работе с {formatWorkDayTime(todayDay.startedAt)}
              {hasOpenAbsence ? ' · сейчас по делам' : ''}
              {todayDay.lateMinutes > 0 ? ` · опоздание ${todayDay.lateMinutes} мин` : ''}
              {liveStatus.approvedLateArrival ? ' · поздний приход согласован' : ''}
              {liveStatus.approvedEarlyLeave ? ' · ранний уход согласован' : ''}
              {todayDay.isDayOffWork ? ' · работа в выходной' : ''}
            </p>
          ) : todayDay && todayDay.status !== 'OPEN' ? (
            <div className={styles.todayFinished}>
              <div className={styles.todayFinishedInfo}>
                <p className={styles.todayText}>
                  Рабочий день завершён: {formatWorkDayTime(todayDay.startedAt)}
                  {todayDay.endedAt ? ` — ${formatWorkDayTime(todayDay.endedAt)}` : ''}
                  {todayDay.isDayOffWork ? ' · работа в выходной' : ''}
                </p>
                {endSummary ? (
                  <div className={styles.todayNotices}>
                    {endSummary.lines.map((line) => (
                      <p key={line} className={styles.todayNotice}>
                        {line}
                      </p>
                    ))}
                    {endSummary.note ? (
                      <p className={styles.todayNoticeNote}>{endSummary.note}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {liveStatus.canRestartToday && liveStatus.office ? (
                <button
                  type="button"
                  className={cdChrome.contractsListHeaderAddBtn}
                  disabled={restartBusy}
                  title={
                    (liveStatus.remainingRestartsToday ?? 0) > 1
                      ? `Осталось перезапусков сегодня: ${liveStatus.remainingRestartsToday}`
                      : 'Последний доступный перезапуск рабочего дня сегодня'
                  }
                  onClick={() => void restartToday(liveStatus.office!.id)}
                >
                  {restartBusy ? 'Открытие…' : 'Продолжить рабочий день'}
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.todayFinished}>
              <div className={styles.todayFinishedInfo}>
                <p className={styles.todayText}>
                  Рабочий день ещё не начат. Отметьте начало при входе в админку или кнопкой справа.
                </p>
              </div>
              {startDayButton}
            </div>
          )}
        </div>
      ) : null}

      <div
        className={`${cdHub.contractsListFilters} ${styles.dateFilters} ${styles.toolbarSpaced}`}
      >
        <label className={`${cdHub.contractsListDateLabel} ${styles.dateLabel}`}>
          <span className={cdHub.contractsListDateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              `${cdHub.contractsListDateInput} ${styles.dateInput}`,
              Boolean(dateFrom),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={`${cdHub.contractsListDateLabel} ${styles.dateLabel}`}>
          <span className={cdHub.contractsListDateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              `${cdHub.contractsListDateInput} ${styles.dateInput}`,
              Boolean(dateTo),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата до"
          />
        </label>
      </div>

      {stats ? (
        <div className={styles.stats}>
          <span className={styles.statChip}>Рабочих дней: {stats.totalDays}</span>
          <span className={styles.statChip}>Опозданий: {stats.lateDays}</span>
          <span className={styles.statChip}>Ранних уходов: {stats.earlyLeaveDays}</span>
          <span className={styles.statChip}>Авто-закрытий: {stats.autoClosedDays}</span>
          <span className={styles.statChip}>
            По делам (суммарно): {stats.totalAbsenceMinutes} мин
          </span>
          {stats.approvedDayOffDays ? (
            <span className={styles.statChip}>
              Согласованных выходных: {stats.approvedDayOffDays}
            </span>
          ) : null}
          {stats.scheduleDayOffDays ? (
            <span className={styles.statChip}>Выходных по графику: {stats.scheduleDayOffDays}</span>
          ) : null}
          {stats.dayOffWorkDays ? (
            <span className={styles.statChip}>Работа в выходной: {stats.dayOffWorkDays}</span>
          ) : null}
          {stats.truancyDays ? (
            <span className={styles.statChip}>Прогулов: {stats.truancyDays}</span>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <section className={styles.requestsSection}>
        <h2 className={styles.sectionTitle}>Мои запросы</h2>
        {requests.length === 0 ? (
          <p className={styles.emptyHint}>Запросов за период нет</p>
        ) : (
          <ul className={styles.requestList}>
            {requests.map((req) => (
              <li key={req.id} className={styles.requestItem}>
                <div className={styles.requestMain}>
                  <strong>{REQUEST_TYPE_LABELS[req.type]}</strong>
                  <span>{formatWorkDayDate(req.requestDate)}</span>
                  {req.proposedEndTime ? (
                    <span>
                      {req.type === 'LATE_ARRIVAL' ? 'к' : 'до'} {req.proposedEndTime}
                    </span>
                  ) : null}
                  <span className={styles.requestStatus}>
                    {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>
                {req.comment ? <p className={styles.requestComment}>{req.comment}</p> : null}
                {req.status === 'PENDING' ? (
                  <button
                    type="button"
                    className={styles.requestCancelBtn}
                    disabled={requestBusy}
                    onClick={() => void cancelRequest(req.id)}
                  >
                    Отменить
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className={cdBase.paymentsTableWrap}>
        <table className={`${cdBase.paymentsTable} ${styles.desktopTable}`}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Офис</th>
              <th>Приход</th>
              <th>Уход</th>
              <th>Опозд.</th>
              <th>Ранний уход</th>
              <th>По делам</th>
              <th>Запросы</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9}>
                  <p className={styles.emptyHint}>Загрузка…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <p className={styles.emptyHint}>Нет записей за выбранный период</p>
                </td>
              </tr>
            ) : (
              rows.map((row) =>
                isWorkDayTruancyRow(row) ? (
                  <tr key={row.id} className={workDayRowClassName(row, styles)}>
                    <td>{formatWorkDayDate(row.workDate)}</td>
                    <td>{row.office?.name ?? '—'}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <RequestsCell row={row} />
                    </td>
                    <td>
                      <span className={styles.truancyBadge}>Прогул</span>
                    </td>
                  </tr>
                ) : isWorkDayDayOffRow(row) ? (
                  <tr key={row.id} className={workDayRowClassName(row, styles)}>
                    <td>{formatWorkDayDate(row.workDate)}</td>
                    <td>{row.office?.name ?? '—'}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                    <td>
                      <RequestsCell row={row} />
                    </td>
                    <td>Выходной</td>
                  </tr>
                ) : (
                  <tr key={row.id} className={workDayRowClassName(row, styles)}>
                    <td>{formatWorkDayDate(row.workDate)}</td>
                    <td>{row.office?.name ?? '—'}</td>
                    <td>{formatWorkDayTime(row.startedAt)}</td>
                    <td>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</td>
                    <td>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</td>
                    <td>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</td>
                    <td>
                      <AbsenceCell row={row} />
                    </td>
                    <td>
                      <RequestsCell row={row} />
                    </td>
                    <td>
                      <div className={styles.statusCell}>
                        <span>{workDayStatusLabel(row.status)}</span>
                        {row.isDayOffWork ? (
                          <span className={styles.dayOffWorkBadge}>Работа в выходной</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>

        <div className={styles.mobileCards} aria-label="Журнал рабочего дня">
          {loading ? (
            <p className={styles.emptyHint}>Загрузка…</p>
          ) : rows.length === 0 ? (
            <p className={styles.emptyHint}>Нет записей за выбранный период</p>
          ) : (
            rows.map((row) => {
              const tone = workDayRowClassName(row, styles);
              if (isWorkDayTruancyRow(row)) {
                return (
                  <article key={row.id} className={`${styles.mobileCard}${tone ? ` ${tone}` : ''}`}>
                    <div className={styles.mobileCardTop}>
                      <strong className={styles.mobileCardDate}>
                        {formatWorkDayDate(row.workDate)}
                      </strong>
                      <span className={styles.truancyBadge}>Прогул</span>
                    </div>
                    <dl className={styles.mobileCardRows}>
                      <div className={styles.mobileCardRow}>
                        <dt>Офис</dt>
                        <dd>{row.office?.name ?? '—'}</dd>
                      </div>
                      <div className={styles.mobileCardRow}>
                        <dt>Запросы</dt>
                        <dd>
                          <RequestsCell row={row} />
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              }
              if (isWorkDayDayOffRow(row)) {
                return (
                  <article key={row.id} className={`${styles.mobileCard}${tone ? ` ${tone}` : ''}`}>
                    <div className={styles.mobileCardTop}>
                      <strong className={styles.mobileCardDate}>
                        {formatWorkDayDate(row.workDate)}
                      </strong>
                      <span className={styles.mobileCardStatus}>Выходной</span>
                    </div>
                    <dl className={styles.mobileCardRows}>
                      <div className={styles.mobileCardRow}>
                        <dt>Офис</dt>
                        <dd>{row.office?.name ?? '—'}</dd>
                      </div>
                      <div className={styles.mobileCardRow}>
                        <dt>Запросы</dt>
                        <dd>
                          <RequestsCell row={row} />
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              }
              return (
                <article key={row.id} className={`${styles.mobileCard}${tone ? ` ${tone}` : ''}`}>
                  <div className={styles.mobileCardTop}>
                    <strong className={styles.mobileCardDate}>
                      {formatWorkDayDate(row.workDate)}
                    </strong>
                    <span className={styles.mobileCardStatusWrap}>
                      <span className={styles.mobileCardStatus}>
                        {workDayStatusLabel(row.status)}
                      </span>
                      {row.isDayOffWork ? (
                        <span className={styles.dayOffWorkBadge}>Работа в выходной</span>
                      ) : null}
                    </span>
                  </div>
                  <dl className={styles.mobileCardRows}>
                    <div className={styles.mobileCardRow}>
                      <dt>Офис</dt>
                      <dd>{row.office?.name ?? '—'}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>Приход</dt>
                      <dd>{formatWorkDayTime(row.startedAt)}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>Уход</dt>
                      <dd>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>Опоздание</dt>
                      <dd>{row.lateMinutes > 0 ? `${row.lateMinutes} мин` : '—'}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>Ранний уход</dt>
                      <dd>{row.earlyLeaveMinutes > 0 ? `${row.earlyLeaveMinutes} мин` : '—'}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>По делам</dt>
                      <dd>
                        <AbsenceCell row={row} />
                      </dd>
                    </div>
                    {(row.requests ?? []).length > 0 ? (
                      <div className={styles.mobileCardRow}>
                        <dt>Запросы</dt>
                        <dd>
                          <RequestsCell row={row} />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              );
            })
          )}
        </div>
      </div>

      <MyWorkDayRequestModal
        open={modalType != null}
        type={modalType}
        busy={requestBusy}
        todayIso={todayIso}
        onClose={() => setModalType(null)}
        onSubmit={submitRequest}
      />

      <MyWorkDayAbsenceModal
        open={absenceModalOpen}
        busy={absenceBusy}
        onClose={() => setAbsenceModalOpen(false)}
        onSubmit={startAbsence}
      />
    </div>
  );
}
