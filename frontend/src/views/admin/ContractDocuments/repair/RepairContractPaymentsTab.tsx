'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackagePayment,
  type ContractDocumentPackagePaymentInput,
  createContractDocumentPackagePayment,
  getContractDocumentPackagePayments,
} from '@/shared/api/admin-contract-document-packages';
import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';
import measurementBlankStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';

import styles from '../ContractDocuments.module.css';
import { amountToRussianWords } from './amountToRussianWords';
import type { RepairCashOrderConductDraft } from './repairCashOrderPrint';
import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
} from './repairContractDiscount';
import {
  computeRepairHubConductSuggestedAmountRub,
  formatRepairHubConductAmountInput,
} from './repairHubConductPayment';
import { type RepairPackageFormData, clampRepairAddendumSlotCount } from './repairPackageForm';
import { computePackagePayableBreakdown, parseRubAmountString } from './repairPackagePaymentTotals';
import {
  type RepairPaymentBasisOptionKey,
  buildRepairPaymentBasisOptions,
  repairPaymentBasisOptionByKey,
} from './repairPaymentBasisOptions';
import {
  appendRepairPaymentBasisOption,
  paymentApiFieldsFromCustomBasis,
  readRepairPaymentBasisOptions,
} from './repairPaymentBasisOptionsStorage';
import {
  REPAIR_PAYMENT_FORM_LABELS,
  formatRepairPaymentDateForTemplate,
} from './repairPaymentFormLabels';
import { computeWindowsContractCostBreakdown } from './windowsContractCostBreakdown';

function formatMoneyRub(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Доля `partRub` от `grandTotalRub` (общая стоимость по сводке «Договор и Д/с»). */
function formatPercentOfGrandTotal(
  partRub: number | null | undefined,
  grandTotalRub: number | null | undefined,
  fractionDigits = 1
): string | null {
  if (partRub == null || !Number.isFinite(partRub)) return null;
  if (grandTotalRub == null || !Number.isFinite(grandTotalRub) || grandTotalRub <= 0) return null;
  const pct = (partRub / grandTotalRub) * 100;
  return `${pct.toFixed(fractionDigits).replace('.', ',')} %`;
}

function formatDateRu(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate;
  return d.toLocaleDateString('ru-RU');
}

export type RepairContractPaymentsTabLayout =
  | 'full'
  | 'hub'
  | 'hub-summary'
  | 'hub-conduct'
  | 'journal';

export interface RepairContractPaymentsTabProps {
  packageId: string;
  packageKind?: ContractDocumentPackageKind;
  form: RepairPackageFormData;
  onError: (message: string) => void;
  onUpdateContract: <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => void;
  /** После изменения журнала оплат (для бейджа % в шапке / модалке). */
  onJournalChanged?: () => void;
  /** hub-summary / hub-conduct — части модалки; journal — журнал оплат. */
  layout?: RepairContractPaymentsTabLayout;
  /** Перезагрузка журнала (сводка «Оплачено» в другой секции модалки). */
  journalReloadToken?: number;
  /** Печать ПКО из блока «Провести оплату» (модалка хаба). */
  onPrintCashOrder?: (conduct: RepairCashOrderConductDraft) => void;
  /** Сохранить поля оплаты в `contract.*` для ПКО (одним запросом). */
  onUpdateContractFields?: (patch: Partial<RepairPackageFormData['contract']>) => void;
}

export function RepairContractPaymentsTab({
  packageId,
  packageKind = 'REPAIR',
  form,
  onError,
  onUpdateContract,
  onJournalChanged,
  layout = 'full',
  journalReloadToken = 0,
  onPrintCashOrder,
  onUpdateContractFields,
}: RepairContractPaymentsTabProps) {
  const [rows, setRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [basisOptions, setBasisOptions] = useState<string[]>([]);
  const [newBasisDraft, setNewBasisDraft] = useState('');
  const [hubBasisKey, setHubBasisKey] = useState<RepairPaymentBasisOptionKey | ''>('');
  const [conductAmount, setConductAmount] = useState('');
  const [hubPaymentConductedNotice, setHubPaymentConductedNotice] = useState(false);
  const hubConductPrefillBasisRef = useRef<RepairPaymentBasisOptionKey | ''>('');

  const showHubSummary = layout === 'full' || layout === 'hub' || layout === 'hub-summary';
  const showJournalTable = layout === 'full' || layout === 'journal';
  const isHubSummaryLayout = layout === 'hub' || layout === 'hub-summary';
  const isHubConductLayout = layout === 'hub' || layout === 'hub-conduct';
  const showConductForm = layout === 'full' || layout === 'hub-conduct' || layout === 'hub';

  /** Поля только для режима «Изменить запись» в журнале (не трогаем contract.*). */
  const [draft, setDraft] = useState<{
    paymentDate: string;
    paymentForm: ContractDocumentPackagePaymentInput['paymentForm'];
  }>(() => ({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentForm: 'INVOICE',
  }));

  const refreshBasisOptions = useCallback(() => {
    setBasisOptions(readRepairPaymentBasisOptions());
  }, []);

  useEffect(() => {
    refreshBasisOptions();
  }, [refreshBasisOptions]);

  /** Если список оснований из LS загрузился, а в договоре пусто — подставляем первый вариант (ПКО / полная вкладка). */
  useEffect(() => {
    if (isHubConductLayout) return;
    const first = basisOptions[0];
    if (!first) return;
    if (form.contract.paymentBasis.trim()) return;
    onUpdateContract('paymentBasis', first);
  }, [basisOptions, form.contract.paymentBasis, onUpdateContract, isHubConductLayout]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getContractDocumentPackagePayments(packageId);
      setRows(list);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить оплаты');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [packageId, onError]);

  useEffect(() => {
    void load();
  }, [load, journalReloadToken]);

  const addendumPaymentSummaries = useMemo(() => {
    const discountPct = parseRepairContractDiscountPercent(form.contract.discountPercent);
    const count = clampRepairAddendumSlotCount(form.addendumSlotCount);
    return Array.from({ length: count }, (_, i) => {
      const raw = form.addendumSlots[i]?.snapshot?.total;
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        return { num: i + 1, costStr: '', rec100: '', hasData: false as const };
      }
      const total = applyRepairContractDiscountToAmount(raw, discountPct);
      const costStr = total.toFixed(2).replace('.', ',');
      return {
        num: i + 1,
        costStr,
        rec100: costStr,
        hasData: true as const,
      };
    });
  }, [form.addendumSlotCount, form.addendumSlots, form.contract.discountPercent]);

  const paymentsContractDiscountPct = useMemo(
    () => parseRepairContractDiscountPercent(form.contract.discountPercent),
    [form.contract.discountPercent]
  );

  const payableBreakdown = useMemo(
    () => computePackagePayableBreakdown(form, packageKind),
    [form, packageKind]
  );
  const windowsCostBreakdown = useMemo(
    () => (packageKind === 'WINDOWS' ? computeWindowsContractCostBreakdown(form) : null),
    [packageKind, form]
  );

  const hubFixedBasisOptions = useMemo(
    () => buildRepairPaymentBasisOptions(form, rows, payableBreakdown),
    [form, rows, payableBreakdown]
  );

  const paidAllocations = useMemo(() => {
    let contractPaidRub = 0;
    const byAddendum = new Map<number, number>();
    for (const r of rows) {
      const n = Number.parseFloat(r.amount);
      if (!Number.isFinite(n)) continue;
      if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null && r.addendumNumber >= 1) {
        byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + n);
      } else {
        contractPaidRub += n;
      }
    }
    return { contractPaidRub, byAddendum };
  }, [rows]);

  const journalPaidRub = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const n = Number.parseFloat(r.amount);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [rows]
  );

  const hubConductDateReady = Boolean(draft.paymentDate.trim());
  const hubConductSelectedBasis = useMemo(
    () => repairPaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey),
    [hubFixedBasisOptions, hubBasisKey]
  );
  const hubConductBasisReady = Boolean(
    hubConductSelectedBasis && !hubConductSelectedBasis.disabled
  );
  const hubConductAmountReady = useMemo(() => {
    const amountNum = parseRubAmountString(conductAmount);
    return amountNum != null && amountNum > 0;
  }, [conductAmount]);
  const hubConductFormComplete =
    hubConductDateReady && hubConductBasisReady && hubConductAmountReady;
  const hubConductAllBasesDone =
    hubFixedBasisOptions.length > 0 && hubFixedBasisOptions.every((o) => o.disabled);

  const buildHubCashOrderConductDraft = useCallback((): RepairCashOrderConductDraft | null => {
    const option = repairPaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey);
    if (!option || option.disabled) return null;
    const amount = conductAmount.trim();
    if (!amount || !draft.paymentDate.trim()) return null;
    return {
      paymentDate: draft.paymentDate,
      paymentForm: draft.paymentForm,
      paymentBasis: option.label,
      prepaymentAmount: amount,
    };
  }, [hubFixedBasisOptions, hubBasisKey, conductAmount, draft.paymentDate, draft.paymentForm]);

  const syncHubConductToContractForPko = useCallback(
    (conduct: RepairCashOrderConductDraft) => {
      const prepaymentAmount = conduct.prepaymentAmount.trim();
      const patch: Partial<RepairPackageFormData['contract']> = {
        paymentBasis: conduct.paymentBasis.trim(),
        prepaymentAmount,
        prepaymentAmountWords: prepaymentAmount ? amountToRussianWords(prepaymentAmount) : '',
        prepaymentDate: formatRepairPaymentDateForTemplate(conduct.paymentDate),
        paymentFormLabel: REPAIR_PAYMENT_FORM_LABELS[conduct.paymentForm] ?? conduct.paymentForm,
      };
      if (onUpdateContractFields) {
        onUpdateContractFields(patch);
        return;
      }
      for (const [key, value] of Object.entries(patch)) {
        if (typeof value !== 'string') continue;
        onUpdateContract(key as keyof RepairPackageFormData['contract'], value);
      }
    },
    [onUpdateContract, onUpdateContractFields]
  );

  const handleHubPrintCashOrder = () => {
    const conduct = buildHubCashOrderConductDraft();
    if (!conduct) {
      onError('Заполните дату, основание и сумму оплаты для печати ПКО');
      return;
    }
    if (!onPrintCashOrder) return;
    syncHubConductToContractForPko(conduct);
    onPrintCashOrder(conduct);
  };

  useEffect(() => {
    if (!isHubConductLayout) return;
    if (hubConductSelectedBasis?.disabled) {
      setHubBasisKey('');
      setConductAmount('');
      hubConductPrefillBasisRef.current = '';
    }
  }, [isHubConductLayout, hubConductSelectedBasis?.disabled]);

  useEffect(() => {
    if (!isHubConductLayout || !hubConductBasisReady || !hubConductSelectedBasis) {
      return;
    }
    if (hubConductPrefillBasisRef.current === hubBasisKey) return;
    hubConductPrefillBasisRef.current = hubBasisKey;
    const suggested = computeRepairHubConductSuggestedAmountRub(
      hubConductSelectedBasis,
      payableBreakdown,
      journalPaidRub,
      paidAllocations.contractPaidRub,
      paidAllocations.byAddendum
    );
    if (suggested != null && suggested > 0) {
      setConductAmount(formatRepairHubConductAmountInput(suggested));
    }
  }, [
    isHubConductLayout,
    hubConductBasisReady,
    hubConductSelectedBasis,
    hubBasisKey,
    payableBreakdown,
    journalPaidRub,
    paidAllocations.contractPaidRub,
  ]);

  const balancePerJournalRub = useMemo(() => {
    const gt = payableBreakdown.grandTotalRub;
    if (gt == null) return null;
    return gt - journalPaidRub;
  }, [payableBreakdown.grandTotalRub, journalPaidRub]);

  const grandTotalRub = payableBreakdown.grandTotalRub;

  const journalPaidPctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(journalPaidRub, grandTotalRub),
    [journalPaidRub, grandTotalRub]
  );

  const balancePctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(balancePerJournalRub, grandTotalRub),
    [balancePerJournalRub, grandTotalRub]
  );

  const mainContractPctOfGrand = useMemo(
    () => formatPercentOfGrandTotal(payableBreakdown.mainContractRub, grandTotalRub),
    [payableBreakdown.mainContractRub, grandTotalRub]
  );

  const resetDraft = () => {
    setDraft({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentForm: 'INVOICE',
    });
  };

  const resetHubConductForm = useCallback(() => {
    setConductAmount('');
    setHubBasisKey('');
    hubConductPrefillBasisRef.current = '';
    setDraft((d) => ({
      ...d,
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentForm: 'INVOICE',
    }));
  }, []);

  const handleHubBasisChange = (key: RepairPaymentBasisOptionKey | '') => {
    setHubPaymentConductedNotice(false);
    if (key !== hubBasisKey) {
      hubConductPrefillBasisRef.current = '';
    }
    setHubBasisKey(key);
    if (!key) {
      setConductAmount('');
    }
  };

  const basisSelectOptionsCreate = useMemo(() => {
    const opts = [...basisOptions];
    const t = form.contract.paymentBasis.trim();
    if (t && !opts.includes(t)) {
      opts.unshift(t);
    }
    return opts;
  }, [basisOptions, form.contract.paymentBasis]);

  const handleAppendBasisOption = () => {
    const res = appendRepairPaymentBasisOption(newBasisDraft);
    if (!res.ok) {
      onError(res.reason);
      return;
    }
    setBasisOptions(res.list);
    setNewBasisDraft('');
    const added = res.list[res.list.length - 1]!;
    onUpdateContract('paymentBasis', added);
  };

  const submitHubConductPayment = async () => {
    const option = repairPaymentBasisOptionByKey(hubFixedBasisOptions, hubBasisKey);
    if (!option) {
      onError('Выберите основание платежа');
      return;
    }
    if (option.disabled) {
      onError('Выбранное основание уже закрыто — выберите другое');
      return;
    }
    const amountNum = parseRubAmountString(conductAmount);
    if (amountNum == null || amountNum <= 0) {
      onError('Укажите корректную сумму оплаты');
      return;
    }
    const body: ContractDocumentPackagePaymentInput = {
      paymentDate: draft.paymentDate,
      amount: amountNum,
      paymentForm: draft.paymentForm,
      paymentType: option.paymentType,
      basis: option.label,
    };
    if (option.addendumNumber != null) {
      body.addendumNumber = option.addendumNumber;
    }
    setSaving(true);
    try {
      const created = await createContractDocumentPackagePayment(packageId, body);
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      );
      const conduct: RepairCashOrderConductDraft = {
        paymentDate: draft.paymentDate,
        paymentForm: draft.paymentForm,
        paymentBasis: option.label,
        prepaymentAmount: conductAmount.trim(),
      };
      syncHubConductToContractForPko(conduct);
      onJournalChanged?.();
      setHubPaymentConductedNotice(true);
      resetHubConductForm();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось провести оплату');
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async () => {
    const amountNum = parseRubAmountString(form.contract.prepaymentAmount);
    if (amountNum == null || amountNum <= 0) {
      onError('Укажите корректную сумму оплаты (поле ниже — то же значение для ПКО и журнала)');
      return;
    }
    const basisRaw = form.contract.paymentBasis.trim();
    if (!basisRaw) {
      onError('Выберите или добавьте основание платежа');
      return;
    }
    const apiFields = paymentApiFieldsFromCustomBasis(basisRaw);
    const body: ContractDocumentPackagePaymentInput = {
      paymentDate: draft.paymentDate,
      amount: amountNum,
      paymentForm: draft.paymentForm,
      paymentType: apiFields.paymentType,
      basis: apiFields.basis || undefined,
    };
    if (apiFields.addendumNumber != null) {
      body.addendumNumber = apiFields.addendumNumber;
    }
    setSaving(true);
    try {
      const created = await createContractDocumentPackagePayment(packageId, body);
      setRows((prev) =>
        [...prev, created].sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      );
      onJournalChanged?.();
      resetDraft();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить оплату');
    } finally {
      setSaving(false);
    }
  };

  const renderHubPaidValue = (paidRub: number, costRub: number | null | undefined) => {
    const pct = formatPercentOfGrandTotal(paidRub, costRub);
    return (
      <>
        {formatMoneyRub(paidRub)}
        {pct != null ? <span className={styles.paymentsHubCompactPct}> ({pct})</span> : null}
      </>
    );
  };

  const renderHubRemainderValue = (paidRub: number, costRub: number | null | undefined) => {
    if (costRub == null || !Number.isFinite(costRub)) return '—';
    const remainderRub = costRub - paidRub;
    const pct = formatPercentOfGrandTotal(remainderRub, costRub);
    return (
      <span className={remainderRub < -0.5 ? styles.paymentsKvOverpay : undefined}>
        {formatMoneyRub(remainderRub)}
        {pct != null ? <span className={styles.paymentsHubCompactPct}> ({pct})</span> : null}
      </span>
    );
  };

  const formatHubDiscountCell = (discountPct: number) =>
    discountPct > 0 ? `${String(discountPct).replace('.', ',')} %` : '—';

  const hubSummarySection = showHubSummary ? (
    isHubSummaryLayout ? (
      <>
        <h3 className={`${crmDetailStyles.linkedSectionTitle} ${styles.paymentsHubBlockTitle}`}>
          Сводка по договору
        </h3>
        <div
          className={`${styles.sectionCard} ${styles.paymentsPreFormSummaryCard} ${styles.paymentsBlockAccentSummary} ${styles.paymentsHubCompactCard}`}
        >
          <div className={styles.paymentsTableWrap}>
            <table className={`${styles.paymentsTable} ${styles.paymentsHubSummaryTable}`}>
              <thead>
                <tr>
                  <th></th>
                  <th className={styles.paymentsHubSummaryNumCol}>Скидка</th>
                  <th className={styles.paymentsHubSummaryNumCol}>Стоимость</th>
                  <th className={styles.paymentsHubSummaryNumCol}>Рекоменд. предопл.</th>
                  <th className={styles.paymentsHubSummaryNumCol}>Оплачено</th>
                  <th className={styles.paymentsHubSummaryNumCol}>Остаток</th>
                </tr>
              </thead>
              <tbody>
                {packageKind === 'WINDOWS' && windowsCostBreakdown ? (
                  <>
                    <tr>
                      <td>Изделия (спецификация)</td>
                      <td className={styles.paymentsHubSummaryNumCol}>—</td>
                      <td className={styles.paymentsHubSummaryNumCol}>
                        {formatMoneyRub(windowsCostBreakdown.productsAmount)}
                      </td>
                      <td
                        className={`${styles.paymentsHubSummaryNumCol} ${styles.paymentsHubSummaryRecommendedCol}`}
                      >
                        —
                      </td>
                      <td className={styles.paymentsHubSummaryNumCol}>—</td>
                      <td className={styles.paymentsHubSummaryNumCol}>—</td>
                    </tr>
                    <tr>
                      <td>Работы (счёт-заказ)</td>
                      <td className={styles.paymentsHubSummaryNumCol}>
                        {formatHubDiscountCell(paymentsContractDiscountPct)}
                      </td>
                      <td className={styles.paymentsHubSummaryNumCol}>
                        {formatMoneyRub(windowsCostBreakdown.worksAmount)}
                      </td>
                      <td
                        className={`${styles.paymentsHubSummaryNumCol} ${styles.paymentsHubSummaryRecommendedCol}`}
                      >
                        {form.contract.recommendedPrepayment.trim() || '—'}
                      </td>
                      <td className={styles.paymentsHubSummaryNumCol}>—</td>
                      <td className={styles.paymentsHubSummaryNumCol}>—</td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td>Договор</td>
                    <td className={styles.paymentsHubSummaryNumCol}>
                      {formatHubDiscountCell(paymentsContractDiscountPct)}
                    </td>
                    <td className={styles.paymentsHubSummaryNumCol}>
                      {form.contract.totalAmount.trim() ||
                        formatMoneyRub(payableBreakdown.mainContractRub)}
                    </td>
                    <td
                      className={`${styles.paymentsHubSummaryNumCol} ${styles.paymentsHubSummaryRecommendedCol}`}
                    >
                      {form.contract.recommendedPrepayment.trim() || '—'}
                    </td>
                    <td className={styles.paymentsHubSummaryNumCol}>
                      {loading
                        ? '…'
                        : renderHubPaidValue(
                            paidAllocations.contractPaidRub,
                            payableBreakdown.mainContractRub
                          )}
                    </td>
                    <td className={styles.paymentsHubSummaryNumCol}>
                      {loading
                        ? '…'
                        : renderHubRemainderValue(
                            paidAllocations.contractPaidRub,
                            payableBreakdown.mainContractRub
                          )}
                    </td>
                  </tr>
                )}
                {addendumPaymentSummaries
                  .filter((row) => row.hasData)
                  .map((row) => {
                    const addendumTotalRub = payableBreakdown.addendumTotalsRub.find(
                      (a) => a.slotIndex1 === row.num
                    )?.totalRub;
                    const paidRub = paidAllocations.byAddendum.get(row.num) ?? 0;
                    return (
                      <tr key={`pay_hub_ds_${row.num}`}>
                        <td>Д/с №{row.num}</td>
                        <td className={styles.paymentsHubSummaryNumCol}>
                          {formatHubDiscountCell(paymentsContractDiscountPct)}
                        </td>
                        <td className={styles.paymentsHubSummaryNumCol}>
                          {row.costStr ? `${row.costStr} ₽` : formatMoneyRub(addendumTotalRub)}
                        </td>
                        <td
                          className={`${styles.paymentsHubSummaryNumCol} ${styles.paymentsHubSummaryRecommendedCol}`}
                        >
                          {row.rec100 ? `${row.rec100} ₽` : '—'}
                        </td>
                        <td className={styles.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubPaidValue(paidRub, addendumTotalRub)}
                        </td>
                        <td className={styles.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubRemainderValue(paidRub, addendumTotalRub)}
                        </td>
                      </tr>
                    );
                  })}
                <tr className={styles.paymentsHubSummaryFooterRow}>
                  <td>Итого</td>
                  <td className={styles.paymentsHubSummaryNumCol}>—</td>
                  <td className={styles.paymentsHubSummaryNumCol}>
                    {formatMoneyRub(payableBreakdown.grandTotalRub)}
                  </td>
                  <td className={styles.paymentsHubSummaryNumCol}>—</td>
                  <td className={styles.paymentsHubSummaryNumCol}>
                    {loading ? '…' : renderHubPaidValue(journalPaidRub, grandTotalRub)}
                  </td>
                  <td className={styles.paymentsHubSummaryNumCol}>
                    {loading ? '…' : renderHubRemainderValue(journalPaidRub, grandTotalRub)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    ) : (
      <>
        <div
          className={`${styles.sectionCard} ${styles.paymentsDocFieldsCard} ${styles.paymentsBlockAccentContract}`}
        >
          <h3 className={styles.sectionTitle}>Договор</h3>
          <div className={styles.paymentsContractMoneyRow}>
            <div className={`${styles.field} ${styles.contractInlineField}`}>
              <label htmlFor="pay_tab_cta">Стоимость договора</label>
              <input
                id="pay_tab_cta"
                value={form.contract.totalAmount}
                readOnly
                className={styles.autoFilledInput}
              />
            </div>
            <div className={`${styles.field} ${styles.contractInlineField}`}>
              <label htmlFor="pay_tab_crp">Рекомендованная предоплата (70%)</label>
              <input
                id="pay_tab_crp"
                className={`${styles.autoFilledInput} ${styles.paymentsRecommendedAmountInput}`}
                value={form.contract.recommendedPrepayment}
                readOnly
              />
            </div>
          </div>
        </div>

        {addendumPaymentSummaries.map((row) => (
          <div
            key={`pay_ds_${row.num}`}
            className={`${styles.sectionCard} ${styles.paymentsDocFieldsCard} ${styles.paymentsBlockAccentAddendum}`}
          >
            <h3 className={styles.sectionTitle}>Д/с №{row.num}</h3>
            <div className={styles.paymentsContractMoneyRow}>
              <div className={`${styles.field} ${styles.contractInlineField}`}>
                <label htmlFor={`pay_tab_ds_cost_${row.num}`}>Стоимость</label>
                <input
                  id={`pay_tab_ds_cost_${row.num}`}
                  value={row.hasData ? row.costStr : '—'}
                  readOnly
                  className={styles.autoFilledInput}
                />
              </div>
              <div className={`${styles.field} ${styles.contractInlineField}`}>
                <label htmlFor={`pay_tab_ds_rec_${row.num}`}>Рекомендованная оплата (100%)</label>
                <input
                  id={`pay_tab_ds_rec_${row.num}`}
                  value={row.hasData ? row.rec100 : '—'}
                  readOnly
                  className={`${styles.autoFilledInput} ${styles.paymentsRecommendedAmountInput}`}
                />
              </div>
            </div>
          </div>
        ))}

        <div
          className={`${styles.sectionCard} ${styles.paymentsPreFormSummaryCard} ${styles.paymentsBlockAccentSummary}`}
        >
          <h3 className={styles.sectionTitle}>Сводка</h3>
          <div className={styles.paymentsPreFormSummarySections}>
            <section className={styles.paymentsPreFormSummarySection}>
              <h4 className={styles.paymentsPreFormSummaryHeading}>Договор и Д/с</h4>
              {paymentsContractDiscountPct > 0 ? (
                <p className={styles.hint} style={{ margin: '0 0 8px' }}>
                  Учтена скидка по договору {String(paymentsContractDiscountPct).replace('.', ',')}
                  %: итоговые суммы по Д/с (не по строкам сметы) и поле «Стоимость договора» — после
                  скидки.
                </p>
              ) : null}
              <div className={styles.paymentsKvGrid}>
                <span className={styles.paymentsKvKey}>Договор</span>
                <span className={styles.paymentsKvVal}>
                  {formatMoneyRub(payableBreakdown.mainContractRub)}
                  {mainContractPctOfGrand != null ? (
                    <span className={styles.paymentsKvPctSuffix}> · {mainContractPctOfGrand}</span>
                  ) : null}
                </span>
                {payableBreakdown.addendumTotalsRub.map(({ slotIndex1, totalRub }) => {
                  const addendumPct = formatPercentOfGrandTotal(totalRub, grandTotalRub);
                  return (
                    <Fragment key={slotIndex1}>
                      <span className={styles.paymentsKvKey}>Д/с №{slotIndex1}</span>
                      <span className={styles.paymentsKvVal}>
                        {formatMoneyRub(totalRub)}
                        {addendumPct != null ? (
                          <span className={styles.paymentsKvPctSuffix}> · {addendumPct}</span>
                        ) : null}
                      </span>
                    </Fragment>
                  );
                })}
                <span className={`${styles.paymentsKvKey} ${styles.paymentsKvTotalRow}`}>
                  Итого
                </span>
                <span className={`${styles.paymentsKvVal} ${styles.paymentsKvTotalRow}`}>
                  {formatMoneyRub(payableBreakdown.grandTotalRub)}
                  {grandTotalRub != null && grandTotalRub > 0 ? (
                    <span className={styles.paymentsKvPctSuffix}> · 100 %</span>
                  ) : null}
                </span>
              </div>
            </section>

            <section className={styles.paymentsPreFormSummarySection}>
              <h4 className={styles.paymentsPreFormSummaryHeading}>Журнал</h4>
              {loading ? (
                <p className={styles.hint}>Загрузка…</p>
              ) : (
                <div className={styles.paymentsKvGrid}>
                  <span className={styles.paymentsKvKey}>Внесено</span>
                  <span className={styles.paymentsKvVal}>
                    {formatMoneyRub(journalPaidRub)}
                    {journalPaidPctOfGrand != null ? (
                      <span className={styles.paymentsKvPctSuffix}> · {journalPaidPctOfGrand}</span>
                    ) : null}
                  </span>
                  <span className={styles.paymentsKvKey}>Строк</span>
                  <span className={styles.paymentsKvVal}>{rows.length}</span>
                </div>
              )}
            </section>

            <section className={styles.paymentsPreFormSummarySection}>
              {loading ? (
                <p className={styles.hint}>Загрузка…</p>
              ) : (
                <div className={styles.paymentsKvGrid}>
                  <span className={`${styles.paymentsKvKey} ${styles.paymentsKvTotalRow}`}>
                    Остаток
                  </span>
                  <span
                    className={`${styles.paymentsKvVal} ${styles.paymentsKvTotalRow} ${
                      balancePerJournalRub != null && balancePerJournalRub < 0
                        ? styles.paymentsKvOverpay
                        : ''
                    }`}
                  >
                    {balancePerJournalRub == null ? (
                      '—'
                    ) : (
                      <>
                        {formatMoneyRub(balancePerJournalRub)}
                        {balancePctOfGrand != null ? (
                          <span className={styles.paymentsKvPctSuffix}> · {balancePctOfGrand}</span>
                        ) : null}
                      </>
                    )}
                  </span>
                </div>
              )}
            </section>
          </div>
        </div>
      </>
    )
  ) : null;

  const conductFormSection = showConductForm ? (
    <>
      {isHubConductLayout ? (
        <div className={styles.paymentsHubConductTitleRow}>
          <h3 className={`${crmDetailStyles.linkedSectionTitle} ${styles.paymentsHubBlockTitle}`}>
            Провести оплату
          </h3>
          {hubPaymentConductedNotice ? (
            <span className={styles.paymentsHubConductDoneMsg} role="status">
              Оплата проведена
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        className={
          isHubConductLayout
            ? styles.paymentsHubConductFormWrap
            : `${styles.sectionCard} ${styles.paymentsFormCard} ${styles.paymentsBlockAccentForm}`
        }
      >
        {!isHubConductLayout ? <h3 className={styles.sectionTitle}>Добавить оплату</h3> : null}
        {isHubConductLayout ? (
          <div className={`${measurementBlankStyles.blankSheet} ${styles.paymentsHubConductBlank}`}>
            <div className={`${styles.paymentsFormHubRow} ${styles.paymentsFormHubRowCompact}`}>
              <div
                className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubDateField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_date"
                >
                  Дата оплаты
                </label>
                <input
                  id="pay_tab_date"
                  type="date"
                  className={`${measurementBlankStyles.input} ${styles.paymentsHubConductControl}`}
                  value={draft.paymentDate}
                  onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
                />
              </div>
              <div
                className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubBasisField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_basis_select"
                >
                  Основание
                </label>
                <select
                  id="pay_tab_basis_select"
                  className={`${measurementBlankStyles.select} ${styles.paymentsHubConductControl}`}
                  value={hubBasisKey}
                  disabled={!hubConductDateReady || hubConductAllBasesDone}
                  onChange={(e) =>
                    handleHubBasisChange(e.target.value as RepairPaymentBasisOptionKey | '')
                  }
                >
                  <option value="">Выберите основание</option>
                  {hubFixedBasisOptions.map((opt) => (
                    <option key={opt.key} value={opt.key} disabled={opt.disabled}>
                      {opt.disabled ? `${opt.label} (проведено)` : opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubFormField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_form"
                >
                  Способ оплаты
                </label>
                <select
                  id="pay_tab_form"
                  className={`${measurementBlankStyles.select} ${styles.paymentsHubConductControl}`}
                  value={draft.paymentForm}
                  disabled={!hubConductBasisReady}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      paymentForm: e.target
                        .value as ContractDocumentPackagePaymentInput['paymentForm'],
                    }))
                  }
                >
                  {Object.entries(REPAIR_PAYMENT_FORM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div
                className={`${styles.paymentsHubConductField} ${styles.paymentsFormHubAmountField}`}
              >
                <label
                  className={`${measurementBlankStyles.label} ${styles.paymentsHubConductLabel}`}
                  htmlFor="pay_tab_amount_num"
                >
                  Сумма, ₽
                </label>
                <input
                  id="pay_tab_amount_num"
                  inputMode="decimal"
                  className={`${measurementBlankStyles.input} ${styles.paymentsHubConductControl}`}
                  value={conductAmount}
                  disabled={!hubConductBasisReady}
                  onChange={(e) => setConductAmount(e.target.value)}
                  placeholder="175000"
                  autoComplete="off"
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
                    disabled={
                      saving ||
                      hubPaymentConductedNotice ||
                      hubConductAllBasesDone ||
                      !hubConductFormComplete
                    }
                    onClick={() => void submitHubConductPayment()}
                  >
                    {saving ? 'Сохранение…' : 'Провести оплату'}
                  </button>
                  {onPrintCashOrder ? (
                    <button
                      type="button"
                      className={styles.paymentsHubConductSecondaryBtn}
                      disabled={!hubConductFormComplete}
                      title="Печать ПКО (два экземпляра на листе)"
                      onClick={handleHubPrintCashOrder}
                    >
                      Печать ПКО
                    </button>
                  ) : null}
                </div>
              </div>
              {hubConductAllBasesDone ? (
                <p className={`${styles.hint} ${styles.paymentsFormHubHint}`}>
                  Все основания по этому договору уже проведены.
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.paymentsFormGrid}>
              <div className={styles.field}>
                <label htmlFor="pay_tab_date">Дата оплаты</label>
                <input
                  id="pay_tab_date"
                  type="date"
                  value={draft.paymentDate}
                  onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
                />
              </div>
              <div className={`${styles.field} ${styles.paymentsAmountField}`}>
                <label htmlFor="pay_tab_amount_num">Сумма оплаты, ₽</label>
                <input
                  id="pay_tab_amount_num"
                  inputMode="decimal"
                  value={form.contract.prepaymentAmount}
                  onChange={(e) => onUpdateContract('prepaymentAmount', e.target.value)}
                  placeholder="Напр. 175000 или 175000,50"
                  autoComplete="off"
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="pay_tab_form">Способ оплаты</label>
                <select
                  id="pay_tab_form"
                  value={draft.paymentForm}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      paymentForm: e.target
                        .value as ContractDocumentPackagePaymentInput['paymentForm'],
                    }))
                  }
                >
                  {Object.entries(REPAIR_PAYMENT_FORM_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={`${styles.field} ${styles.fieldSpanAll}`}>
                <label htmlFor="pay_tab_basis_select">Основание (ПКО, договор, журнал)</label>
                <div className={styles.paymentsBasisInlineRow}>
                  <div className={styles.paymentsBasisSelectWrap}>
                    <select
                      id="pay_tab_basis_select"
                      value={form.contract.paymentBasis}
                      disabled={basisSelectOptionsCreate.length === 0}
                      onChange={(e) => onUpdateContract('paymentBasis', e.target.value)}
                    >
                      {basisSelectOptionsCreate.length === 0 ? (
                        <option value="">— Укажите текст справа и нажмите + —</option>
                      ) : (
                        basisSelectOptionsCreate.map((text, idx) => (
                          <option key={`${idx}_${text.slice(0, 48)}`} value={text}>
                            {text.length > 120 ? `${text.slice(0, 117)}…` : text}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <input
                    type="text"
                    id="pay_tab_new_basis"
                    value={newBasisDraft}
                    onChange={(e) => setNewBasisDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAppendBasisOption();
                      }
                    }}
                    placeholder="Новый вариант основания"
                    className={styles.paymentsNewBasisInput}
                    aria-label="Текст нового варианта основания"
                  />
                  <button
                    type="button"
                    className={styles.paymentsAddBasisIconBtn}
                    onClick={handleAppendBasisOption}
                    aria-label="Добавить в список"
                    title="Добавить в список"
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
                <p className={styles.hint} style={{ marginTop: 6 }}>
                  Список вариантов — в этом браузере (localStorage). В журнал уходит тот же текст,
                  что в договоре/ПКО; тип строки в базе подбирается по формулировке (Д/с, предоплата
                  и т.д.).
                </p>
              </div>
            </div>
            <div className={styles.paymentsFormActions}>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving}
                onClick={() => void submitCreate()}
              >
                Добавить в журнал
              </button>
            </div>
          </>
        )}
      </div>
    </>
  ) : null;

  const journalTableSection = showJournalTable ? (
    <div
      className={`${styles.sectionCard} ${styles.paymentsTableCard} ${styles.paymentsBlockAccentJournal}`}
    >
      {layout !== 'journal' ? <h3 className={styles.sectionTitle}>Журнал оплат</h3> : null}
      {loading ? (
        <p className={styles.hint}>Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className={styles.hint}>
          {layout === 'journal'
            ? 'Записей пока нет.'
            : 'Записей пока нет. Заполните сумму и основание выше и нажмите «Добавить в журнал».'}
        </p>
      ) : (
        <div className={styles.paymentsTableWrap}>
          <table className={styles.paymentsTable}>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th className={styles.paymentsTablePctCol}>% от итого</th>
                <th>Способ оплаты</th>
                <th>Основание</th>
                <th>Кто внёс</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowAmountNum = Number.parseFloat(r.amount);
                const rowRub = Number.isFinite(rowAmountNum) ? rowAmountNum : null;
                const rowPct = formatPercentOfGrandTotal(rowRub, grandTotalRub);
                return (
                  <tr key={r.id}>
                    <td>{formatDateRu(r.paymentDate)}</td>
                    <td>{formatMoneyRub(Number.parseFloat(r.amount))}</td>
                    <td className={styles.paymentsTablePctCol}>{rowPct ?? '—'}</td>
                    <td>{REPAIR_PAYMENT_FORM_LABELS[r.paymentForm] ?? r.paymentForm}</td>
                    <td className={styles.paymentsTableBasisCell}>{r.basis?.trim() || '—'}</td>
                    <td className={styles.paymentsTableUserCell}>
                      {r.recordedBy
                        ? [r.recordedBy.firstName, r.recordedBy.lastName]
                            .filter(Boolean)
                            .join(' ') || r.recordedBy.email
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  ) : null;

  const isHubPartLayout = layout === 'hub-summary' || layout === 'hub-conduct';

  return (
    <div
      className={`${styles.blockData} ${styles.dataCompact} ${styles.paymentsTab} ${
        layout === 'hub' ? styles.paymentsTabHub : ''
      } ${isHubPartLayout ? styles.paymentsTabHubPart : ''}`}
    >
      {hubSummarySection}
      {conductFormSection}
      {journalTableSection}
    </div>
  );
}
