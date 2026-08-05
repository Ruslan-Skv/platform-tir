'use client';

import { useMemo } from 'react';

import type {
  RepairContractTimelineEvent,
  RepairScheduleEntry,
} from '@/shared/api/crm/admin-repair-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { RepairDeadlineWarningBadge } from '../shared/RepairDeadlineWarningBadge';
import styles from '../shared/RepairSchedules.module.css';
import {
  ADDENDUM_STATUS_LABELS,
  CONTRACT_EVENT_LABELS,
  ENTRY_KIND_LABELS,
  REPAIR_STATUS_LABELS,
  formatDate,
  formatMoney,
} from '../shared/repair-schedules';
import type { RepairScheduleDetailPageModel } from './hooks/useRepairScheduleDetailPage';

type TimelineRow =
  | { key: string; date: string; sort: string; type: 'entry'; entry: RepairScheduleEntry }
  | {
      key: string;
      date: string;
      sort: string;
      type: 'contract';
      event: RepairContractTimelineEvent;
    };

function isoSortKey(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : date.slice(0, 10);
}

export function RepairScheduleDetailPageView({ model }: { model: RepairScheduleDetailPageModel }) {
  const {
    project,
    loading,
    message,
    setMessage,
    submitting,
    entryDate,
    setEntryDate,
    entryKind,
    setEntryKind,
    entryText,
    setEntryText,
    refresh,
    addEntry,
    removeEntry,
    moveStatus,
    back,
  } = model;

  const timelineRows = useMemo((): TimelineRow[] => {
    if (!project) return [];
    const rows: TimelineRow[] = [];
    for (const entry of project.entries ?? []) {
      rows.push({
        key: `entry:${entry.id}`,
        date: entry.date,
        sort: isoSortKey(entry.date),
        type: 'entry',
        entry,
      });
    }
    for (const event of project.contractTimelineEvents ?? []) {
      rows.push({
        key: event.id,
        date: event.date,
        sort: isoSortKey(event.date),
        type: 'contract',
        event,
      });
    }
    rows.sort((a, b) => {
      if (a.sort === b.sort) return a.key < b.key ? 1 : -1;
      return a.sort < b.sort ? 1 : -1;
    });
    return rows;
  }, [project]);

  if (loading && !project) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide}`}>
        <p>Загрузка…</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={`${cdBase.page} ${cdWorkspace.pageWide}`}>
        <p>{message || 'Проект не найден'}</p>
        <button type="button" onClick={back}>
          К списку
        </button>
      </div>
    );
  }

  const addendums = project.addendums ?? [];

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>{project.contractNumber || 'Проект ремонта'}</h1>
              </div>
              <span className={`${styles.badge} ${styles[`badge${project.status}`]}`}>
                {REPAIR_STATUS_LABELS[project.status]}
              </span>
              {project.syncedFromPackage ? (
                <span className={styles.syncBadge} title="Срок, акты и Д/с подтягиваются из пакета">
                  Из пакета
                </span>
              ) : null}
              <RepairDeadlineWarningBadge
                level={project.deadlineWarning}
                daysLeft={project.deadlineDaysLeft}
              />
              {project.stale ? (
                <span className={styles.stale}>Нет записи &gt; {project.staleDays} дн.</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button type="button" data-modal-btn="secondary" onClick={back}>
            К списку
          </button>
          {project.status === 'NEW' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={submitting}
              onClick={() => void moveStatus('IN_PROGRESS')}
            >
              В работу
            </button>
          ) : null}
          {project.status === 'IN_PROGRESS' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={submitting}
              onClick={() => void moveStatus('CLOSED')}
            >
              Закрыть
            </button>
          ) : null}
          {project.status === 'CLOSED' ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={submitting}
              onClick={() => void moveStatus('IN_PROGRESS')}
            >
              Вернуть в работу
            </button>
          ) : null}
          <AdminListRefreshButton
            disabled={loading || submitting}
            busy={loading}
            title="Обновить"
            aria-label="Обновить"
            onClick={() => void refresh()}
          />
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

      <div className={styles.detailGrid}>
        <aside className={styles.passport}>
          <h2 className={styles.passportTitle}>Паспорт</h2>
          <dl className={styles.passportRows}>
            <div>
              <dt>Договор</dt>
              <dd>{project.contractNumber || '—'}</dd>
            </div>
            <div>
              <dt>Объём</dt>
              <dd>{project.workScope || '—'}</dd>
            </div>
            <div>
              <dt>Мастер</dt>
              <dd>{project.installerName || '—'}</dd>
            </div>
            <div>
              <dt>Заказчик</dt>
              <dd>{project.customerName || '—'}</dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{project.customerAddress || '—'}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{project.customerPhone || '—'}</dd>
            </div>
            <div>
              <dt>Стоимость договора</dt>
              <dd>{formatMoney(project.contractSum)}</dd>
            </div>
            <div>
              <dt>Предоплата по договору</dt>
              <dd>{formatMoney(project.payoutSum)}</dd>
            </div>
            <div>
              <dt>Срок договора</dt>
              <dd>
                {project.workPeriodDays != null ? `${project.workPeriodDays} раб. дн.` : '—'}
                {project.effectiveWorkPeriodDays != null &&
                project.workPeriodDays != null &&
                project.effectiveWorkPeriodDays !== project.workPeriodDays
                  ? ` → ${project.effectiveWorkPeriodDays} с учётом Д/с`
                  : null}
              </dd>
            </div>
            <div>
              <dt>Акт начала работ</dt>
              <dd>{formatDate(project.workStartActDate)}</dd>
            </div>
            <div>
              <dt>Расчётный срок окончания</dt>
              <dd>
                {formatDate(project.calculatedEndDate)}
                {project.deadlineWarning ? (
                  <>
                    {' '}
                    <RepairDeadlineWarningBadge
                      level={project.deadlineWarning}
                      daysLeft={project.deadlineDaysLeft}
                    />
                  </>
                ) : null}
              </dd>
            </div>
            {project.calculatedEndDateBase &&
            project.calculatedEndDateBase !== project.calculatedEndDate ? (
              <div>
                <dt>Срок без Д/с</dt>
                <dd>{formatDate(project.calculatedEndDateBase)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Акт сдачи-приёмки</dt>
              <dd>{formatDate(project.workCloseActDate)}</dd>
            </div>
            <div>
              <dt>Планируемое начало</dt>
              <dd>{formatDate(project.plannedStartDate)}</dd>
            </div>
            <div>
              <dt>Примечание</dt>
              <dd>{project.note || '—'}</dd>
            </div>
          </dl>

          {addendums.length > 0 ? (
            <div className={styles.addendumBlock}>
              <h3 className={styles.addendumTitle}>Доп. соглашения</h3>
              <ul className={styles.addendumList}>
                {addendums.map((item) => (
                  <li key={item.number}>
                    <strong>Д/с №{item.number}</strong>
                    <span>
                      {ADDENDUM_STATUS_LABELS[item.status] || item.status}
                      {item.documentDate ? ` · ${item.documentDate}` : ''}
                    </span>
                    {item.workPeriodChangeDays != null ? (
                      <span className={styles.subline}>
                        {item.workPeriodChangeDays > 0 ? '+' : ''}
                        {item.workPeriodChangeDays} раб. дн. к сроку
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <section className={styles.timeline}>
          <h2 className={styles.timelineTitle}>Таймлайн</h2>
          <div className={styles.timelineForm} data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="rs-entry-date">Дата</label>
              <input
                id="rs-entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="rs-entry-kind">Тип</label>
              <select
                id="rs-entry-kind"
                value={entryKind}
                onChange={(e) => setEntryKind(e.target.value as typeof entryKind)}
              >
                {(
                  Object.entries(ENTRY_KIND_LABELS) as Array<
                    [keyof typeof ENTRY_KIND_LABELS, string]
                  >
                ).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div data-modal-form-group className={styles.createFormSpan}>
              <label htmlFor="rs-entry-text">Запись динамики</label>
              <textarea
                id="rs-entry-text"
                rows={3}
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Например: работают, материал закупают, акт подписан…"
              />
            </div>
            <div>
              <button
                data-admin-mutation
                type="button"
                data-modal-btn="primary"
                disabled={submitting}
                onClick={() => void addEntry()}
              >
                {submitting ? 'Сохранение…' : 'Добавить запись'}
              </button>
            </div>
          </div>

          {timelineRows.length === 0 ? (
            <p className={styles.subline}>
              Записей пока нет — добавьте еженедельный статус или привяжите пакет с актами/Д/с.
            </p>
          ) : (
            <ul className={styles.timelineList}>
              {timelineRows.map((row) =>
                row.type === 'contract' ? (
                  <li
                    key={row.key}
                    className={`${styles.timelineItem} ${styles.timelineItemContract}`}
                  >
                    <div className={styles.timelineDate}>{formatDate(row.date)}</div>
                    <div className={styles.timelineBody}>
                      <span className={`${styles.timelineKind} ${styles.timelineKindContract}`}>
                        {CONTRACT_EVENT_LABELS[row.event.eventType]}
                      </span>
                      <p className={styles.timelineText}>{row.event.text}</p>
                      {project.syncedFromPackage ? (
                        <div className={styles.timelineMeta}>из пакета документов</div>
                      ) : null}
                    </div>
                  </li>
                ) : (
                  <li key={row.key} className={styles.timelineItem}>
                    <div className={styles.timelineDate}>{formatDate(row.date)}</div>
                    <div className={styles.timelineBody}>
                      <span className={styles.timelineKind}>
                        {ENTRY_KIND_LABELS[row.entry.kind]}
                      </span>
                      <p className={styles.timelineText}>{row.entry.text}</p>
                      <div className={styles.timelineMeta}>
                        {row.entry.createdBy
                          ? [row.entry.createdBy.firstName, row.entry.createdBy.lastName]
                              .filter(Boolean)
                              .join(' ') || row.entry.createdBy.email
                          : null}
                        <AdminTableIconButton
                          data-admin-mutation
                          aria-label="Удалить запись"
                          title="Удалить запись"
                          onClick={() => void removeEntry(row.entry.id)}
                        >
                          <DeleteIcon />
                        </AdminTableIconButton>
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
