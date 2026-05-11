'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractDocumentPackagePayment,
  type ContractDocumentPackagePaymentInput,
  type ContractDocumentPackagePaymentPatch,
  createContractDocumentPackagePayment,
  deleteContractDocumentPackagePayment,
  getContractDocumentPackagePayments,
  updateContractDocumentPackagePayment,
} from '@/shared/api/admin-contract-document-packages';

import styles from '../ContractDocuments.module.css';
import { amountToRussianWords } from './amountToRussianWords';
import type { RepairPackageFormData } from './repairPackageForm';
import {
  computeRepairPackagePayableBreakdown,
  parseRubAmountString,
} from './repairPackagePaymentTotals';
import {
  appendRepairPaymentBasisOption,
  paymentApiFieldsFromCustomBasis,
  readRepairPaymentBasisOptions,
} from './repairPaymentBasisOptionsStorage';

const PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
  LC_TRANSFER: 'Переводы на ЛК',
};

function formatMoneyRub(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDateRu(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate;
  return d.toLocaleDateString('ru-RU');
}

export interface RepairContractPaymentsTabProps {
  packageId: string;
  form: RepairPackageFormData;
  onError: (message: string) => void;
  onUpdateContract: <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => void;
}

export function RepairContractPaymentsTab({
  packageId,
  form,
  onError,
  onUpdateContract,
}: RepairContractPaymentsTabProps) {
  const [rows, setRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [basisOptions, setBasisOptions] = useState<string[]>([]);
  const [newBasisDraft, setNewBasisDraft] = useState('');

  /** Поля только для режима «Изменить запись» в журнале (не трогаем contract.*). */
  const [draft, setDraft] = useState<{
    paymentDate: string;
    paymentForm: ContractDocumentPackagePaymentInput['paymentForm'];
    editAmount: string;
    editBasis: string;
  }>(() => ({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentForm: 'INVOICE',
    editAmount: '',
    editBasis: '',
  }));

  const refreshBasisOptions = useCallback(() => {
    setBasisOptions(readRepairPaymentBasisOptions());
  }, []);

  useEffect(() => {
    refreshBasisOptions();
  }, [refreshBasisOptions]);

  /** Если список оснований из LS загрузился, а в договоре пусто — подставляем первый вариант (одно поле для ПКО и журнала). */
  useEffect(() => {
    if (editingId) return;
    const first = basisOptions[0];
    if (!first) return;
    if (form.contract.paymentBasis.trim()) return;
    onUpdateContract('paymentBasis', first);
  }, [basisOptions, editingId, form.contract.paymentBasis, onUpdateContract]);

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
  }, [load]);

  const addendumPaymentSummaries = useMemo(() => {
    const count = Math.min(
      5,
      Math.max(1, Number.isFinite(form.addendumSlotCount) ? form.addendumSlotCount : 1)
    );
    return Array.from({ length: count }, (_, i) => {
      const total = form.addendumSlots[i]?.snapshot?.total;
      if (typeof total !== 'number' || !Number.isFinite(total)) {
        return { num: i + 1, costStr: '', words: '', rec100: '', hasData: false as const };
      }
      const costStr = total.toFixed(2).replace('.', ',');
      return {
        num: i + 1,
        costStr,
        words: amountToRussianWords(costStr),
        rec100: costStr,
        hasData: true as const,
      };
    });
  }, [form.addendumSlotCount, form.addendumSlots]);

  const payableBreakdown = useMemo(() => computeRepairPackagePayableBreakdown(form), [form]);

  const journalPaidRub = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const n = Number.parseFloat(r.amount);
        return acc + (Number.isFinite(n) ? n : 0);
      }, 0),
    [rows]
  );

  const balancePerJournalRub = useMemo(() => {
    const gt = payableBreakdown.grandTotalRub;
    if (gt == null) return null;
    return gt - journalPaidRub;
  }, [payableBreakdown.grandTotalRub, journalPaidRub]);

  const editJournalAmountWords = useMemo(() => {
    const n = parseRubAmountString(draft.editAmount);
    if (n == null) return '';
    return amountToRussianWords(n.toFixed(2).replace('.', ','));
  }, [draft.editAmount]);

  const paymentAmountWordsDisplay = useMemo(() => {
    if (editingId) return editJournalAmountWords || '—';
    return form.contract.prepaymentAmountWords.trim() || '—';
  }, [editingId, editJournalAmountWords, form.contract.prepaymentAmountWords]);

  const resetDraft = () => {
    setDraft({
      paymentDate: new Date().toISOString().slice(0, 10),
      paymentForm: 'INVOICE',
      editAmount: '',
      editBasis: '',
    });
  };

  const basisSelectOptionsCreate = useMemo(() => {
    const opts = [...basisOptions];
    const t = form.contract.paymentBasis.trim();
    if (t && !opts.includes(t)) {
      opts.unshift(t);
    }
    return opts;
  }, [basisOptions, form.contract.paymentBasis]);

  const basisSelectOptionsEdit = useMemo(() => {
    const opts = [...basisOptions];
    const t = draft.editBasis.trim();
    if (t && !opts.includes(t)) {
      opts.unshift(t);
    }
    return opts;
  }, [basisOptions, draft.editBasis]);

  const handleAppendBasisOption = () => {
    const res = appendRepairPaymentBasisOption(newBasisDraft);
    if (!res.ok) {
      onError(res.reason);
      return;
    }
    setBasisOptions(res.list);
    setNewBasisDraft('');
    const added = res.list[res.list.length - 1]!;
    if (editingId) {
      setDraft((d) => ({ ...d, editBasis: added }));
    } else {
      onUpdateContract('paymentBasis', added);
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
      resetDraft();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сохранить оплату');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: ContractDocumentPackagePayment) => {
    setEditingId(r.id);
    setDraft({
      paymentDate: r.paymentDate,
      paymentForm: r.paymentForm,
      editAmount: r.amount.replace('.', ','),
      editBasis: (r.basis ?? '').trim(),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetDraft();
  };

  const submitUpdate = async () => {
    if (!editingId) return;
    const amountNum = parseRubAmountString(draft.editAmount);
    if (amountNum == null || amountNum <= 0) {
      onError('Укажите корректную сумму');
      return;
    }
    const basisRaw = draft.editBasis.trim();
    if (!basisRaw) {
      onError('Укажите основание');
      return;
    }
    const apiFields = paymentApiFieldsFromCustomBasis(basisRaw);
    const body: ContractDocumentPackagePaymentPatch = {
      paymentDate: draft.paymentDate,
      amount: amountNum,
      paymentForm: draft.paymentForm,
      paymentType: apiFields.paymentType,
      basis: apiFields.basis || null,
      addendumNumber: apiFields.addendumNumber ?? null,
    };
    setSaving(true);
    try {
      const updated = await updateContractDocumentPackagePayment(packageId, editingId, body);
      setRows((prev) =>
        prev
          .map((x) => (x.id === updated.id ? updated : x))
          .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate))
      );
      cancelEdit();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось обновить запись');
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (id: string) => {
    if (!window.confirm('Удалить запись об оплате?')) return;
    setSaving(true);
    try {
      await deleteContractDocumentPackagePayment(packageId, id);
      setRows((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось удалить запись');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${styles.blockData} ${styles.dataCompact} ${styles.paymentsTab}`}>
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
            <label htmlFor="pay_tab_ctaw">Стоимость договора прописью</label>
            <input
              id="pay_tab_ctaw"
              className={styles.autoFilledInput}
              value={form.contract.totalAmountWords}
              onChange={(e) => onUpdateContract('totalAmountWords', e.target.value)}
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
              <label htmlFor={`pay_tab_ds_words_${row.num}`}>Сумма прописью</label>
              <input
                id={`pay_tab_ds_words_${row.num}`}
                value={row.hasData ? row.words : '—'}
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
            <div className={styles.paymentsKvGrid}>
              <span className={styles.paymentsKvKey}>Договор</span>
              <span className={styles.paymentsKvVal}>
                {formatMoneyRub(payableBreakdown.mainContractRub)}
              </span>
              {payableBreakdown.addendumTotalsRub.map(({ slotIndex1, totalRub }) => (
                <Fragment key={slotIndex1}>
                  <span className={styles.paymentsKvKey}>Д/с №{slotIndex1}</span>
                  <span className={styles.paymentsKvVal}>{formatMoneyRub(totalRub)}</span>
                </Fragment>
              ))}
              <span className={`${styles.paymentsKvKey} ${styles.paymentsKvTotalRow}`}>Итого</span>
              <span className={`${styles.paymentsKvVal} ${styles.paymentsKvTotalRow}`}>
                {formatMoneyRub(payableBreakdown.grandTotalRub)}
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
                <span className={styles.paymentsKvVal}>{formatMoneyRub(journalPaidRub)}</span>
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
                  {balancePerJournalRub == null ? '—' : formatMoneyRub(balancePerJournalRub)}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>

      <div
        className={`${styles.sectionCard} ${styles.paymentsFormCard} ${styles.paymentsBlockAccentForm}`}
      >
        <h3 className={styles.sectionTitle}>
          {editingId ? 'Изменить запись журнала' : 'Добавить оплату'}
        </h3>
        {editingId ? (
          <p className={styles.hint}>
            Правки относятся только к строке журнала. Поля договора для ПКО при этом не меняются.
          </p>
        ) : null}
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
            <span className={styles.paymentsAmountFieldTitle}>
              {editingId ? 'Сумма, ₽' : 'Сумма оплаты, ₽'}
            </span>
            <div className={styles.paymentsAmountPairRow}>
              <div className={styles.paymentsAmountPairCell}>
                {editingId ? (
                  <input
                    id="pay_tab_amount_num"
                    inputMode="decimal"
                    value={draft.editAmount}
                    onChange={(e) => setDraft((d) => ({ ...d, editAmount: e.target.value }))}
                    placeholder="Напр. 175000 или 175000,50"
                    aria-label="Сумма цифрами"
                  />
                ) : (
                  <input
                    id="pay_tab_amount_num"
                    inputMode="decimal"
                    value={form.contract.prepaymentAmount}
                    onChange={(e) => onUpdateContract('prepaymentAmount', e.target.value)}
                    placeholder="Напр. 175000 или 175000,50"
                    autoComplete="off"
                    aria-label="Сумма оплаты цифрами"
                  />
                )}
              </div>
              <div className={styles.paymentsAmountPairCell}>
                <input
                  type="text"
                  id="pay_tab_amount_words"
                  readOnly
                  tabIndex={-1}
                  value={paymentAmountWordsDisplay}
                  title={paymentAmountWordsDisplay !== '—' ? paymentAmountWordsDisplay : undefined}
                  className={`${styles.autoFilledInput} ${styles.paymentsAmountWordsPreview}`}
                  aria-readonly="true"
                  aria-label="Сумма прописью"
                />
              </div>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="pay_tab_form">Способ оплаты</label>
            <select
              id="pay_tab_form"
              value={draft.paymentForm}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  paymentForm: e.target.value as ContractDocumentPackagePaymentInput['paymentForm'],
                }))
              }
            >
              {Object.entries(PAYMENT_FORM_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.fieldSpanAll}`}>
            <label htmlFor="pay_tab_basis_select">
              {editingId ? 'Основание' : 'Основание (ПКО, договор, журнал)'}
            </label>
            <div className={styles.paymentsBasisInlineRow}>
              <div className={styles.paymentsBasisSelectWrap}>
                <select
                  id="pay_tab_basis_select"
                  value={editingId ? draft.editBasis : form.contract.paymentBasis}
                  disabled={
                    editingId
                      ? basisSelectOptionsEdit.length === 0
                      : basisSelectOptionsCreate.length === 0
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editingId) {
                      setDraft((d) => ({ ...d, editBasis: v }));
                    } else {
                      onUpdateContract('paymentBasis', v);
                    }
                  }}
                >
                  {(editingId ? basisSelectOptionsEdit : basisSelectOptionsCreate).length === 0 ? (
                    <option value="">— Укажите текст справа и нажмите + —</option>
                  ) : (
                    (editingId ? basisSelectOptionsEdit : basisSelectOptionsCreate).map(
                      (text, idx) => (
                        <option key={`${idx}_${text.slice(0, 48)}`} value={text}>
                          {text.length > 120 ? `${text.slice(0, 117)}…` : text}
                        </option>
                      )
                    )
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
              Список вариантов — в этом браузере (localStorage). В журнал уходит тот же текст, что в
              договоре/ПКО; тип строки в базе подбирается по формулировке (Д/с, предоплата и т.д.).
            </p>
          </div>
        </div>
        <div className={styles.paymentsFormActions}>
          {editingId ? (
            <>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving}
                onClick={() => void submitUpdate()}
              >
                Сохранить изменения
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={saving}
                onClick={cancelEdit}
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={() => void submitCreate()}
            >
              Добавить в журнал
            </button>
          )}
        </div>
      </div>

      <div
        className={`${styles.sectionCard} ${styles.paymentsTableCard} ${styles.paymentsBlockAccentJournal}`}
      >
        <h3 className={styles.sectionTitle}>Журнал оплат</h3>
        {loading ? (
          <p className={styles.hint}>Загрузка…</p>
        ) : rows.length === 0 ? (
          <p className={styles.hint}>
            Записей пока нет. Заполните сумму и основание выше и нажмите «Добавить в журнал».
          </p>
        ) : (
          <div className={styles.paymentsTableWrap}>
            <table className={styles.paymentsTable}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th>Способ оплаты</th>
                  <th>Основание</th>
                  <th>Кто внёс</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateRu(r.paymentDate)}</td>
                    <td>{formatMoneyRub(Number.parseFloat(r.amount))}</td>
                    <td>{PAYMENT_FORM_LABELS[r.paymentForm] ?? r.paymentForm}</td>
                    <td className={styles.paymentsTableBasisCell}>{r.basis?.trim() || '—'}</td>
                    <td className={styles.paymentsTableUserCell}>
                      {r.recordedBy
                        ? [r.recordedBy.firstName, r.recordedBy.lastName]
                            .filter(Boolean)
                            .join(' ') || r.recordedBy.email
                        : '—'}
                    </td>
                    <td className={styles.paymentsTableActionsCell}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => startEdit(r)}
                      >
                        Изм.
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => void removeRow(r.id)}
                      >
                        Удал.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
