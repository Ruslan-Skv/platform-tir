'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type SalaryCalcResult,
  type SalarySettlement,
  type SalarySettlementListItem,
  calculateSalary,
  confirmSalarySettlement,
  createSalarySettlement,
  deleteSalarySettlement,
  getSalarySettlement,
  getSalarySettlements,
} from '@/shared/api/admin-salary';

import {
  monthEndIso,
  monthStartIso,
  prevMonthEndIso,
  prevMonthStartIso,
} from '../salary-page.constants';

/** Логика вкладки «Расчёт за период»: живой расчёт и зафиксированные ведомости. */
export function useSalaryCalc() {
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(monthEndIso);
  const [officeId, setOfficeId] = useState('');
  const [result, setResult] = useState<SalaryCalcResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Успешное уведомление (авто-скрытие) — «расчёт зафиксирован» и т.п. */
  const [notice, setNotice] = useState<string | null>(null);

  const [settlements, setSettlements] = useState<SalarySettlementListItem[]>([]);
  const [activeSettlement, setActiveSettlement] = useState<SalarySettlement | null>(null);
  const [saving, setSaving] = useState(false);
  /** Черновик, выбранный для удаления через ConfirmModal. */
  const [deleteTarget, setDeleteTarget] = useState<SalarySettlementListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Панель периода по умолчанию раскрыта: задать период и рассчитать — основное действие вкладки. */
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((v) => !v), []);

  const isSnapshot = activeSettlement !== null;

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 4000);
  }, []);

  const run = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setError('Укажите период расчёта');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await calculateSalary({ dateFrom, dateTo, officeId: officeId || undefined });
      setResult(data);
      setActiveSettlement(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, officeId]);

  const loadSettlements = useCallback(async () => {
    try {
      setSettlements(await getSalarySettlements());
    } catch {
      /* список ведомостей не критичен для расчёта */
    }
  }, []);

  useEffect(() => {
    void loadSettlements();
  }, [loadSettlements]);

  const setPeriod = useCallback((kind: 'month' | 'prevMonth') => {
    if (kind === 'month') {
      setDateFrom(monthStartIso());
      setDateTo(monthEndIso());
    } else {
      setDateFrom(prevMonthStartIso());
      setDateTo(prevMonthEndIso());
    }
  }, []);

  const resetFilters = useCallback(() => {
    setDateFrom(monthStartIso());
    setDateTo(monthEndIso());
    setOfficeId('');
  }, []);

  const openSettlement = useCallback(async (id: string) => {
    try {
      setActiveSettlement(await getSalarySettlement(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось открыть расчёт');
    }
  }, []);

  const closeSettlement = useCallback(() => setActiveSettlement(null), []);

  const fixSettlement = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setSaving(true);
    setError(null);
    try {
      await createSalarySettlement({ dateFrom, dateTo });
      showNotice('Расчёт зафиксирован — черновик ведомости добавлен в список ниже');
      await loadSettlements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось зафиксировать расчёт');
    } finally {
      setSaving(false);
    }
  }, [dateFrom, dateTo, loadSettlements, showNotice]);

  const confirmSettlement = useCallback(
    async (id: string) => {
      setSaving(true);
      setError(null);
      try {
        await confirmSalarySettlement(id);
        showNotice('Расчёт подтверждён');
        await loadSettlements();
        if (activeSettlement?.id === id) {
          setActiveSettlement(await getSalarySettlement(id));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось подтвердить расчёт');
      } finally {
        setSaving(false);
      }
    },
    [activeSettlement?.id, loadSettlements, showNotice]
  );

  const handleDeleteSettlement = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSalarySettlement(deleteTarget.id);
      showNotice('Черновик ведомости удалён');
      if (activeSettlement?.id === deleteTarget.id) setActiveSettlement(null);
      setDeleteTarget(null);
      await loadSettlements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить ведомость');
    } finally {
      setDeleting(false);
    }
  }, [activeSettlement?.id, deleteTarget, loadSettlements, showNotice]);

  return {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    officeId,
    setOfficeId,
    result,
    loading,
    error,
    setError,
    notice,
    settlements,
    activeSettlement,
    isSnapshot,
    openSettlement,
    closeSettlement,
    reloadSettlements: loadSettlements,
    saving,
    run,
    setPeriod,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
    fixSettlement,
    confirmSettlement,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteSettlement,
  };
}

export type SalaryCalcModel = ReturnType<typeof useSalaryCalc>;
