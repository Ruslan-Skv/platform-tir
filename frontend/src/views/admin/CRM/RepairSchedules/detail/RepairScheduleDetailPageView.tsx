'use client';

import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/RepairSchedules.module.css';
import {
  ENTRY_KIND_LABELS,
  REPAIR_STATUS_LABELS,
  formatDate,
  formatMoney,
} from '../shared/repair-schedules';
import type { RepairScheduleDetailPageModel } from './hooks/useRepairScheduleDetailPage';

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

  const entries = project.entries ?? [];

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
              <dt>Планируемое начало работ</dt>
              <dd>{formatDate(project.plannedStartDate)}</dd>
            </div>
            <div>
              <dt>Примечание</dt>
              <dd>{project.note || '—'}</dd>
            </div>
          </dl>
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
            <div data-modal-form-group style={{ gridColumn: '1 / -1' }}>
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

          {entries.length === 0 ? (
            <p className={styles.subline}>Записей пока нет — добавьте еженедельный статус.</p>
          ) : (
            <ul className={styles.timelineList}>
              {entries.map((entry) => (
                <li key={entry.id} className={styles.timelineItem}>
                  <div className={styles.timelineDate}>{formatDate(entry.date)}</div>
                  <div className={styles.timelineBody}>
                    <span className={styles.timelineKind}>{ENTRY_KIND_LABELS[entry.kind]}</span>
                    <p className={styles.timelineText}>{entry.text}</p>
                    <div className={styles.timelineMeta}>
                      {entry.createdBy
                        ? [entry.createdBy.firstName, entry.createdBy.lastName]
                            .filter(Boolean)
                            .join(' ') || entry.createdBy.email
                        : null}
                      <AdminTableIconButton
                        data-admin-mutation
                        aria-label="Удалить запись"
                        title="Удалить запись"
                        onClick={() => void removeEntry(entry.id)}
                      >
                        <DeleteIcon />
                      </AdminTableIconButton>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
