'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './PackageSettingsPage.module.css';
import type { PackageSettingsPageModel, WorkPeriodRow } from './hooks/usePackageSettingsPage';

function formatUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) return '—';
  return new Date(updatedAt).toLocaleString('ru-RU');
}

export function PackageSettingsPageView(model: PackageSettingsPageModel) {
  const {
    applyingAll,
    busy,
    confirmState,
    handleConfirmModal,
    handleDismissAfterSave,
    isSuperAdmin,
    loading,
    message,
    parsedByKind,
    refresh,
    rows,
    saveDefault,
    savingKind,
    setDaysInput,
    setMessage,
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

  const countTitle = `${rows.length} направлений`;

  const saveButton = (row: WorkPeriodRow) => {
    if (!isSuperAdmin) return <span className={styles.muted}>—</span>;
    const parsed = parsedByKind.get(row.kind) ?? null;
    const saving = savingKind === row.kind;
    return (
      <button
        type="button"
        data-admin-mutation
        className={styles.saveBtn}
        disabled={busy || parsed === null}
        onClick={() => void saveDefault(row.kind)}
      >
        {saving ? '…' : 'Сохранить'}
      </button>
    );
  };

  const columns = [
    {
      key: 'title',
      title: 'Направление',
      render: (row: WorkPeriodRow) => row.title,
    },
    {
      key: 'days',
      title: 'Срок (раб. дней)',
      render: (row: WorkPeriodRow) => (
        <input
          id={row.inputId}
          className={styles.input}
          inputMode="numeric"
          value={row.daysInput}
          onChange={(e) => setDaysInput(row.kind, e.target.value)}
          disabled={!isSuperAdmin || busy}
          readOnly={!isSuperAdmin}
          autoComplete="off"
          aria-label={`Срок по умолчанию для «${row.title}»`}
        />
      ),
    },
    {
      key: 'updatedAt',
      title: 'Обновлено',
      render: (row: WorkPeriodRow) => (
        <span className={styles.muted}>{formatUpdatedAt(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      render: (row: WorkPeriodRow) => saveButton(row),
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
        disabled={busy}
        busy={loading}
        title="Обновить сроки"
        aria-label={loading ? 'Обновление сроков договоров' : 'Обновить сроки договоров'}
        onClick={() => void refresh()}
      />
    </div>
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <Link className={cdChrome.backLink} href="/admin/contract-documents">
        ← Оформление договоров
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Сроки договоров</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{rows.length}</span>
              </span>
              <AdminSaveNotice visible={successVisible} className={styles.headerSuccessNotice}>
                {successText}
              </AdminSaveNotice>
            </div>
            {iconActions('mobile')}
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
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

      <div className={`${cdHub.contractsListFiltersPanel} ${styles.helpPanel}`}>
        <p className={styles.helpText}>
          Срок в рабочих днях для каждого направления. Подставляется в «Срок дог.» и в{' '}
          <code>{'{{contract.workPeriod}}'}</code>. После подписания срок не меняется; договоры с
          ручным сроком в карточке массовое обновление не затрагивает.
        </p>
        <div className={styles.relatedLinks}>
          <Link href="/admin/contract-documents/settings/numbering">Нумерация договоров</Link>
          <Link href="/admin/contract-documents/settings/markups">Наценки</Link>
        </div>
      </div>

      <p className={styles.sectionHint}>
        {isSuperAdmin
          ? 'После сохранения можно применить срок ко всем неподписанным договорам направления без ручного срока.'
          : 'Изменить срок может только суперадмин. Сейчас доступен только просмотр.'}
      </p>

      <div className={styles.mobileCards} aria-label="Сроки по направлениям">
        {loading && rows.length === 0 ? (
          <p className={styles.mobileLoading}>Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className={styles.mobileEmpty}>Направления не найдены</p>
        ) : (
          rows.map((row) => (
            <article key={row.kind} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div className={styles.mobileCardMain}>
                  <span className={styles.mobileCardName}>{row.title}</span>
                  <span className={styles.mobileCardMeta}>
                    Обновлено: {formatUpdatedAt(row.updatedAt)}
                  </span>
                </div>
              </div>
              <dl className={styles.mobileCardRows}>
                <div className={styles.mobileCardRow}>
                  <dt>Срок, дн.</dt>
                  <dd>
                    <input
                      className={styles.input}
                      inputMode="numeric"
                      value={row.daysInput}
                      onChange={(e) => setDaysInput(row.kind, e.target.value)}
                      disabled={!isSuperAdmin || busy}
                      readOnly={!isSuperAdmin}
                      autoComplete="off"
                    />
                  </dd>
                </div>
              </dl>
              <div className={styles.mobileCardActions}>{saveButton(row)}</div>
            </article>
          ))
        )}
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        data={rows}
        columns={columns}
        keyExtractor={(row) => row.kind}
        loading={loading}
        emptyMessage="Направления не найдены"
      />

      <ConfirmModal
        isOpen={confirmState != null}
        onClose={handleDismissAfterSave}
        onConfirm={handleConfirmModal}
        title={confirmState?.title ?? 'Подтверждение'}
        message={confirmState?.message ?? ''}
        confirmText="Применить"
        cancelText="Только сохранить"
        closeOnConfirm={false}
        confirmLoading={applyingAll}
      />
    </div>
  );
}
