'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../families/product-like/print/productWorkOrder';
import styles from './PackageSettingsPage.module.css';
import type { MarkupRow, MarkupSettingsPageModel } from './hooks/useMarkupSettingsPage';

function formatUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) return '—';
  return new Date(updatedAt).toLocaleString('ru-RU');
}

export function MarkupSettingsPageView(model: MarkupSettingsPageModel) {
  const {
    busy,
    isSuperAdmin,
    loading,
    message,
    refresh,
    rows,
    saveAllMarkups,
    savingKind,
    setMarkupInput,
    setTaxInput,
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

  const taxInputCell = (row: MarkupRow, idPrefix: string) => {
    if (row.taxInput === null || row.taxInputId === null) {
      return <span className={styles.muted}>—</span>;
    }
    return (
      <input
        id={row.taxInputId}
        className={styles.input}
        type="text"
        inputMode="numeric"
        value={row.taxInput}
        onChange={(e) => setTaxInput(row.kind, e.target.value)}
        disabled={!isSuperAdmin || busy}
        readOnly={!isSuperAdmin}
        autoComplete="off"
        aria-label={`Налог заказ-наряда для «${row.title}»`}
        data-testid={`${idPrefix}_tax_input`}
      />
    );
  };

  const columns = [
    {
      key: 'title',
      title: 'Направление',
      render: (row: MarkupRow) => row.title,
    },
    {
      key: 'markup',
      title: 'Наценка, %',
      render: (row: MarkupRow) => (
        <input
          id={row.inputId}
          className={styles.input}
          type="text"
          inputMode="numeric"
          value={row.markupInput}
          onChange={(e) => setMarkupInput(row.kind, e.target.value)}
          disabled={!isSuperAdmin || busy}
          readOnly={!isSuperAdmin}
          autoComplete="off"
          aria-label={`Наценка заказ-наряда для «${row.title}»`}
        />
      ),
    },
    {
      key: 'tax',
      title: 'Налог, %',
      render: (row: MarkupRow) => taxInputCell(row, 'desktop'),
    },
    {
      key: 'updatedAt',
      title: 'Обновлено',
      render: (row: MarkupRow) => (
        <span className={styles.muted}>{formatUpdatedAt(row.updatedAt)}</span>
      ),
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
      {isSuperAdmin ? (
        <button
          type="button"
          data-admin-mutation
          className={styles.saveBtn}
          disabled={busy || rows.length === 0}
          title="Сохранить наценки и налог для всех направлений"
          aria-label="Сохранить наценки и налог для всех направлений"
          onClick={() => void saveAllMarkups()}
        >
          {savingKind !== null ? '…' : 'Сохранить'}
        </button>
      ) : null}
      <AdminListRefreshButton
        disabled={busy}
        busy={loading}
        title="Обновить наценки"
        aria-label={loading ? 'Обновление наценок' : 'Обновить наценки'}
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
                <h1 className={cdHub.title}>Наценки договоров</h1>
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
          Наценка при расчёте заказ-наряда по направлениям. Для «Окна», «Двери», «Жалюзи» и
          «Натяжные потолки»: цена позиции = цена в счёт-заказе минус наценка (по умолчанию{' '}
          {DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT}
          %). Для «Ремонта» дополнительно указывается налог: из суммы заказ-наряда вычитаются налог
          и наценка, затем добавляется % разряда; если в договоре налог/наценка не заданы, берутся
          значения отсюда. Сохранять может только суперадмин.
        </p>
        <div className={styles.relatedLinks}>
          <Link href="/admin/contract-documents/settings">Сроки договоров</Link>
          <Link href="/admin/contract-documents/settings/numbering">Нумерация договоров</Link>
        </div>
      </div>

      <p className={styles.sectionHint}>
        {isSuperAdmin
          ? 'Укажите целое число от 0 до 100 и сохраните наценку для нужного направления.'
          : 'Изменить наценку может только суперадмин. Сейчас доступен только просмотр.'}
      </p>

      <div className={styles.mobileCards} aria-label="Наценки по направлениям">
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
                  <dt>Наценка, %</dt>
                  <dd>
                    <input
                      className={styles.input}
                      type="text"
                      inputMode="numeric"
                      value={row.markupInput}
                      onChange={(e) => setMarkupInput(row.kind, e.target.value)}
                      disabled={!isSuperAdmin || busy}
                      readOnly={!isSuperAdmin}
                      autoComplete="off"
                    />
                  </dd>
                </div>
                {row.taxInput !== null ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Налог, %</dt>
                    <dd>{taxInputCell(row, 'mobile')}</dd>
                  </div>
                ) : null}
              </dl>
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
    </div>
  );
}
