'use client';

import type { RepairScheduleProject } from '@/shared/api/crm/admin-repair-schedules';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { EditIcon, PublishIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/RepairSchedules.module.css';
import { REPAIR_STATUS_LABELS, formatDate, formatMoney } from '../shared/repair-schedules';
import type { MyRepairSchedulesPageModel } from './hooks/useMyRepairSchedulesPage';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function searchFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
}

export function MyRepairSchedulesPageView({ model }: { model: MyRepairSchedulesPageModel }) {
  const {
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    items,
    allCount,
    loading,
    message,
    setMessage,
    statusCounts,
    entryProject,
    setEntryProject,
    entryDate,
    setEntryDate,
    entryText,
    setEntryText,
    submitting,
    refresh,
    openEntry,
    submitEntry,
    openProject,
  } = model;

  const countTitle =
    statusFilter === 'ALL' ? `${allCount} проектов` : `${items.length} из ${allCount}`;
  const iconsDisabled = loading || submitting;

  const columns = [
    {
      key: 'contract',
      title: 'Договор',
      render: (item: RepairScheduleProject) => (
        <button type="button" className={styles.cellMain} onClick={() => openProject(item.id)}>
          <strong>{item.contractNumber || 'Без номера'}</strong>
          {item.workScope ? <span className={styles.subline}>{item.workScope}</span> : null}
        </button>
      ),
    },
    {
      key: 'customer',
      title: 'Адрес',
      render: (item: RepairScheduleProject) => item.customerAddress || '—',
    },
    {
      key: 'sum',
      title: 'Стоимость',
      render: (item: RepairScheduleProject) => formatMoney(item.contractSum),
    },
    {
      key: 'latest',
      title: 'Последняя запись',
      render: (item: RepairScheduleProject) => (
        <div className={styles.cellMain}>
          {item.latestEntry ? (
            <>
              <div>{formatDate(item.latestEntry.date)}</div>
              <span className={styles.subline}>{item.latestEntry.text.slice(0, 80)}</span>
            </>
          ) : (
            '—'
          )}
          {item.stale ? (
            <div className={styles.stale}>Нет записи &gt; {item.staleDays} дн.</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: RepairScheduleProject) => (
        <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
          {REPAIR_STATUS_LABELS[item.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      render: (item: RepairScheduleProject) => (
        <div className={styles.actions}>
          <AdminTableIconButton
            type="button"
            aria-label="Открыть"
            title="Открыть"
            onClick={() => openProject(item.id)}
          >
            <EditIcon />
          </AdminTableIconButton>
          {item.status !== 'CLOSED' ? (
            <AdminTableIconButton
              data-admin-mutation
              type="button"
              aria-label="Добавить запись"
              title="Добавить запись"
              onClick={() => openEntry(item)}
            >
              <PublishIcon />
            </AdminTableIconButton>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Мои ремонты</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{items.length}</span>
              </span>
              <AdminSaveNotice visible={Boolean(message && !message.includes('Не'))}>
                {message}
              </AdminSaveNotice>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={iconsDisabled}
                busy={loading}
                title="Обновить"
                aria-label="Обновить"
                onClick={() => void refresh()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={iconsDisabled}
              busy={loading}
              title="Обновить"
              aria-label="Обновить"
              onClick={() => void refresh()}
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

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
            <span className={cdHub.contractsListChipRowLabel}>Статус</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(statusFilter === 'ALL')}
              onClick={() => setStatusFilter('ALL')}
            >
              Все ({statusCounts.ALL})
            </button>
            {(Object.keys(REPAIR_STATUS_LABELS) as Array<keyof typeof REPAIR_STATUS_LABELS>).map(
              (key) => (
                <button
                  key={key}
                  type="button"
                  disabled={loading}
                  className={chipClass(statusFilter === key)}
                  onClick={() => setStatusFilter(key)}
                >
                  {REPAIR_STATUS_LABELS[key]} ({statusCounts[key]})
                </button>
              )
            )}
          </div>
          <div className={cdHub.contractsListFilters}>
            <input
              type="search"
              className={searchFieldClass(
                cdHub.contractsListSearchInput,
                Boolean(search.trim()),
                cdHub.contractsListFilterActive
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
              placeholder="Поиск по номеру договора, адресу..."
              aria-label="Поиск"
            />
          </div>
        </div>
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Нет проектов, назначенных на ваш аккаунт. Попросите привязать мастера к пользователю в справочнике."
      />

      <Modal
        isOpen={Boolean(entryProject)}
        onClose={() => setEntryProject(null)}
        title="Запись динамики"
        size="sm"
      >
        <form
          data-modal-form
          data-modal-density="compact"
          onSubmit={(e) => {
            e.preventDefault();
            void submitEntry();
          }}
        >
          <p data-modal-form-hint className={styles.formHintFlush}>
            {entryProject?.contractNumber || 'Проект'} · {entryProject?.customerAddress || '—'}
          </p>
          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="my-rs-date">Дата</label>
              <input
                id="my-rs-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </div>
            <div data-modal-form-group className={styles.createFormSpan}>
              <label htmlFor="my-rs-text">Что сделано / статус</label>
              <input
                id="my-rs-text"
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="работают, материал, акт…"
              />
            </div>
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setEntryProject(null)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="submit"
              data-modal-btn="primary"
              disabled={submitting}
            >
              {submitting ? 'Сохранение…' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
