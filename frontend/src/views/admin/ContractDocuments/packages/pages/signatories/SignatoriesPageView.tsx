'use client';

import { useEffect, useState } from 'react';

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

import { SignatoriesFormFields } from './SignatoriesFormFields';
import styles from './SignatoriesPage.module.css';
import type { SignatoriesPageModel } from './hooks/useSignatoriesPage';
import type { SignatoryRowView, SignatorySortKey } from './signatoriesConstants';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

const SORT_OPTIONS: { value: SignatorySortKey; label: string }[] = [
  { value: 'title_asc', label: 'А → Я' },
  { value: 'title_desc', label: 'Я → А' },
];

export function SignatoriesPageView(model: SignatoriesPageModel) {
  const {
    closeForm,
    confirmDelete,
    crmUserLabelById,
    crmUsers,
    deleteIndex,
    displayedRows,
    draft,
    editingIndex,
    formError,
    formOpen,
    handleUpsert,
    items,
    loading,
    message,
    openCreate,
    openEdit,
    refresh,
    saving,
    setDeleteIndex,
    setDraft,
    setMessage,
    setSignatorySort,
    signatorySort,
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

  const countTitle = `${items.length} карточек`;
  const iconsDisabled = loading || saving;
  const deleteItem = deleteIndex !== null ? items[deleteIndex] : null;

  const crmLabel = (crmUserId?: string) => {
    if (!crmUserId) return null;
    return crmUserLabelById.get(crmUserId) ?? crmUserId;
  };

  const rowActions = (row: SignatoryRowView) => (
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
      render: (row: SignatoryRowView) => row.item.title || '—',
    },
    {
      key: 'crmUser',
      title: 'Пользователь CRM',
      render: (row: SignatoryRowView) => {
        const label = crmLabel(row.item.crmUserId);
        return label ? label : <span className={styles.muted}>— не привязан —</span>;
      },
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (row: SignatoryRowView) => (
        <div>
          <div>{row.item.directorNameNominative || '—'}</div>
          {row.item.directorNameGenitive ? (
            <span className={styles.subline}>{row.item.directorNameGenitive}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'office',
      title: 'Офис',
      render: (row: SignatoryRowView) => (
        <div>
          <div>{row.item.salesOffice || '—'}</div>
          {row.item.officePhone ? (
            <span className={styles.subline}>{row.item.officePhone}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (row: SignatoryRowView) => rowActions(row),
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
        aria-label={loading ? 'Обновление списка менеджеров' : 'Обновить список менеджеров'}
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
                <h1 className={cdHub.title}>Менеджеры</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{items.length}</span>
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
            + Карточка
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
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Сортировка">
            <span className={cdHub.contractsListChipRowLabel}>Сортировка</span>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={loading}
                className={chipClass(signatorySort === opt.value)}
                onClick={() => setSignatorySort(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mobileCards} aria-label="Список менеджеров">
        {loading && displayedRows.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : displayedRows.length === 0 ? (
          <p className={styles.mobileEmpty}>Карточки менеджеров пока не добавлены</p>
        ) : (
          displayedRows.map((row) => (
            <article key={`${row.item.title}-${row.originalIndex}`} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{row.item.title || 'Без названия'}</span>
                  <span className={styles.mobileCardMeta}>
                    {row.item.directorNameNominative || 'Менеджер не указан'}
                  </span>
                </div>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>CRM</dt>
                  <dd>{crmLabel(row.item.crmUserId) || '— не привязан —'}</dd>
                </div>
                <div className={styles.mobileCardRow}>
                  <dt>Офис</dt>
                  <dd>
                    {row.item.salesOffice || '—'}
                    {row.item.officePhone ? ` · ${row.item.officePhone}` : ''}
                  </dd>
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
        emptyMessage="Карточки менеджеров пока не добавлены"
      />

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        title={
          editingIndex === null ? 'Добавить карточку менеджера' : 'Изменить карточку менеджера'
        }
        size="md"
      >
        <form
          data-modal-form
          onSubmit={(e) => {
            e.preventDefault();
            void handleUpsert();
          }}
        >
          <SignatoriesFormFields
            crmUsers={crmUsers}
            draft={draft}
            formError={formError}
            setDraft={setDraft}
          />
          <div data-modal-footer-info data-modal-tone="success" role="status">
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>
              Карточка используется в договорах и фильтре менеджера в замерах. Пользователь CRM
              обязателен.
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
        title="Удалить карточку"
        message={`Удалить карточку «${deleteItem?.title ?? ''}»?`}
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
