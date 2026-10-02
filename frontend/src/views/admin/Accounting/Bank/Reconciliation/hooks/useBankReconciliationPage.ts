'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type ReconciliationEntry,
  type ReconciliationHistoryItem,
  type ReconciliationPreview,
  type UnmatchedPayment,
  createReconciliationLinks,
  getReconciliationPreview,
  listReconciliationLinks,
  removeAllEntryLinks,
  removeReconciliationLink,
} from '@/shared/api/accounting/admin-bank-reconciliation';

import { currentMonthStartIso, todayIso } from '../../bank-page.constants';

export const RECONCILIATION_LAG_OPTIONS = [0, 1, 2, 3, 5, 7] as const;

export function useBankReconciliationPage() {
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();
  /** Снятие фиксации — только супер-админ. */
  const canDelete = user?.role === 'SUPER_ADMIN';

  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [history, setHistory] = useState<ReconciliationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(currentMonthStartIso);
  const [dateTo, setDateTo] = useState(todayIso);
  const [lagDays, setLagDays] = useState(3);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [previewRes, historyRes] = await Promise.all([
        getReconciliationPreview({ dateFrom, dateTo, lagDays }),
        listReconciliationLinks({ limit: 30 }),
      ]);
      setPreview(previewRes);
      setHistory(historyRes.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выполнить сверку');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, lagDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const [matchEntry, setMatchEntry] = useState<ReconciliationEntry | null>(null);
  const [choosePayment, setChoosePayment] = useState<UnmatchedPayment | null>(null);
  const [acting, setActing] = useState(false);

  /** Зафиксировать сопоставление банк-записи с выбранными оплатами ДП. */
  const applyLink = async (bankEntryId: string, movementIds: string[]) => {
    if (!canEdit || movementIds.length === 0) return;
    setActing(true);
    try {
      await createReconciliationLinks(bankEntryId, movementIds);
      setMatchEntry(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось зафиксировать сверку');
    } finally {
      setActing(false);
    }
  };

  /** Привязать оплату к выбранному поступлению (из карточки оплаты). */
  const linkPaymentToEntry = async (bankEntryId: string, movementId: string) => {
    if (!canEdit) return;
    setActing(true);
    try {
      await createReconciliationLinks(bankEntryId, [movementId]);
      setChoosePayment(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось зафиксировать сверку');
    } finally {
      setActing(false);
    }
  };

  const unlink = async (linkId: string) => {
    if (!canDelete) return;
    setActing(true);
    try {
      await removeReconciliationLink(linkId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять фиксацию');
    } finally {
      setActing(false);
    }
  };

  const unlinkAll = async (bankEntryId: string) => {
    if (!canDelete) return;
    setActing(true);
    try {
      await removeAllEntryLinks(bankEntryId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять фиксацию');
    } finally {
      setActing(false);
    }
  };

  const resetFilters = () => {
    setDateFrom(currentMonthStartIso());
    setDateTo(todayIso());
    setLagDays(3);
  };

  /** Кандидаты для ручной привязки к записи: непокрытые оплаты того же способа,
   *  включая те, что автоматика предложила другим записям. */
  const candidatesByType = useMemo(() => {
    const map = new Map<string, UnmatchedPayment[]>();
    if (!preview) return map;
    const add = (item: UnmatchedPayment) => {
      const key = paymentFormToEntryType(item.paymentForm);
      if (!key) return;
      const list = map.get(key) ?? [];
      if (!list.some((x) => x.id === item.id)) list.push(item);
      map.set(key, list);
    };
    for (const payment of preview.unmatchedPayments) add(payment);
    for (const entry of preview.entries) {
      if (!entry.suggestion) continue;
      for (const movement of entry.suggestion.movements) {
        add({ ...movement, inTransit: false });
      }
    }
    return map;
  }, [preview]);

  return {
    preview,
    history,
    loading,
    error,
    setError,
    load,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    lagDays,
    setLagDays,
    resetFilters,
    matchEntry,
    setMatchEntry,
    choosePayment,
    setChoosePayment,
    acting,
    applyLink,
    linkPaymentToEntry,
    unlink,
    unlinkAll,
    candidatesByType,
    canEdit,
    canDelete,
  };
}

/** Соответствие способов оплаты ДП типам зачислений банка (зеркально бэкенду). */
export function paymentFormToEntryType(
  paymentForm: string
): 'TERMINAL_QR' | 'INVOICE_PAYMENT' | 'LC_TRANSFER' | null {
  if (paymentForm === 'TERMINAL' || paymentForm === 'QR') return 'TERMINAL_QR';
  if (paymentForm === 'INVOICE') return 'INVOICE_PAYMENT';
  if (paymentForm === 'LC_TRANSFER') return 'LC_TRANSFER';
  return null;
}

export type BankReconciliationPageModel = ReturnType<typeof useBankReconciliationPage>;
