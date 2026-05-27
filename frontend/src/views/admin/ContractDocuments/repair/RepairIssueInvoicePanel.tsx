'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';
import { peekNextPaymentInvoiceNumber } from '@/shared/api/admin-payment-invoices';
import measurementBlankStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';

import styles from '../ContractDocuments.module.css';
import {
  computeRepairHubConductSuggestedAmountRub,
  formatRepairHubConductAmountInput,
} from './repairHubConductPayment';
import {
  type RepairInvoiceEstimateSourceId,
  buildRepairInvoiceEstimateSourceOptions,
  formatRepairInvoiceEstimateSourceLabel,
  paymentInvoiceLinesFromEstimateSource,
  repairInvoiceEstimateSourceFromBasisKey,
} from './repairInvoiceLinesFromEstimate';
import { formatRepairIssuedInvoiceAmountRub } from './repairInvoiceNumber';
import {
  type RepairInvoiceConductDraft,
  lineItemsForPaymentInvoiceReprint,
} from './repairInvoicePrint';
import type { RepairPackageFormData } from './repairPackageForm';
import {
  computeRepairPackagePayableBreakdown,
  parseRubAmountString,
} from './repairPackagePaymentTotals';
import {
  type RepairPaymentBasisOptionKey,
  buildRepairPaymentBasisOptions,
  repairPaymentBasisOptionByKey,
} from './repairPaymentBasisOptions';
import {
  PAYMENT_INVOICE_LINE_KIND_LABELS,
  type PaymentInvoiceLineItem,
  type PaymentInvoiceLineKind,
  emptyPaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  groupPaymentInvoiceLinesForDisplay,
  normalizePaymentInvoiceLineItem,
  parsePaymentInvoiceLineAmount,
  sumPaymentInvoiceLineItems,
} from './repairPaymentInvoiceLineItems';

export type RepairIssueInvoicePanelProps = {
  packageId: string;

  form: RepairPackageFormData;

  issuedRows: ContractDocumentPaymentInvoice[];

  paymentRows?: ContractDocumentPackagePayment[];

  onError: (message: string) => void;

  onIssue: (
    conduct: RepairInvoiceConductDraft,
    option: NonNullable<ReturnType<typeof repairPaymentBasisOptionByKey>>
  ) => Promise<void>;

  onPrint: (conduct: RepairInvoiceConductDraft) => void;

  onDownload?: (conduct: RepairInvoiceConductDraft) => void | Promise<void>;

  saving?: boolean;

  showIssuedTable?: boolean;

  onReprint?: (row: ContractDocumentPaymentInvoice) => void;
};

function formatDateRu(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);

  if (!Number.isFinite(d.getTime())) return isoDate;

  return d.toLocaleDateString('ru-RU');
}

export function repairIssuedInvoicePaymentTypeLabel(row: ContractDocumentPaymentInvoice): string {
  if (row.paymentType === 'AMENDMENT' && row.addendumNumber != null) {
    return `Д/с №${row.addendumNumber}`;
  }

  if (row.paymentType === 'PREPAYMENT') return 'Предоплата';

  if (row.paymentType === 'FINAL') return 'Окончательный расчёт';

  return 'Аванс';
}

function recalcLineFromPriceQty(line: PaymentInvoiceLineItem): PaymentInvoiceLineItem {
  const qty = parsePaymentInvoiceLineAmount(line.quantity) ?? 1;

  const unitPrice = parsePaymentInvoiceLineAmount(line.unitPrice);

  if (unitPrice == null) return line;

  return {
    ...line,

    amount: formatPaymentInvoiceLineAmount(qty * unitPrice),
  };
}

export function RepairIssueInvoicePanel({
  packageId,

  form,

  issuedRows,

  paymentRows = [],

  onError,

  onIssue,

  onPrint,

  onDownload,

  saving = false,

  showIssuedTable = true,

  onReprint,
}: RepairIssueInvoicePanelProps) {
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [invoiceNumber, setInvoiceNumber] = useState('');

  const [basisKey, setBasisKey] = useState<RepairPaymentBasisOptionKey | ''>('');

  const [lineItems, setLineItems] = useState<PaymentInvoiceLineItem[]>(() => [
    emptyPaymentInvoiceLineItem(),
  ]);

  const [estimateLoadSource, setEstimateLoadSource] = useState<RepairInvoiceEstimateSourceId | ''>(
    ''
  );

  const [downloadBusy, setDownloadBusy] = useState(false);

  const [issuedNotice, setIssuedNotice] = useState(false);

  const prefillBasisRef = useRef<RepairPaymentBasisOptionKey | ''>('');

  const payableBreakdown = useMemo(() => computeRepairPackagePayableBreakdown(form), [form]);

  const paidAllocations = useMemo(() => {
    let contractPaidRub = 0;

    const byAddendum = new Map<number, number>();

    for (const r of paymentRows) {
      const amt = Number(r.amount);

      if (!Number.isFinite(amt)) continue;

      if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null) {
        byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + amt);
      } else if (r.paymentType !== 'AMENDMENT') {
        contractPaidRub += amt;
      }
    }

    return { contractPaidRub, byAddendum };
  }, [paymentRows]);

  const journalPaidRub = useMemo(
    () => paymentRows.reduce((s, r) => s + (Number(r.amount) || 0), 0),

    [paymentRows]
  );

  const basisOptions = useMemo(() => {
    const opts = buildRepairPaymentBasisOptions(form, paymentRows, payableBreakdown);

    return opts.map((opt) => ({
      ...opt,

      disabled: opt.disabled || issuedRows.some((inv) => inv.basis.trim() === opt.label.trim()),
    }));
  }, [form, paymentRows, payableBreakdown, issuedRows]);

  const selectedBasis = repairPaymentBasisOptionByKey(basisOptions, basisKey);

  const estimateSourceOptions = useMemo(
    () => buildRepairInvoiceEstimateSourceOptions(form),
    [form]
  );

  const selectedEstimateSource = estimateSourceOptions.find((o) => o.id === estimateLoadSource);

  const linesTotalRub = useMemo(() => sumPaymentInvoiceLineItems(lineItems), [lineItems]);

  const lineDisplay = useMemo(() => groupPaymentInvoiceLinesForDisplay(lineItems), [lineItems]);

  const amountDisplay = useMemo(
    () => (linesTotalRub > 0 ? formatRepairHubConductAmountInput(linesTotalRub) : ''),

    [linesTotalRub]
  );

  const refreshNextNumber = useCallback(async () => {
    try {
      const { nextNumber } = await peekNextPaymentInvoiceNumber();

      setInvoiceNumber(nextNumber);
    } catch {
      /* оставляем текущее значение */
    }
  }, []);

  useEffect(() => {
    void refreshNextNumber();

    setInvoiceDate(new Date().toISOString().slice(0, 10));

    setBasisKey('');

    setLineItems([emptyPaymentInvoiceLineItem()]);

    setEstimateLoadSource('');

    setIssuedNotice(false);

    prefillBasisRef.current = '';
  }, [packageId, refreshNextNumber]);

  useEffect(() => {
    if (!basisKey) return;
    const suggested = repairInvoiceEstimateSourceFromBasisKey(basisKey);
    if (!suggested) return;
    const opt = estimateSourceOptions.find((o) => o.id === suggested);
    if (opt && !opt.disabled) setEstimateLoadSource(suggested);
  }, [basisKey, estimateSourceOptions]);

  useEffect(() => {
    if (!selectedBasis || selectedBasis.disabled) return;

    if (prefillBasisRef.current === basisKey) return;

    prefillBasisRef.current = basisKey;

    const suggested = computeRepairHubConductSuggestedAmountRub(
      selectedBasis,

      payableBreakdown,

      journalPaidRub,

      paidAllocations.contractPaidRub,

      paidAllocations.byAddendum
    );

    if (
      suggested != null &&
      suggested > 0 &&
      lineItems.length === 1 &&
      !lineItems[0]?.name.trim()
    ) {
      const unit = formatPaymentInvoiceLineAmount(suggested);

      setLineItems([
        {
          ...emptyPaymentInvoiceLineItem('SERVICE'),
          name: 'Оплата по договору',
          unitPrice: unit,
          amount: unit,
        },
      ]);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене основания
  }, [selectedBasis, basisKey, payableBreakdown, journalPaidRub, paidAllocations]);

  const updateLine = (index: number, patch: Partial<PaymentInvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;

        const next = { ...line, ...patch };

        if ('quantity' in patch || 'unitPrice' in patch) {
          return recalcLineFromPriceQty(next);
        }

        return next;
      })
    );
  };

  const addLine = (lineKind: PaymentInvoiceLineKind = 'SERVICE') => {
    setLineItems((prev) => [...prev, emptyPaymentInvoiceLineItem(lineKind)]);
  };

  const resetAllLines = () => {
    setLineItems([emptyPaymentInvoiceLineItem()]);
  };

  const removeLine = (index: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return [emptyPaymentInvoiceLineItem()];

      return prev.filter((_, i) => i !== index);
    });
  };

  const loadLinesFromEstimate = () => {
    if (!estimateLoadSource) {
      onError('Выберите смету или доп. соглашение');
      return;
    }
    const loaded = paymentInvoiceLinesFromEstimateSource(form, estimateLoadSource);
    if (loaded.length === 0) {
      onError('В выбранном документе нет позиций для загрузки');
      return;
    }
    setLineItems(loaded);
  };

  const buildConductDraft = (): RepairInvoiceConductDraft | null => {
    const num = invoiceNumber.trim();

    const basis = selectedBasis?.label.trim();

    if (!num) {
      onError('Укажите номер счёта');

      return null;
    }

    if (!basis || !selectedBasis || selectedBasis.disabled) {
      onError('Выберите основание платежа');

      return null;
    }

    const normalizedLines = lineItems

      .map((line) => normalizePaymentInvoiceLineItem(line))

      .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));

    if (normalizedLines.length === 0) {
      onError('Добавьте хотя бы одну позицию (товар или услугу) в таблицу');

      return null;
    }

    const totalRub = sumPaymentInvoiceLineItems(normalizedLines);

    if (totalRub <= 0) {
      onError('Укажите суммы по позициям счёта');

      return null;
    }

    return {
      invoiceDate,

      invoiceNumber: num,

      paymentBasis: basis,

      amount: formatPaymentInvoiceLineAmount(totalRub),

      lineItems: normalizedLines,
    };
  };

  const handleDownload = async (conduct: RepairInvoiceConductDraft) => {
    if (!onDownload) return;
    setDownloadBusy(true);
    try {
      await onDownload(conduct);
    } finally {
      setDownloadBusy(false);
    }
  };

  const renderInvoiceLineRow = (line: PaymentInvoiceLineItem, index: number) => (
    <tr key={`line-${index}`}>
      <td className={styles.invoiceLinesKindCol}>
        <select
          value={line.lineKind}
          onChange={(e) =>
            updateLine(index, { lineKind: e.target.value as PaymentInvoiceLineKind })
          }
        >
          {(Object.keys(PAYMENT_INVOICE_LINE_KIND_LABELS) as PaymentInvoiceLineKind[]).map(
            (kind) => (
              <option key={kind} value={kind}>
                {PAYMENT_INVOICE_LINE_KIND_LABELS[kind]}
              </option>
            )
          )}
        </select>
      </td>
      <td className={styles.invoiceLinesNameCol}>
        <input
          value={line.name}
          onChange={(e) => updateLine(index, { name: e.target.value })}
          placeholder="Дверные изделия"
        />
      </td>
      <td>
        <input
          value={line.quantity}
          onChange={(e) => updateLine(index, { quantity: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} />
      </td>
      <td>
        <select
          value={line.vatLabel}
          onChange={(e) => updateLine(index, { vatLabel: e.target.value })}
        >
          <option value="Без НДС">Без НДС</option>
          <option value="20%">20%</option>
          <option value="10%">10%</option>
        </select>
      </td>
      <td>
        <input
          value={line.unitPrice}
          onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <input
          value={line.amount}
          onChange={(e) => updateLine(index, { amount: e.target.value })}
          inputMode="decimal"
        />
      </td>
      <td>
        <button
          type="button"
          className={styles.dangerBtn}
          title="Удалить строку"
          onClick={() => removeLine(index)}
        >
          ×
        </button>
      </td>
    </tr>
  );

  const formComplete =
    invoiceNumber.trim().length > 0 &&
    Boolean(selectedBasis && !selectedBasis.disabled) &&
    lineItems.some(
      (line) => line.name.trim() && (parsePaymentInvoiceLineAmount(line.amount) ?? 0) > 0
    );

  const handleIssue = async () => {
    const conduct = buildConductDraft();

    if (!conduct || !selectedBasis) return;

    setIssuedNotice(false);

    await onIssue(conduct, selectedBasis);

    setIssuedNotice(true);

    setBasisKey('');

    setLineItems([emptyPaymentInvoiceLineItem()]);

    setEstimateLoadSource('');

    prefillBasisRef.current = '';

    await refreshNextNumber();
  };

  return (
    <>
      <div
        className={`${measurementBlankStyles.blankSheet} ${styles.paymentsHubConductBlank}`}
        style={{ marginBottom: showIssuedTable ? 16 : 0 }}
      >
        <div
          className={`${styles.paymentsFormHubRow} ${styles.paymentsFormHubRowCompact} ${styles.paymentsFormHubRowInvoice}`}
        >
          <div className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubDateField}`}>
            <label
              className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
              htmlFor={`repair_invoice_date_${packageId}`}
            >
              Дата счёта
            </label>

            <input
              id={`repair_invoice_date_${packageId}`}
              type="date"
              className={`${measurementBlankStyles.input} ${styles.paymentsHubConductControl}`}
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div
            className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubInvoiceNumberField}`}
          >
            <label
              className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
              htmlFor={`repair_invoice_number_${packageId}`}
            >
              № счёта
            </label>

            <input
              id={`repair_invoice_number_${packageId}`}
              className={`${measurementBlankStyles.input} ${styles.paymentsHubConductControl}`}
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubBasisField}`}>
            <label
              className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
              htmlFor={`repair_invoice_basis_${packageId}`}
            >
              Основание
            </label>

            <select
              id={`repair_invoice_basis_${packageId}`}
              className={`${measurementBlankStyles.select} ${styles.paymentsHubConductControl}`}
              value={basisKey}
              onChange={(e) => setBasisKey(e.target.value as RepairPaymentBasisOptionKey | '')}
            >
              <option value="">Выберите основание</option>

              {basisOptions.map((opt) => (
                <option key={opt.key} value={opt.key} disabled={opt.disabled}>
                  {opt.disabled ? `${opt.label} (уже выставлено)` : opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubAmountField}`}>
            <label
              className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
              htmlFor={`repair_invoice_amount_${packageId}`}
            >
              Итого, ₽
            </label>

            <input
              id={`repair_invoice_amount_${packageId}`}
              readOnly
              className={`${measurementBlankStyles.input} ${styles.paymentsHubConductControl}`}
              value={amountDisplay}
              placeholder="—"
            />
          </div>

          <div className={styles.paymentsFormHubSubmitField}>
            <label
              className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel} ${styles.paymentsFormHubSubmitSpacer}`}
              aria-hidden="true"
            >
              &nbsp;
            </label>

            <div className={styles.paymentsHubConductActions}>
              <button
                type="button"
                className={styles.paymentsHubConductBtn}
                disabled={saving || !formComplete}
                onClick={() => void handleIssue()}
              >
                {saving ? 'Сохранение…' : 'Выставить счёт'}
              </button>

              <button
                type="button"
                className={styles.paymentsHubConductSecondaryBtn}
                disabled={!formComplete}
                onClick={() => {
                  const conduct = buildConductDraft();

                  if (conduct) onPrint(conduct);
                }}
              >
                Печать
              </button>

              {onDownload ? (
                <button
                  type="button"
                  className={styles.paymentsHubConductSecondaryBtn}
                  disabled={!formComplete || downloadBusy}
                  onClick={() => {
                    const conduct = buildConductDraft();
                    if (conduct) void handleDownload(conduct);
                  }}
                >
                  {downloadBusy ? 'PDF…' : 'Скачать PDF'}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <section className={styles.invoiceLinesSection}>
          <h4 className={styles.invoiceLinesSectionTitle}>Товары и услуги</h4>

          <p className={styles.hint} style={{ marginTop: 0, marginBottom: 8 }}>
            В печатной форме основание уходит в поле «Основание», позиции — в таблицу. Суммы из
            сметы/Д/с — с учётом скидки по договору.
          </p>
          <div className={`${styles.invoiceLinesActions} ${styles.invoiceLinesLoadRow}`}>
            <div className={styles.invoiceLinesLoadField}>
              <label
                className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
                htmlFor={`repair_invoice_estimate_source_${packageId}`}
              >
                Загрузить позиции из
              </label>
              <select
                id={`repair_invoice_estimate_source_${packageId}`}
                className={`${measurementBlankStyles.select} ${styles.paymentsHubConductControl}`}
                value={estimateLoadSource}
                onChange={(e) =>
                  setEstimateLoadSource(e.target.value as RepairInvoiceEstimateSourceId | '')
                }
              >
                <option value="">— выберите документ —</option>
                {estimateSourceOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                    {formatRepairInvoiceEstimateSourceLabel(opt)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!estimateLoadSource || selectedEstimateSource?.disabled}
              onClick={loadLinesFromEstimate}
            >
              Загрузить в таблицу
            </button>
          </div>
          <div className={styles.paymentsTableWrap}>
            <table className={`${styles.paymentsTable} ${styles.invoiceLinesTable}`}>
              <thead>
                <tr>
                  <th className={styles.invoiceLinesKindCol}>Вид</th>

                  <th className={styles.invoiceLinesNameCol}>Наименование</th>

                  <th style={{ width: 72 }}>Кол-во</th>

                  <th style={{ width: 72 }}>Ед.</th>

                  <th style={{ width: 88 }}>НДС</th>

                  <th style={{ width: 96 }}>Цена</th>

                  <th style={{ width: 96 }}>Сумма</th>

                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>

              <tbody>
                {lineDisplay.grouped
                  ? lineDisplay.groups.map((group) => (
                      <Fragment key={group.kind}>
                        <tr className={styles.invoiceLinesGroupHeader}>
                          <td colSpan={8}>{group.title}</td>
                        </tr>
                        {group.entries.map(({ index }) =>
                          renderInvoiceLineRow(lineItems[index]!, index)
                        )}
                      </Fragment>
                    ))
                  : lineItems.map((line, index) => renderInvoiceLineRow(line, index))}
              </tbody>
            </table>
          </div>

          <div className={styles.invoiceLinesActions}>
            <button type="button" className={styles.secondaryBtn} onClick={() => addLine('GOODS')}>
              + Товар
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => addLine('SERVICE')}
            >
              + Услуга
            </button>

            <button type="button" className={styles.secondaryBtn} onClick={resetAllLines}>
              Сбросить все позиции
            </button>
          </div>
        </section>

        {issuedNotice ? (
          <p className={styles.paymentsHubConductDoneMsg} role="status" style={{ marginTop: 8 }}>
            Счёт выставлен
          </p>
        ) : null}
      </div>

      {showIssuedTable ? (
        <section data-modal-readonly-panel data-modal-density="compact">
          <h3 className={styles.sectionTitle} style={{ marginTop: 0 }}>
            Выставленные счета по договору
          </h3>

          {issuedRows.length === 0 ? (
            <p className={styles.hint}>Пока нет выставленных счетов.</p>
          ) : (
            <div className={styles.paymentsTableWrap}>
              <table className={styles.paymentsTable}>
                <thead>
                  <tr>
                    <th>№</th>

                    <th>Дата</th>

                    <th>Основание</th>

                    <th>Тип</th>

                    <th className={styles.paymentsHubSummaryNumCol}>Сумма</th>

                    {onReprint ? <th></th> : null}
                  </tr>
                </thead>

                <tbody>
                  {issuedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.invoiceNumber}</td>

                      <td>{formatDateRu(row.invoiceDate)}</td>

                      <td>{row.basis}</td>

                      <td>{repairIssuedInvoicePaymentTypeLabel(row)}</td>

                      <td className={styles.paymentsHubSummaryNumCol}>
                        {formatRepairIssuedInvoiceAmountRub(Number(row.amount))} ₽
                      </td>

                      {onReprint ? (
                        <td>
                          <div className={styles.invoiceIssuedRowActions}>
                            <button
                              type="button"
                              className={styles.paymentsHubConductSecondaryBtn}
                              onClick={() => onReprint(row)}
                            >
                              Печать
                            </button>
                            {onDownload ? (
                              <button
                                type="button"
                                className={styles.paymentsHubConductSecondaryBtn}
                                disabled={downloadBusy}
                                onClick={() =>
                                  void handleDownload({
                                    invoiceDate: row.invoiceDate,
                                    invoiceNumber: row.invoiceNumber,
                                    paymentBasis: row.basis,
                                    amount: formatRepairIssuedInvoiceAmountRub(Number(row.amount)),
                                    lineItems: lineItemsForPaymentInvoiceReprint(row),
                                  })
                                }
                              >
                                {downloadBusy ? 'PDF…' : 'PDF'}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
