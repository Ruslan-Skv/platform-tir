'use client';

import { useEffect, useState } from 'react';

import type { ExecutorRequisiteProfile } from '@/shared/api/admin-contract-document-packages';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { DeleteIcon, EditIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { ExecutorProfilesFormFields } from './ExecutorProfilesFormFields';
import styles from './ExecutorProfilesPage.module.css';
import {
  type ExecutorKindFilter,
  type ExecutorProfileRowView,
  type ExecutorSortKey,
  executorKindLabel,
} from './executorProfilesConstants';
import type { ExecutorProfilesPageModel } from './hooks/useExecutorProfilesPage';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function kindBadgeClass(kind: ExecutorRequisiteProfile['kind'] | undefined): string {
  return kind === 'ENTREPRENEUR' ? styles.badgeEntrepreneur : styles.badgeCompany;
}

const KIND_OPTIONS: { value: ExecutorKindFilter; label: string }[] = [
  { value: 'ALL', label: 'Все' },
  { value: 'COMPANY', label: 'ЮЛ' },
  { value: 'ENTREPRENEUR', label: 'ИП' },
];

const SORT_OPTIONS: { value: ExecutorSortKey; label: string }[] = [
  { value: 'title_asc', label: 'А → Я' },
  { value: 'title_desc', label: 'Я → А' },
];

export function ExecutorProfilesPageView(model: ExecutorProfilesPageModel) {
  const {
    closeForm,
    confirmDelete,
    deleteIndex,
    displayedRows,
    draft,
    editingIndex,
    formError,
    formOpen,
    handleUpsert,
    items,
    kindCounts,
    kindFilter,
    loading,
    message,
    openCreate,
    openEdit,
    refresh,
    saving,
    setDeleteIndex,
    setDraft,
    setKindFilter,
    setMessage,
    setSortKey,
    sortKey,
  } = model;

  const [successVisible, setSuccessVisible] = useState(false);
  const [successText, setSuccessText] = useState('');

  useEffect(() => {
    if (!message) return;
    if (message.type === 'success') {
      setSuccessText(message.text);
      setSuccessVisible(true);
      const timer = window.setTimeout(() => setSuccessVisible(false), 2800);
      setMessage(null);
      return () => window.clearTimeout(timer);
    }
  }, [message, setMessage]);

  const countTitle =
    kindFilter === 'ALL'
      ? `${items.length} наборов`
      : `${displayedRows.length} из ${items.length} наборов`;
  const iconsDisabled = loading || saving;
  const deleteItem = deleteIndex !== null ? items[deleteIndex] : null;

  const rowActions = (row: ExecutorProfileRowView) => (
    <div className={styles.actions}>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Изменить"
        title="Изменить"
        onClick={() => openEdit(row.originalIndex)}
      >
        <EditIcon />
      </AdminTableIconButton>
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Удалить"
        title="Удалить"
        onClick={() => setDeleteIndex(row.originalIndex)}
      >
        <DeleteIcon />
      </AdminTableIconButton>
    </div>
  );

  const columns = [
    {
      key: 'title',
      title: 'Название',
      render: (row: ExecutorProfileRowView) => row.item.title || '—',
    },
    {
      key: 'kind',
      title: 'Тип',
      render: (row: ExecutorProfileRowView) => (
        <span className={`${styles.badge} ${kindBadgeClass(row.item.kind)}`}>
          {executorKindLabel(row.item.kind)}
        </span>
      ),
    },
    {
      key: 'company',
      title: 'Организация',
      render: (row: ExecutorProfileRowView) => (
        <div>
          <div>{row.item.companyName || '—'}</div>
          {row.item.email ? <span className={styles.subline}>{row.item.email}</span> : null}
        </div>
      ),
    },
    {
      key: 'inn',
      title: 'ИНН',
      render: (row: ExecutorProfileRowView) =>
        row.item.inn || <span className={styles.muted}>—</span>,
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (row: ExecutorProfileRowView) => rowActions(row),
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
        title="Обновить список"
        aria-label={loading ? 'Обновление списка реквизитов' : 'Обновить список реквизитов'}
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
                <h1 className={cdHub.title}>Исполнители</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{displayedRows.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={iconsDisabled}
            onClick={openCreate}
          >
            + Набор
          </button>
          {iconActions('desktop')}
        </div>
      </div>

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Тип исполнителя">
            <span className={cdHub.contractsListChipRowLabel}>Тип</span>
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={chipClass(kindFilter === opt.value)}
                onClick={() => setKindFilter(opt.value)}
              >
                {opt.label} ({kindCounts[opt.value]})
              </button>
            ))}
          </div>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Сортировка">
            <span className={cdHub.contractsListChipRowLabel}>Сортировка</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={chipClass(sortKey === opt.value)}
                onClick={() => setSortKey(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mobileCards} aria-label="Список реквизитов исполнителей">
        {loading && displayedRows.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : displayedRows.length === 0 ? (
          <p className={styles.mobileEmpty}>Наборы реквизитов пока не добавлены</p>
        ) : (
          displayedRows.map((row) => (
            <article key={`${row.item.title}-${row.originalIndex}`} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{row.item.title || 'Без названия'}</span>
                  <span className={styles.mobileCardMeta}>
                    {row.item.companyName || 'Организация не указана'}
                  </span>
                </div>
                <span className={`${styles.badge} ${kindBadgeClass(row.item.kind)}`}>
                  {executorKindLabel(row.item.kind)}
                </span>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>ИНН</dt>
                  <dd>{row.item.inn || '—'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>E-mail</dt>
                  <dd>{row.item.email || '—'}</dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>{rowActions(row)}</div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={displayedRows}
        columns={columns}
        keyExtractor={(row) => `${row.item.title}-${row.originalIndex}`}
        loading={loading}
        emptyMessage="Наборы реквизитов пока не добавлены"
      />

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={editingIndex === null ? 'Добавить набор реквизитов' : 'Изменить набор реквизитов'}
        size="lg"
      >
        <form
          data-modal-form
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpsert();
          }}
        >
          <ExecutorProfilesFormFields draft={draft} formError={formError} setDraft={setDraft} />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              Набор выбирается в договоре. Менеджера и офис настраивайте в разделе «Менеджеры».
            </span>
          </div>
          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={closeForm} disabled={saving}>
              Отмена
            </button>
            <button data-admin-mutation type="submit" data-modal-btn="primary" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteIndex !== null}
        onClose={() => setDeleteIndex(null)}
        title="Удалить набор"
        message={`Удалить набор «${deleteItem?.title ?? ''}»?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={saving}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
