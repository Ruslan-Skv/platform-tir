'use client';

import { useEffect, useMemo, useState } from 'react';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from '../shared/RepairSchedules.module.css';
import { REPAIR_STATUS_LABELS } from '../shared/repair-schedules';
import { buildRepairObjectGroups } from '../shared/repairObjectGroups';
import { RepairProjectForm } from './RepairProjectForm';
import { RepairScheduleImportModal } from './RepairScheduleImportModal';
import { RepairSchedulesGanttTimeline } from './RepairSchedulesGanttTimeline';
import { RepairSchedulesGroupedList } from './RepairSchedulesGroupedList';
import { RepairSchedulesRulesInfoTip } from './RepairSchedulesRulesInfoTip';
import type {
  RepairDeadlineFilter,
  RepairSchedulesPageModel,
} from './hooks/useRepairSchedulesPage';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function searchFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
}

const DEADLINE_FILTERS: Array<{ key: RepairDeadlineFilter; label: string }> = [
  { key: 'ALL', label: 'Все' },
  { key: 'LE20', label: '≤20 дн.' },
  { key: 'LE10', label: '≤10 дн.' },
  { key: 'LE3', label: '≤3 дн.' },
  { key: 'OVERDUE', label: 'Просрочен' },
];

export function RepairSchedulesPageView({ model }: { model: RepairSchedulesPageModel }) {
  const {
    statusFilter,
    setStatusFilter,
    deadlineFilter,
    setDeadlineFilter,
    viewMode,
    setViewMode,
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
    deadlineCounts,
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
  }, [message]);

  const flashSuccess = (text: string) => {
    setSuccessText(text);
    setSuccessVisible(true);
    window.setTimeout(() => setSuccessVisible(false), 2800);
  };

  const objectGroups = useMemo(() => buildRepairObjectGroups(items), [items]);
  const clusterCount = objectGroups.filter((g) => g.isCluster).length;
  const countTitle =
    clusterCount > 0
      ? `${items.length} договоров · ${objectGroups.length} объектов`
      : statusFilter === 'ALL'
        ? `${items.length} проектов`
        : `${items.length} в выборке`;

  const iconsDisabled = loading || submitting;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>План-график ремонта</h1>
                <RepairSchedulesRulesInfoTip />
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

      <div className={styles.viewModeRow} role="group" aria-label="Режим отображения">
        <button
          type="button"
          className={`${styles.viewModeBtn}${viewMode === 'list' ? ` ${styles.viewModeBtnActive}` : ''}`}
          onClick={() => setViewMode('list')}
        >
          Список
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn}${viewMode === 'timeline' ? ` ${styles.viewModeBtnActive}` : ''}`}
          onClick={() => setViewMode('timeline')}
        >
          Таймлайн
        </button>
      </div>

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
            <span className={cdHub.contractsListChipRowLabel}>Статус</span>
            <button
              type="button"
              disabled={loading || viewMode === 'timeline'}
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
                  disabled={loading || (viewMode === 'timeline' && key !== 'IN_PROGRESS')}
                  className={chipClass(statusFilter === key)}
                  onClick={() => setStatusFilter(key)}
                >
                  {REPAIR_STATUS_LABELS[key]} ({statusCounts[key]})
                </button>
              )
            )}
          </div>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Срок окончания">
            <span className={cdHub.contractsListChipRowLabel}>Срок</span>
            {DEADLINE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                disabled={loading}
                className={chipClass(deadlineFilter === key)}
                onClick={() => setDeadlineFilter(key)}
              >
                {label}
                {key !== 'ALL' ? ` (${deadlineCounts[key]})` : ''}
              </button>
            ))}
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

      <div className={styles.viewPanels}>
        <div
          className={`${styles.viewPanel}${viewMode === 'timeline' ? ` ${styles.viewPanelActive}` : ''}`}
          aria-hidden={viewMode !== 'timeline'}
        >
          <RepairSchedulesGanttTimeline
            items={items}
            loading={loading}
            onOpenProject={openProject}
          />
        </div>
        <div
          className={`${styles.viewPanel}${viewMode === 'list' ? ` ${styles.viewPanelActive}` : ''}`}
          aria-hidden={viewMode !== 'list'}
        >
          <RepairSchedulesGroupedList
            items={items}
            loading={loading}
            submitting={submitting}
            openProject={openProject}
            moveStatus={moveStatus}
            onDelete={setDeleteItem}
            flashSuccess={flashSuccess}
          />
        </div>
      </div>

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
        size="lg"
        showCloseButton
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
