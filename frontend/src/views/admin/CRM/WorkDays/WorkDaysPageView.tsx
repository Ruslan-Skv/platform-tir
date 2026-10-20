'use client';

import { ShieldCheck } from 'lucide-react';

import { useState } from 'react';

import type {
  WorkDayExcuse,
  WorkDayJournalRow,
  WorkDayLeave,
} from '@/shared/api/crm/admin-work-days';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { contractsListFilterFieldClass } from '@/views/admin/ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { WorkDayExcuseModal } from './WorkDayExcuseModal';
import { WorkDayLeaveModal } from './WorkDayLeaveModal';
import styles from './WorkDaysPage.module.css';
import type { WorkDaysPageModel } from './hooks/useWorkDaysPage';
import {
  formatWorkDayAbsenceInterval,
  formatWorkDayDate,
  formatWorkDayTime,
  hasUnexcusedWorkDayViolations,
  hasWorkDayExcuse,
  isWorkDayDayOffRow,
  isWorkDayLeaveRow,
  isWorkDaySyntheticRow,
  isWorkDayTruancyRow,
  workDayAbsenceMinutes,
  workDayExcuseLabel,
  workDayLeaveLabel,
  workDayRequestBadgeLabel,
  workDayRowClassName,
  workDayStatusLabel,
  workDayUserName,
} from './work-days-display.utils';

type WorkDaysPageViewProps = {
  model: WorkDaysPageModel;
};

function AbsenceCell({ row }: { row: WorkDayJournalRow }) {
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

function leaveUserName(leave: WorkDayLeave): string {
  const user = leave.user;
  if (!user) return '—';
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ');
  return name || user.email;
}

function excuseUserName(excuse: WorkDayExcuse): string {
  const user = excuse.user;
  if (!user) return '—';
  const name = [user.lastName, user.firstName].filter(Boolean).join(' ');
  return name || user.email;
}

function LeaveTypeBadge({ type }: { type: 'VACATION' | 'SICK' }) {
  return (
    <span className={type === 'VACATION' ? styles.leaveBadgeVacation : styles.leaveBadgeSick}>
      {workDayLeaveLabel(type)}
    </span>
  );
}

/** Пометка «прощено» рядом с нарушением (видна только суперадмину). */
function ExcusedBadge({ comment }: { comment?: string | null }) {
  return (
    <span className={styles.excusedBadge} title={comment ? `Прощено: ${comment}` : 'Прощено'}>
      прощено
    </span>
  );
}

/** Ячейка «Опозд.» / «Ранний уход»: минуты + пометка, если нарушение прощено. */
function ViolationMinutesCell({
  row,
  minutes,
  kind,
}: {
  row: WorkDayJournalRow;
  minutes: number;
  kind: 'LATE' | 'EARLY_LEAVE';
}) {
  if (minutes <= 0) return <>—</>;
  const excused = hasWorkDayExcuse(row, kind);
  const badge = excused ? (
    <ExcusedBadge comment={(row.excuses ?? []).find((e) => e.kind === kind)?.comment} />
  ) : null;
  return (
    <span className={styles.statusCell}>
      <span>{minutes} мин</span>
      {badge}
    </span>
  );
}

function RowStatusCell({ row }: { row: WorkDayJournalRow }) {
  if (isWorkDayLeaveRow(row)) {
    return (
      <div className={styles.statusCell}>
        <LeaveTypeBadge type={row.leaveType} />
        {row.leaveComment ? (
          <span className={styles.leaveComment} title={row.leaveComment}>
            {row.leaveComment}
          </span>
        ) : null}
      </div>
    );
  }
  if (isWorkDayTruancyRow(row)) {
    return (
      <div className={styles.statusCell}>
        <span className={styles.truancyBadge}>Прогул</span>
        {hasWorkDayExcuse(row, 'TRUANCY') ? (
          <ExcusedBadge comment={(row.excuses ?? []).find((e) => e.kind === 'TRUANCY')?.comment} />
        ) : null}
      </div>
    );
  }
  if (isWorkDayDayOffRow(row)) {
    return <>Выходной</>;
  }
  return (
    <div className={styles.statusCell}>
      <span>{workDayStatusLabel(row.status)}</span>
      {row.status === 'AUTO_CLOSED' && hasWorkDayExcuse(row, 'AUTO_CLOSE') ? (
        <ExcusedBadge comment={(row.excuses ?? []).find((e) => e.kind === 'AUTO_CLOSE')?.comment} />
      ) : null}
      {row.isDayOffWork ? <span className={styles.dayOffWorkBadge}>Работа в выходной</span> : null}
    </div>
  );
}

export function WorkDaysPageView({ model }: WorkDaysPageViewProps) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    officeId,
    setOfficeId,
    rows,
    offices,
    trackedUsers,
    leaves,
    excuses,
    loading,
    deletingId,
    canDelete,
    canManageLeaves,
    canManageExcuses,
    savingLeave,
    deletingLeaveId,
    savingExcuse,
    deletingExcuseId,
    error,
    stats,
    load,
    handleDelete,
    handleCreateLeave,
    handleDeleteLeave,
    handleCreateExcuse,
    handleDeleteExcuse,
  } = model;

  const [deleteTarget, setDeleteTarget] = useState<WorkDayJournalRow | null>(null);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [deleteLeaveTarget, setDeleteLeaveTarget] = useState<WorkDayLeave | null>(null);
  const [excuseTarget, setExcuseTarget] = useState<WorkDayJournalRow | null>(null);
  const [deleteExcuseTarget, setDeleteExcuseTarget] = useState<WorkDayExcuse | null>(null);
  const colSpan = canDelete ? 11 : 10;
  const todayIso = new Date().toISOString().slice(0, 10);

  const refreshButton = (
    <AdminListRefreshButton
      disabled={loading}
      busy={loading}
      title="Обновить"
      aria-label={loading ? 'Обновление журнала' : 'Обновить журнал'}
      onClick={() => void load()}
    />
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>Журнал сотрудников</h1>
              </div>
              <span
                className={`${cdHub.contractsListCount} ${styles.count}`}
                title={`${rows.length} записей`}
              >
                <span className={cdHub.contractsListCountDesktop}>{rows.length} записей</span>
                <span className={cdHub.contractsListCountMobile}>{rows.length}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>{refreshButton}</div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${styles.headerActions}`}>
          {canManageLeaves ? (
            <button
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              onClick={() => setLeaveModalOpen(true)}
            >
              Отметить отпуск / больничный
            </button>
          ) : null}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>{refreshButton}</div>
        </div>
      </div>

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
        <label className={`${cdHub.contractsListDateLabel} ${styles.dateLabel}`}>
          <span className={cdHub.contractsListDateLabelText}>Офис</span>
          <select
            value={officeId}
            onChange={(e) => setOfficeId(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              cdHub.contractsListSelect,
              Boolean(officeId),
              cdHub.contractsListFilterActive
            )}
            aria-label="Офис"
          >
            <option value="">Все офисы</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.stats}>
        <span className={styles.statChip}>Опозданий: {stats.late}</span>
        <span className={styles.statChip}>Ранних уходов: {stats.early}</span>
        <span className={styles.statChip}>Авто-закрытий: {stats.auto}</span>
        {stats.dayOffs > 0 ? (
          <span className={styles.statChip}>Согласованных выходных: {stats.dayOffs}</span>
        ) : null}
        {stats.dayOffsBySchedule > 0 ? (
          <span className={styles.statChip}>Выходных по графику: {stats.dayOffsBySchedule}</span>
        ) : null}
        {stats.dayOffWork > 0 ? (
          <span className={styles.statChip}>Работа в выходной: {stats.dayOffWork}</span>
        ) : null}
        {stats.vacation > 0 ? (
          <span className={styles.statChip}>Дней отпуска: {stats.vacation}</span>
        ) : null}
        {stats.sick > 0 ? (
          <span className={styles.statChip}>Дней больничных: {stats.sick}</span>
        ) : null}
        {stats.truancy > 0 ? (
          <span className={styles.statChip}>Прогулов: {stats.truancy}</span>
        ) : null}
        {stats.excused > 0 ? (
          <span className={styles.statChip}>Прощённых нарушений: {stats.excused}</span>
        ) : null}
      </div>

      {canManageLeaves && leaves.length > 0 ? (
        <div className={styles.leaves}>
          {leaves.map((leave) => (
            <span key={leave.id} className={styles.leaveChip}>
              <LeaveTypeBadge type={leave.type} />
              <span className={styles.leaveChipName}>{leaveUserName(leave)}</span>
              <span className={styles.leaveChipDates}>
                {formatWorkDayDate(leave.dateFrom)} – {formatWorkDayDate(leave.dateTo)}
              </span>
              {leave.comment ? (
                <span className={styles.leaveChipComment} title={leave.comment}>
                  {leave.comment}
                </span>
              ) : null}
              <button
                data-admin-mutation
                type="button"
                className={styles.leaveChipDelete}
                disabled={deletingLeaveId === leave.id}
                title={deletingLeaveId === leave.id ? 'Удаление…' : 'Удалить отметку'}
                aria-label="Удалить отметку об отпуске/больничном"
                onClick={() => setDeleteLeaveTarget(leave)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {canManageExcuses && excuses.length > 0 ? (
        <div className={styles.leaves}>
          {excuses.map((excuse) => (
            <span key={excuse.id} className={styles.leaveChip}>
              <span className={styles.excusedBadge}>{workDayExcuseLabel(excuse.kind)}</span>
              <span className={styles.leaveChipName}>{excuseUserName(excuse)}</span>
              <span className={styles.leaveChipDates}>{formatWorkDayDate(excuse.workDate)}</span>
              {excuse.comment ? (
                <span className={styles.leaveChipComment} title={excuse.comment}>
                  {excuse.comment}
                </span>
              ) : null}
              <button
                data-admin-mutation
                type="button"
                className={styles.leaveChipDelete}
                disabled={deletingExcuseId === excuse.id}
                title={
                  deletingExcuseId === excuse.id ? 'Отмена…' : 'Отменить прощение (снова учитывать)'
                }
                aria-label="Отменить прощение нарушения"
                onClick={() => setDeleteExcuseTarget(excuse)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={cdBase.paymentsTableWrap}>
        <table className={`${cdBase.paymentsTable} ${styles.desktopTable}`}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Сотрудник</th>
              <th>Офис</th>
              <th>Приход</th>
              <th>Уход</th>
              <th>Опозд.</th>
              <th>Ранний уход</th>
              <th>По делам</th>
              <th>Запросы</th>
              <th>Статус</th>
              {canDelete ? <th className={styles.actionsCol} /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan}>
                  <p className={styles.emptyHint}>Загрузка…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>
                  <p className={styles.emptyHint}>Нет записей за выбранный период</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={workDayRowClassName(row, styles)}>
                  <td>{formatWorkDayDate(row.workDate)}</td>
                  <td>{workDayUserName(row)}</td>
                  <td>{row.office?.name ?? '—'}</td>
                  <td>{row.startedAt ? formatWorkDayTime(row.startedAt) : '—'}</td>
                  <td>{row.endedAt ? formatWorkDayTime(row.endedAt) : '—'}</td>
                  <td>
                    <ViolationMinutesCell row={row} minutes={row.lateMinutes} kind="LATE" />
                  </td>
                  <td>
                    <ViolationMinutesCell
                      row={row}
                      minutes={row.earlyLeaveMinutes}
                      kind="EARLY_LEAVE"
                    />
                  </td>
                  <td>
                    <AbsenceCell row={row} />
                  </td>
                  <td>
                    <RequestsCell row={row} />
                  </td>
                  <td>
                    <RowStatusCell row={row} />
                  </td>
                  {canDelete ? (
                    <td className={styles.actionsCol}>
                      <span className={styles.actionsButtons}>
                        {canManageExcuses && hasUnexcusedWorkDayViolations(row) ? (
                          <button
                            data-admin-mutation
                            type="button"
                            className={styles.iconExcuseButton}
                            disabled={savingExcuse}
                            title="Простить нарушение (не считать нарушением)"
                            aria-label="Простить нарушение"
                            onClick={() => setExcuseTarget(row)}
                          >
                            <ShieldCheck size={16} />
                          </button>
                        ) : null}
                        {isWorkDaySyntheticRow(row) ? null : (
                          <button
                            data-admin-mutation
                            type="button"
                            className={styles.iconDeleteButton}
                            disabled={deletingId === row.id}
                            title={deletingId === row.id ? 'Удаление…' : 'Удалить запись'}
                            aria-label={
                              deletingId === row.id ? 'Удаление…' : 'Удалить запись рабочего дня'
                            }
                            onClick={() => setDeleteTarget(row)}
                          >
                            <DeleteIcon size={16} tone="inherit" />
                          </button>
                        )}
                      </span>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={styles.mobileCards} aria-label="Журнал сотрудников">
          {loading ? (
            <p className={styles.emptyHint}>Загрузка…</p>
          ) : rows.length === 0 ? (
            <p className={styles.emptyHint}>Нет записей за выбранный период</p>
          ) : (
            rows.map((row) => {
              const tone = workDayRowClassName(row, styles);
              return (
                <article key={row.id} className={`${styles.mobileCard}${tone ? ` ${tone}` : ''}`}>
                  <div className={styles.mobileCardTop}>
                    <strong className={styles.mobileCardDate}>
                      {formatWorkDayDate(row.workDate)}
                    </strong>
                    <span className={styles.mobileCardStatusWrap}>
                      <RowStatusCell row={row} />
                      {canManageExcuses && hasUnexcusedWorkDayViolations(row) ? (
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.iconExcuseButton}
                          disabled={savingExcuse}
                          title="Простить нарушение (не считать нарушением)"
                          aria-label="Простить нарушение"
                          onClick={() => setExcuseTarget(row)}
                        >
                          <ShieldCheck size={16} />
                        </button>
                      ) : null}
                      {canDelete && !isWorkDaySyntheticRow(row) ? (
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.iconDeleteButton}
                          disabled={deletingId === row.id}
                          title={deletingId === row.id ? 'Удаление…' : 'Удалить запись'}
                          aria-label={
                            deletingId === row.id ? 'Удаление…' : 'Удалить запись рабочего дня'
                          }
                          onClick={() => setDeleteTarget(row)}
                        >
                          <DeleteIcon size={16} tone="inherit" />
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <dl className={styles.mobileCardRows}>
                    <div className={styles.mobileCardRow}>
                      <dt>Сотрудник</dt>
                      <dd>{workDayUserName(row)}</dd>
                    </div>
                    <div className={styles.mobileCardRow}>
                      <dt>Офис</dt>
                      <dd>{row.office?.name ?? '—'}</dd>
                    </div>
                    {row.startedAt ? (
                      <>
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
                          <dd>
                            <ViolationMinutesCell row={row} minutes={row.lateMinutes} kind="LATE" />
                          </dd>
                        </div>
                        <div className={styles.mobileCardRow}>
                          <dt>Ранний уход</dt>
                          <dd>
                            <ViolationMinutesCell
                              row={row}
                              minutes={row.earlyLeaveMinutes}
                              kind="EARLY_LEAVE"
                            />
                          </dd>
                        </div>
                        <div className={styles.mobileCardRow}>
                          <dt>По делам</dt>
                          <dd>
                            <AbsenceCell row={row} />
                          </dd>
                        </div>
                      </>
                    ) : null}
                    {isWorkDayLeaveRow(row) && row.leaveComment ? (
                      <div className={styles.mobileCardRow}>
                        <dt>Комментарий</dt>
                        <dd>{row.leaveComment}</dd>
                      </div>
                    ) : null}
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

      {deleteTarget && !isWorkDaySyntheticRow(deleteTarget) ? (
        <ConfirmModal
          isOpen
          title="Удалить запись рабочего дня?"
          message={`Запись «${workDayUserName(deleteTarget)}» за ${formatWorkDayDate(deleteTarget.workDate)} будет удалена без возможности восстановления. Она также исчезнет из журнала сотрудника.`}
          onConfirm={() => {
            const target = deleteTarget;
            setDeleteTarget(null);
            void handleDelete(target);
          }}
          onClose={() => setDeleteTarget(null)}
          confirmText={deletingId === deleteTarget.id ? 'Удаление…' : 'Удалить'}
          variant="danger"
        />
      ) : null}

      <WorkDayLeaveModal
        open={leaveModalOpen}
        busy={savingLeave}
        users={trackedUsers}
        todayIso={todayIso}
        onClose={() => setLeaveModalOpen(false)}
        onSubmit={handleCreateLeave}
      />

      <WorkDayExcuseModal
        target={excuseTarget}
        busy={savingExcuse}
        onClose={() => setExcuseTarget(null)}
        onSubmit={handleCreateExcuse}
      />

      {deleteLeaveTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить отметку об отпуске/больничном?"
          message={`Отметка «${leaveUserName(deleteLeaveTarget)} — ${workDayLeaveLabel(deleteLeaveTarget.type)} с ${formatWorkDayDate(deleteLeaveTarget.dateFrom)} по ${formatWorkDayDate(deleteLeaveTarget.dateTo)}» будет удалена. Дни периода снова будут учитываться по графику сотрудника.`}
          onConfirm={() => {
            const target = deleteLeaveTarget;
            setDeleteLeaveTarget(null);
            void handleDeleteLeave(target.id);
          }}
          onClose={() => setDeleteLeaveTarget(null)}
          confirmText={deletingLeaveId === deleteLeaveTarget.id ? 'Удаление…' : 'Удалить'}
          variant="danger"
        />
      ) : null}

      {deleteExcuseTarget ? (
        <ConfirmModal
          isOpen
          title="Отменить прощение нарушения?"
          message={`Нарушение «${workDayExcuseLabel(deleteExcuseTarget.kind)} — ${excuseUserName(deleteExcuseTarget)} за ${formatWorkDayDate(deleteExcuseTarget.workDate)}» снова будет считаться нарушением: удержание из оклада вернётся, а сотрудник увидит его в «Моём рабочем дне».`}
          onConfirm={() => {
            const target = deleteExcuseTarget;
            setDeleteExcuseTarget(null);
            void handleDeleteExcuse(target.id);
          }}
          onClose={() => setDeleteExcuseTarget(null)}
          confirmText={deletingExcuseId === deleteExcuseTarget.id ? 'Отмена…' : 'Отменить прощение'}
          variant="danger"
        />
      ) : null}
    </div>
  );
}
