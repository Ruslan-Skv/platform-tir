'use client';

import { useEffect, useState } from 'react';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../families/product-like/print/productWorkOrder';
import styles from './PackageSettingsPage.module.css';
import panelStyles from './SettingsPanels.module.css';
import type { MarkupRow } from './hooks/useMarkupSettingsPage';
import { useMarkupSettingsPage } from './hooks/useMarkupSettingsPage';

function formatUpdatedAt(updatedAt: string | null): string {
  if (!updatedAt) return '—';
  return new Date(updatedAt).toLocaleString('ru-RU');
}

/** Тело раздела «Наценки договоров» для модалки «Настройки договоров». */
export function MarkupSettingsPanel() {
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
    setCornerPriceInput,
    setMessage,
  } = useMarkupSettingsPage();

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

  /** Поле «Углы, ₽» — только «Натяжные потолки»: цена одного угла в заказ-наряде. */
  const cornerPriceCell = (row: MarkupRow, idPrefix: string) => {
    if (row.cornerPriceInput === null || row.cornerPriceInputId === null) {
      return <span className={styles.muted}>—</span>;
    }
    return (
      <input
        id={row.cornerPriceInputId}
        className={styles.input}
        type="text"
        inputMode="numeric"
        placeholder="Не добавлять"
        value={row.cornerPriceInput}
        onChange={(e) => setCornerPriceInput(row.kind, e.target.value)}
        disabled={!isSuperAdmin || busy}
        readOnly={!isSuperAdmin}
        autoComplete="off"
        aria-label={`Цена одного угла в заказ-наряде для «${row.title}», ₽`}
        data-testid={`${idPrefix}_corner_price_input`}
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
      key: 'cornerPrice',
      title: 'Углы, ₽',
      render: (row: MarkupRow) => cornerPriceCell(row, 'desktop'),
    },
    {
      key: 'updatedAt',
      title: 'Обновлено',
      render: (row: MarkupRow) => (
        <span className={styles.muted}>{formatUpdatedAt(row.updatedAt)}</span>
      ),
    },
  ];

  return (
    <div className={panelStyles.panelRoot}>
      <div className={panelStyles.panelHead}>
        <div className={panelStyles.panelHeadMain}>
          <span className={panelStyles.panelCount}>{rows.length} направлений</span>
          <AdminSaveNotice visible={successVisible}>{successText}</AdminSaveNotice>
        </div>
        <div className={panelStyles.panelActions}>
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
      </div>

      {message?.type === 'error' ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <p className={styles.helpText}>
        Наценка при расчёте заказ-наряда по направлениям. Для «Окна», «Двери», «Жалюзи» и «Натяжные
        потолки»: цена позиции = цена в счёт-заказе минус наценка (по умолчанию{' '}
        {DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT}
        %). Для «Ремонта» дополнительно указывается налог: из суммы заказ-наряда вычитаются налог и
        наценка, затем добавляется % разряда; если в договоре налог/наценка не заданы, берутся
        значения отсюда. Для «Натяжных потолков» поле «Углы, ₽» задаёт цену одного угла в
        заказ-наряде: если в спецификации договора есть позиция «Углы» (блок «Доп.»), в заказ-наряд
        добавляется строка с количеством из спецификации и этой ценой; пустое поле — строка не
        добавляется. Сохранять может только суперадмин.
      </p>

      <p className={styles.sectionHint}>
        {isSuperAdmin
          ? 'Укажите целое число от 0 до 100 и сохраните наценку для нужного направления. Цена угла — целое число рублей (пусто — не добавлять строку «Углы»).'
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
                {row.cornerPriceInput !== null ? (
                  <div className={styles.mobileCardRow}>
                    <dt>Углы, ₽</dt>
                    <dd>{cornerPriceCell(row, 'mobile')}</dd>
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
