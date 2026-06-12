'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ContractPayment,
  type Office,
  type OfficeCashSummary,
  type OfficeIncassationItem,
  type OfficeOtherExpenseItem,
  canEditContractPaymentIncassation,
  createOfficeIncassation,
  createOfficeOtherExpense,
  getContractPayments,
  getOfficeCashSummary,
  getOfficeIncassations,
  getOfficeOtherExpenses,
  getOffices,
  updateContractPaymentCollection,
  updateOfficeOtherExpenseCollection,
} from '@/shared/api/admin-crm';

import { ALL_OFFICES_ID } from '../contract-payments-page.constants';
import { formatUser, getDefaultPeriod } from '../contract-payments-page.utils';

export function useContractPaymentsPage() {
  const [canEditIncassation, setCanEditIncassation] = useState(false);

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

  const [collectionSavingId, setCollectionSavingId] = useState<string | null>(null);
  const [otherExpenseCollectionSavingId, setOtherExpenseCollectionSavingId] = useState<
    string | null
  >(null);
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
    canEditContractPaymentIncassation()
      .then((r) => setCanEditIncassation(r.canEdit))
      .catch(() => setCanEditIncassation(false));
  }, []);

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

  const handleUpdateCollectionAmount = useCallback(
    async (payment: ContractPayment, value: string) => {
      const trimmed = value.trim();
      const num: number | null =
        trimmed === '' ? null : parseFloat(trimmed.replace(/\s/g, '').replace(',', '.'));
      if (trimmed !== '' && (num === null || Number.isNaN(num) || num < 0)) return;
      const current = payment.collectionAmount;
      const currentNum = current == null || current === '' ? null : Number(current);
      if (num === currentNum) return;
      setCollectionSavingId(payment.id);
      try {
        await updateContractPaymentCollection(payment.id, num);
        loadOfficeData();
      } catch (err) {
        console.error(err);
      } finally {
        setCollectionSavingId(null);
      }
    },
    [loadOfficeData]
  );

  const handleUpdateOtherExpenseCollection = useCallback(
    async (expense: OfficeOtherExpenseItem, value: string) => {
      const trimmed = value.trim();
      const num: number | null =
        trimmed === '' ? null : parseFloat(trimmed.replace(/\s/g, '').replace(',', '.'));
      if (trimmed !== '' && (num === null || Number.isNaN(num) || num < 0)) return;
      const current = expense.collectionAmount;
      const currentNum = current == null || current === '' ? null : Number(current);
      if (num === currentNum) return;
      setOtherExpenseCollectionSavingId(expense.id);
      try {
        await updateOfficeOtherExpenseCollection(expense.id, num);
        loadOfficeData();
      } catch (err) {
        console.error(err);
      } finally {
        setOtherExpenseCollectionSavingId(null);
      }
    },
    [loadOfficeData]
  );

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

  const paymentsWithDiscrepancy = useMemo(() => {
    return filteredPayments
      .filter((p) => {
        const coll = p.collectionAmount;
        if (coll == null || coll === '') return false;
        const amountNum = Number(p.amount ?? 0);
        const collNum = Number(coll);
        return Math.abs(amountNum - collNum) > 0.001;
      })
      .map((p) => p.id);
  }, [filteredPayments]);

  return {
    canEditIncassation,
    offices,
    selectedOfficeId,
    setSelectedOfficeId,
    period,
    setPeriod,
    summary,
    paymentsTotal,
    otherExpenses,
    incassations,
    loading,
    paymentsFilters,
    setPaymentsFilters,
    otherExpenseModalOpen,
    setOtherExpenseModalOpen,
    otherExpenseAmount,
    setOtherExpenseAmount,
    otherExpenseDate,
    setOtherExpenseDate,
    otherExpenseDescription,
    setOtherExpenseDescription,
    otherExpenseSaving,
    collectionSavingId,
    otherExpenseCollectionSavingId,
    incassationModalOpen,
    setIncassationModalOpen,
    incassationAmount,
    setIncassationAmount,
    incassationDate,
    setIncassationDate,
    incassationIncassator,
    setIncassationIncassator,
    incassationNotes,
    setIncassationNotes,
    incassationSaving,
    handleAddOtherExpense,
    handleUpdateCollectionAmount,
    handleUpdateOtherExpenseCollection,
    handleAddIncassation,
    isAllOffices,
    getOfficeName,
    filteredPayments,
    filteredPaymentsSum,
    paymentsWithDiscrepancy,
  };
}

export type ContractPaymentsPageModel = ReturnType<typeof useContractPaymentsPage>;
