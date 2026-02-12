'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractPayment,
  type Office,
  type OfficeCashSummary,
  type OfficeIncassationItem,
  type OfficeOtherExpenseItem,
  createOfficeIncassation,
  createOfficeOtherExpense,
  getContractPayments,
  getOfficeCashSummary,
  getOfficeIncassations,
  getOfficeOtherExpenses,
  getOffices,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ContractPaymentsPage.module.css';

function getDefaultPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

const ALL_OFFICES_ID = '__ALL__';

const PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
  LC_TRANSFER: 'Переводы на ЛК',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Частичная оплата',
  FINAL: 'Окончательный расчёт',
  AMENDMENT: 'Оплата доп. соглашения',
};

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatMoney(v: string | number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

export function ContractPaymentsPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState(ALL_OFFICES_ID);
  const [period, setPeriod] = useState(getDefaultPeriod);
  const [summary, setSummary] = useState<OfficeCashSummary | null>(null);
  const [payments, setPayments] = useState<ContractPayment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [otherExpenses, setOtherExpenses] = useState<OfficeOtherExpenseItem[]>([]);
  const [incassations, setIncassations] = useState<OfficeIncassationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [paymentsFilters, setPaymentsFilters] = useState({
    date: '',
    contractNumber: '',
    customer: '',
    amount: '',
    paymentForm: '',
    paymentType: '',
    manager: '',
  });

  const [otherExpenseModalOpen, setOtherExpenseModalOpen] = useState(false);
  const [otherExpenseAmount, setOtherExpenseAmount] = useState('');
  const [otherExpenseDate, setOtherExpenseDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [otherExpenseDescription, setOtherExpenseDescription] = useState('');
  const [otherExpenseSaving, setOtherExpenseSaving] = useState(false);

  const [incassationModalOpen, setIncassationModalOpen] = useState(false);
  const [incassationAmount, setIncassationAmount] = useState('');
  const [incassationDate, setIncassationDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [incassationIncassator, setIncassationIncassator] = useState('');
  const [incassationNotes, setIncassationNotes] = useState('Инкассация за неделю');
  const [incassationSaving, setIncassationSaving] = useState(false);

  const loadOffices = useCallback(() => {
    getOffices(true)
      .then(setOffices)
      .catch(() => setOffices([]));
  }, []);

  const loadOfficeData = useCallback(async () => {
    if (!selectedOfficeId) {
      setSummary(null);
      setPayments([]);
      setPaymentsTotal(0);
      setOtherExpenses([]);
      setIncassations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const periodParams =
        period.dateFrom || period.dateTo
          ? { dateFrom: period.dateFrom || undefined, dateTo: period.dateTo || undefined }
          : undefined;
      if (selectedOfficeId === ALL_OFFICES_ID) {
        // Агрегат по всем офисам
        const [summariesRes, paymentsRes, ...rest] = await Promise.all([
          Promise.all(offices.map((o) => getOfficeCashSummary(o.id, periodParams))),
          getContractPayments({ page: 1, limit: 2000, ...periodParams }),
          Promise.all(offices.map((o) => getOfficeOtherExpenses(o.id, periodParams))),
          Promise.all(offices.map((o) => getOfficeIncassations(o.id, periodParams))),
        ]);
        const summaries = summariesRes as OfficeCashSummary[];
        const aggregated: OfficeCashSummary = {
          officeId: ALL_OFFICES_ID,
          officeName: 'Все офисы',
          receivedFromClients: summaries.reduce((s, n) => s + n.receivedFromClients, 0),
          receivedByTerminal: summaries.reduce((s, n) => s + (n.receivedByTerminal ?? 0), 0),
          receivedByQr: summaries.reduce((s, n) => s + (n.receivedByQr ?? 0), 0),
          receivedByInvoice: summaries.reduce((s, n) => s + (n.receivedByInvoice ?? 0), 0),
          receivedByLcTransfer: summaries.reduce((s, n) => s + (n.receivedByLcTransfer ?? 0), 0),
          otherExpensesTotal: summaries.reduce((s, n) => s + n.otherExpensesTotal, 0),
          incassationsTotal: summaries.reduce((s, n) => s + n.incassationsTotal, 0),
          balanceInCash: summaries.reduce((s, n) => s + n.balanceInCash, 0),
          balanceToIncassate: summaries.reduce((s, n) => s + n.balanceToIncassate, 0),
        };
        const allExpenses = (rest[0] as OfficeOtherExpenseItem[][])
          .flat()
          .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
        const allIncassations = (rest[1] as OfficeIncassationItem[][])
          .flat()
          .sort(
            (a, b) => new Date(b.incassationDate).getTime() - new Date(a.incassationDate).getTime()
          );
        setSummary(aggregated);
        setPayments(paymentsRes.data);
        setPaymentsTotal(paymentsRes.total);
        setOtherExpenses(allExpenses);
        setIncassations(allIncassations);
      } else {
        const [summaryRes, paymentsRes, expensesRes, incassationsRes] = await Promise.all([
          getOfficeCashSummary(selectedOfficeId, periodParams),
          getContractPayments({
            officeId: selectedOfficeId,
            page: 1,
            limit: 2000,
            ...periodParams,
          }),
          getOfficeOtherExpenses(selectedOfficeId, periodParams),
          getOfficeIncassations(selectedOfficeId, periodParams),
        ]);
        setSummary(summaryRes);
        setPayments(paymentsRes.data);
        setPaymentsTotal(paymentsRes.total);
        setOtherExpenses(expensesRes);
        setIncassations(incassationsRes);
      }
    } catch (err) {
      console.error(err);
      setSummary(null);
      setPayments([]);
      setOtherExpenses([]);
      setIncassations([]);
    } finally {
      setLoading(false);
    }
  }, [selectedOfficeId, offices, period.dateFrom, period.dateTo]);

  useEffect(() => {
    loadOffices();
  }, [loadOffices]);

  useEffect(() => {
    loadOfficeData();
  }, [loadOfficeData]);

  const handleAddOtherExpense = useCallback(async () => {
    if (!selectedOfficeId) return;
    const amount = parseFloat(otherExpenseAmount.replace(/\s/g, '').replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) return;
    if (!otherExpenseDate) return;
    setOtherExpenseSaving(true);
    try {
      await createOfficeOtherExpense({
        officeId: selectedOfficeId,
        amount,
        expenseDate: otherExpenseDate,
        description: otherExpenseDescription.trim() || undefined,
      });
      setOtherExpenseModalOpen(false);
      setOtherExpenseAmount('');
      setOtherExpenseDescription('');
      loadOfficeData();
    } finally {
      setOtherExpenseSaving(false);
    }
  }, [
    selectedOfficeId,
    otherExpenseAmount,
    otherExpenseDate,
    otherExpenseDescription,
    loadOfficeData,
  ]);

  const handleAddIncassation = useCallback(async () => {
    if (!selectedOfficeId) return;
    const amount = parseFloat(incassationAmount.replace(/\s/g, '').replace(',', '.'));
    if (Number.isNaN(amount) || amount <= 0) return;
    if (!incassationDate) return;
    setIncassationSaving(true);
    try {
      await createOfficeIncassation({
        officeId: selectedOfficeId,
        amount,
        incassationDate: incassationDate,
        incassator: incassationIncassator.trim() || undefined,
        notes: incassationNotes.trim() || undefined,
      });
      setIncassationModalOpen(false);
      setIncassationAmount('');
      setIncassationIncassator('');
      setIncassationNotes('Инкассация за неделю');
      loadOfficeData();
    } finally {
      setIncassationSaving(false);
    }
  }, [
    selectedOfficeId,
    incassationAmount,
    incassationDate,
    incassationIncassator,
    incassationNotes,
    loadOfficeData,
  ]);

  const isAllOffices = selectedOfficeId === ALL_OFFICES_ID;
  const getOfficeName = (officeId: string) => offices.find((o) => o.id === officeId)?.name ?? '—';

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (paymentsFilters.date && p.paymentDate?.slice(0, 10) !== paymentsFilters.date)
        return false;
      const contractNumber = (p.contract?.contractNumber ?? '').toString();
      if (
        paymentsFilters.contractNumber &&
        !contractNumber.toLowerCase().includes(paymentsFilters.contractNumber.trim().toLowerCase())
      )
        return false;
      const customer = (p.contract?.customerName ?? '').toString();
      if (
        paymentsFilters.customer &&
        !customer.toLowerCase().includes(paymentsFilters.customer.toLowerCase())
      )
        return false;
      if (paymentsFilters.amount && !String(p.amount).includes(paymentsFilters.amount))
        return false;
      if (paymentsFilters.paymentForm && p.paymentForm !== paymentsFilters.paymentForm)
        return false;
      if (paymentsFilters.paymentType && p.paymentType !== paymentsFilters.paymentType)
        return false;
      const managerName = formatUser(
        p.contract?.manager ?? p.contract?.complexObject?.manager ?? p.manager
      );
      if (
        paymentsFilters.manager &&
        !managerName.toLowerCase().includes(paymentsFilters.manager.toLowerCase())
      )
        return false;
      return true;
    });
  }, [payments, paymentsFilters]);

  const filteredPaymentsSum = useMemo(
    () => filteredPayments.reduce((acc, p) => acc + Number(p.amount ?? 0), 0),
    [filteredPayments]
  );

  const paymentColumns = [
    ...(isAllOffices
      ? [
          {
            key: 'office',
            title: 'Офис',
            render: (p: ContractPayment) =>
              p.contract?.office?.name ?? p.contract?.complexObject?.office?.name ?? '—',
          },
        ]
      : []),
    {
      key: 'paymentDate',
      title: 'Дата',
      render: (p: ContractPayment) => formatDate(p.paymentDate),
    },
    {
      key: 'contract',
      title: '№ договора',
      render: (p: ContractPayment) => p.contract?.contractNumber ?? '—',
    },
    {
      key: 'customer',
      title: 'ФИО Заказчика',
      render: (p: ContractPayment) => p.contract?.customerName ?? '—',
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (p: ContractPayment) => formatMoney(p.amount),
    },
    {
      key: 'paymentForm',
      title: 'Форма оплаты',
      render: (p: ContractPayment) => PAYMENT_FORM_LABELS[p.paymentForm] ?? p.paymentForm,
    },
    {
      key: 'paymentType',
      title: 'Тип операции',
      render: (p: ContractPayment) => PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType,
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (p: ContractPayment) =>
        formatUser(p.contract?.manager ?? p.contract?.complexObject?.manager ?? p.manager),
    },
    { key: 'notes', title: 'Примечание', render: (p: ContractPayment) => p.notes ?? '—' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Движ. ден. средст</h1>
          <select
            className={styles.officeSelect}
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
          >
            <option value={ALL_OFFICES_ID}>Все офисы</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <label className={styles.periodLabel}>
            Период:
            <input
              type="date"
              className={styles.periodInput}
              value={period.dateFrom}
              onChange={(e) => setPeriod((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
            —
            <input
              type="date"
              className={styles.periodInput}
              value={period.dateTo}
              onChange={(e) => setPeriod((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </label>
        </div>
      </div>

      {summary && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Итого</span>
                <span className={styles.summaryValueHighlight}>
                  {formatMoney(
                    (summary.receivedFromClients ?? 0) +
                      (summary.receivedByTerminal ?? 0) +
                      (summary.receivedByQr ?? 0) +
                      (summary.receivedByInvoice ?? 0) +
                      (summary.receivedByLcTransfer ?? 0)
                  )}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Наличные</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedFromClients)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Терминал</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByTerminal)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>QR</span>
                <span className={styles.summaryValue}>{formatMoney(summary.receivedByQr)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Счета</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByInvoice)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Переводы на ЛК</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.receivedByLcTransfer)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Прочие расходы</span>
                <span className={styles.summaryValue}>
                  {formatMoney(summary.otherExpensesTotal)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Остаток наличных в кассе</span>
                <span className={styles.summaryValueHighlight}>
                  {formatMoney(summary.balanceInCash)}
                </span>
              </div>
            </div>
          </div>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Оплаты по договорам (все формы оплаты)</h3>
            <div className={styles.tableFilters}>
              <input
                type="date"
                className={styles.filterInput}
                placeholder="Дата"
                value={paymentsFilters.date}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, date: e.target.value }))}
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="№ договора"
                value={paymentsFilters.contractNumber}
                onChange={(e) =>
                  setPaymentsFilters((f) => ({ ...f, contractNumber: e.target.value }))
                }
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Заказчик"
                value={paymentsFilters.customer}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, customer: e.target.value }))}
              />
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Сумма"
                value={paymentsFilters.amount}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, amount: e.target.value }))}
              />
              <select
                className={`${styles.filterInput} ${styles.filterSelect} ${!paymentsFilters.paymentForm ? styles.filterSelectPlaceholder : ''}`}
                value={paymentsFilters.paymentForm}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, paymentForm: e.target.value }))}
              >
                <option value="">Все</option>
                {Object.entries(PAYMENT_FORM_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                className={`${styles.filterInput} ${styles.filterSelect} ${!paymentsFilters.paymentType ? styles.filterSelectPlaceholder : ''}`}
                value={paymentsFilters.paymentType}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, paymentType: e.target.value }))}
              >
                <option value="">Все</option>
                {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className={styles.filterInput}
                placeholder="Менеджер"
                value={paymentsFilters.manager}
                onChange={(e) => setPaymentsFilters((f) => ({ ...f, manager: e.target.value }))}
              />
              <span className={styles.filteredSum}>
                Сумма отфильтрованных: {formatMoney(filteredPaymentsSum)} ({filteredPayments.length}{' '}
                зап.)
              </span>
            </div>
            <DataTable
              data={filteredPayments}
              columns={paymentColumns}
              keyExtractor={(p) => p.id}
              loading={loading}
              emptyMessage="Нет оплат по договорам"
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Прочие расходы (бытовые нужды)</h3>
              {!isAllOffices && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setOtherExpenseModalOpen(true)}
                >
                  Добавить расход
                </button>
              )}
            </div>
            {otherExpenses.length === 0 ? (
              <p className={styles.emptyText}>Нет записей</p>
            ) : (
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    {isAllOffices && <th>Офис</th>}
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Назначение</th>
                  </tr>
                </thead>
                <tbody>
                  {otherExpenses.map((e) => (
                    <tr key={e.id}>
                      {isAllOffices && <td>{e.office?.name ?? getOfficeName(e.officeId)}</td>}
                      <td>{formatDate(e.expenseDate)}</td>
                      <td>{formatMoney(e.amount)}</td>
                      <td>{e.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Инкассации (изъятие наличных)</h3>
              {!isAllOffices && (
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setIncassationModalOpen(true)}
                >
                  Инкассация
                </button>
              )}
            </div>
            {incassations.length === 0 ? (
              <p className={styles.emptyText}>Нет записей об инкассации</p>
            ) : (
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    {isAllOffices && <th>Офис</th>}
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Инкассатор</th>
                    <th>Примечание</th>
                  </tr>
                </thead>
                <tbody>
                  {incassations.map((i) => (
                    <tr key={i.id}>
                      {isAllOffices && <td>{i.office?.name ?? getOfficeName(i.officeId)}</td>}
                      <td>{formatDate(i.incassationDate)}</td>
                      <td>{formatMoney(i.amount)}</td>
                      <td>{i.incassator ?? '—'}</td>
                      <td>{i.notes ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}

      <Modal
        isOpen={otherExpenseModalOpen}
        onClose={() => !otherExpenseSaving && setOtherExpenseModalOpen(false)}
        title="Добавить прочий расход"
      >
        <div className={styles.form}>
          <label>
            Сумма *
            <input
              type="text"
              className={styles.input}
              value={otherExpenseAmount}
              onChange={(e) => setOtherExpenseAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Дата *
            <input
              type="date"
              className={styles.input}
              value={otherExpenseDate}
              onChange={(e) => setOtherExpenseDate(e.target.value)}
            />
          </label>
          <label>
            Назначение (описание)
            <input
              type="text"
              className={styles.input}
              value={otherExpenseDescription}
              onChange={(e) => setOtherExpenseDescription(e.target.value)}
              placeholder="Бытовые нужды офиса"
            />
          </label>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setOtherExpenseModalOpen(false)}
              disabled={otherExpenseSaving}
            >
              Отмена
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleAddOtherExpense}
              disabled={otherExpenseSaving}
            >
              {otherExpenseSaving ? 'Сохранение…' : 'Добавить'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={incassationModalOpen}
        onClose={() => !incassationSaving && setIncassationModalOpen(false)}
        title="Инкассация"
      >
        <div className={styles.form}>
          <p className={styles.formHint}>
            Укажите сумму изъятия наличных и дату проведения инкассации (как правило, раз в неделю).
          </p>
          <label>
            Сумма *
            <input
              type="text"
              className={styles.input}
              value={incassationAmount}
              onChange={(e) => setIncassationAmount(e.target.value)}
              placeholder="0"
            />
          </label>
          <label>
            Дата инкассации *
            <input
              type="date"
              className={styles.input}
              value={incassationDate}
              onChange={(e) => setIncassationDate(e.target.value)}
            />
          </label>
          <label>
            Инкассатор
            <input
              type="text"
              className={styles.input}
              value={incassationIncassator}
              onChange={(e) => setIncassationIncassator(e.target.value)}
              placeholder="ФИО или данные того, кто произвёл инкассацию"
            />
          </label>
          <label>
            Примечание
            <input
              type="text"
              className={styles.input}
              value={incassationNotes}
              onChange={(e) => setIncassationNotes(e.target.value)}
              placeholder="Инкассация за неделю"
            />
          </label>
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => setIncassationModalOpen(false)}
              disabled={incassationSaving}
            >
              Отмена
            </button>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleAddIncassation}
              disabled={incassationSaving}
            >
              {incassationSaving ? 'Сохранение…' : 'Зафиксировать'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
