'use client';

import { useEffect, useState } from 'react';

import type { RepairScheduleProject } from '@/shared/api/crm/admin-repair-schedules';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon, EditIcon, PublishIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/RepairSchedules.module.css';
import { REPAIR_STATUS_LABELS, formatDate, formatMoney } from '../shared/repair-schedules';
import { RepairProjectForm } from './RepairProjectForm';
import { RepairScheduleImportModal } from './RepairScheduleImportModal';
import type { RepairSchedulesPageModel } from './hooks/useRepairSchedulesPage';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function searchFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
}

export function RepairSchedulesPageView({ model }: { model: RepairSchedulesPageModel }) {
  const {
    statusFilter,
    setStatusFilter,
    staleOnly,
    setStaleOnly,
    search,
    setSearch,
    items,
    repairInstallers,
    loading,
    message,
    setMessage,
    createOpen,
    setCreateOpen,
    importOpen,
    setImportOpen,
    deleteItem,
    setDeleteItem,
    formValues,
    setFormValues,
    formError,
    submitting,
    statusCounts,
    refresh,
    openCreate,
    saveCreate,
    moveStatus,
    remove,
    openProject,
  } = model;

  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    // errors stay in banner; successes flashed separately via wrap
  }, [message]);

  const flashSuccess = (text: string) => {
    setSuccessText(text);
    setSuccessVisible(true);
    window.setTimeout(() => setSuccessVisible(false), 2800);
  };

  const countTitle =
    statusFilter === 'ALL' ? `${items.length} проектов` : `${items.length} в выборке`;

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
      key: 'installer',
      title: 'Мастер',
      render: (item: RepairScheduleProject) => item.installerName || '—',
    },
    {
      key: 'customer',
      title: 'Заказчик / адрес',
      render: (item: RepairScheduleProject) => (
        <div className={styles.cellMain}>
          <div>{item.customerName || '—'}</div>
          {item.customerAddress ? (
            <span className={styles.subline}>{item.customerAddress}</span>
          ) : null}
        </div>
      ),
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
      title: 'Действия',
      render: (item: RepairScheduleProject) => (
        <div className={styles.actions}>
          <AdminTableIconButton
            aria-label="Открыть"
            title="Открыть карточку"
            onClick={() => openProject(item.id)}
          >
            <EditIcon />
          </AdminTableIconButton>
          {item.status === 'NEW' ? (
            <AdminTableIconButton
              data-admin-mutation
              aria-label="В работу"
              title="Перевести в работу"
              onClick={() => {
                void moveStatus(item, 'IN_PROGRESS').then((ok) => {
                  if (ok) flashSuccess('Проект в работе');
                });
              }}
            >
              <PublishIcon />
            </AdminTableIconButton>
          ) : null}
          {item.status === 'IN_PROGRESS' ? (
            <AdminTableIconButton
              data-admin-mutation
              aria-label="Закрыть"
              title="Закрыть договор"
              onClick={() => {
                void moveStatus(item, 'CLOSED').then((ok) => {
                  if (ok) flashSuccess('Договор закрыт');
                });
              }}
            >
              <PublishIcon />
            </AdminTableIconButton>
          ) : null}
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Удалить"
            title="Удалить"
            onClick={() => setDeleteItem(item)}
          >
            <DeleteIcon />
          </AdminTableIconButton>
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
                <h1 className={cdHub.title}>План-график ремонта</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{items.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
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
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={() => setImportOpen(true)}
          >
            Импорт
          </button>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={openCreate}
          >
            + Проект
          </button>
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
              Все
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
                  {REPAIR_STATUS_LABELS[key]}
                  {statusFilter === 'ALL' || statusFilter === key ? ` (${statusCounts[key]})` : ''}
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
              placeholder="Поиск по номеру договора, ФИО заказчика, адресу..."
              aria-label="Поиск по номеру договора, ФИО заказчика, адресу"
            />
            <label className={styles.staleToggle}>
              <input
                type="checkbox"
                checked={staleOnly}
                onChange={(e) => setStaleOnly(e.target.checked)}
              />
              Только без записи &gt; 7 дн.
              {statusFilter === 'IN_PROGRESS' || statusFilter === 'ALL'
                ? ` (${statusCounts.STALE})`
                : ''}
            </label>
          </div>
        </div>
      </div>

      <div className={styles.mobileCards} aria-label="Проекты ремонта">
        {loading && items.length === 0 ? (
          <p>Загрузка…</p>
        ) : items.length === 0 ? (
          <p>Проектов нет</p>
        ) : (
          items.map((item) => (
            <article key={item.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div>
                  <div className={styles.mobileCardName}>{item.contractNumber || 'Без номера'}</div>
                  <div className={styles.mobileCardMeta}>
                    {item.installerName || 'Без мастера'}
                    {item.workScope ? ` · ${item.workScope}` : ''}
                  </div>
                </div>
                <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
                  {REPAIR_STATUS_LABELS[item.status]}
                </span>
              </div>
              {item.latestEntry ? (
                <div className={styles.mobileCardMeta}>
                  {formatDate(item.latestEntry.date)}: {item.latestEntry.text.slice(0, 100)}
                </div>
              ) : null}
              {item.stale ? (
                <div className={styles.stale}>Нет записи &gt; {item.staleDays} дн.</div>
              ) : null}
              <div className={styles.mobileCardActions}>
                <AdminTableIconButton
                  aria-label="Открыть"
                  title="Открыть"
                  onClick={() => openProject(item.id)}
                >
                  <EditIcon />
                </AdminTableIconButton>
              </div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Проектов нет"
      />

      <RepairScheduleImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(res) => {
          flashSuccess(`Импорт: +${res.created} / ~${res.updated}, записей ${res.entriesUpserted}`);
          void refresh();
        }}
      />

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Новый проект ремонта"
        size="md"
      >
        <form
          data-modal-form
          data-modal-density="compact"
          onSubmit={(e) => {
            e.preventDefault();
            void saveCreate().then((ok) => {
              if (ok) flashSuccess('Проект создан');
            });
          }}
        >
          <RepairProjectForm
            values={formValues}
            onChange={setFormValues}
            installers={repairInstallers}
            error={formError}
          />
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setCreateOpen(false)}>
              Отмена
            </button>
            <button
              data-admin-mutation
              type="submit"
              data-modal-btn="primary"
              disabled={submitting}
            >
              {submitting ? 'Сохранение…' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleteItem)}
        onClose={() => setDeleteItem(null)}
        title="Удалить проект"
        message={`Удалить проект ${deleteItem?.contractNumber ?? ''}? Таймлайн тоже будет удалён.`}
        confirmText={submitting ? 'Удаление…' : 'Удалить'}
        cancelText="Отмена"
        variant="danger"
        onConfirm={() => {
          void remove().then((ok) => {
            if (ok) flashSuccess('Проект удалён');
          });
        }}
      />
    </div>
  );
}
