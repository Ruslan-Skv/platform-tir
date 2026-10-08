'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

/** Режим панели итогов: «По фондам» (по умолчанию) или «По сотрудникам». */
export type SalaryTotalsMode = 'funds' | 'employees';

/** Ключ localStorage для сохранения фильтров вкладки расчёта. */
const SALARY_CALC_FILTERS_STORAGE_KEY = 'admin_salary_calc_filters_v1';

type PersistedCalcFilters = {
  dateFrom: string;
  dateTo: string;
  officeId: string;
  employeeId: string;
  totalsMode: SalaryTotalsMode;
  filtersCollapsed: boolean;
};

function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function readPersistedFilters(): Partial<PersistedCalcFilters> | null {
  try {
    const raw = window.localStorage.getItem(SALARY_CALC_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedCalcFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Логика вкладки «Расчёт за период»: живой расчёт и зафиксированные ведомости.
 * Живой расчёт выполняется автоматически — при открытии раздела, смене периода/офиса
 * и после изменения исходных данных; revisions — счётчики изменений договоров и настроек.
 */
export function useSalaryCalc(contractsRevision: number, settingsRevision: number) {
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(monthEndIso);
  const [officeId, setOfficeId] = useState('');
  /** Фильтр по сотруднику: договоры, где он менеджер или замерщик ('' — все). */
  const [employeeId, setEmployeeId] = useState('');
  const [result, setResult] = useState<SalaryCalcResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Успешное уведомление (авто-скрытие) — «расчёт зафиксирован» и т.п. */
  const [notice, setNotice] = useState<string | null>(null);

  const [settlements, setSettlements] = useState<SalarySettlementListItem[]>([]);
  const [activeSettlement, setActiveSettlement] = useState<SalarySettlement | null>(null);
  const [saving, setSaving] = useState(false);
  /** Черновик, выбранный для удаления через ConfirmModal. */
  const [deleteTarget, setDeleteTarget] = useState<SalarySettlementListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Панель периода по умолчанию раскрыта: смена периода сразу меняет живой расчёт. */
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((v) => !v), []);

  /** Разрез панели итогов — только отображение, данные не фильтрует. */
  const [totalsMode, setTotalsMode] = useState<SalaryTotalsMode>('funds');

  /** Фильтры восстановлены из localStorage — с этого момента их можно сохранять и считать. */
  const [filtersRestored, setFiltersRestored] = useState(false);

  // Восстановление сохранённых фильтров — до первого расчёта, иначе стартовый запрос
  // с дефолтным периодом гоняется с восстановленным и затирает его результат.
  useEffect(() => {
    const saved = readPersistedFilters();
    if (saved) {
      if (isIsoDay(saved.dateFrom)) setDateFrom(saved.dateFrom);
      if (isIsoDay(saved.dateTo)) setDateTo(saved.dateTo);
      if (typeof saved.officeId === 'string') setOfficeId(saved.officeId);
      if (typeof saved.employeeId === 'string') setEmployeeId(saved.employeeId);
      if (saved.totalsMode === 'funds' || saved.totalsMode === 'employees') {
        setTotalsMode(saved.totalsMode);
      }
      if (typeof saved.filtersCollapsed === 'boolean') setFiltersCollapsed(saved.filtersCollapsed);
    }
    setFiltersRestored(true);
  }, []);

  // Сохранение фильтров — на каждое изменение после восстановления.
  useEffect(() => {
    if (!filtersRestored) return;
    try {
      window.localStorage.setItem(
        SALARY_CALC_FILTERS_STORAGE_KEY,
        JSON.stringify({
          dateFrom,
          dateTo,
          officeId,
          employeeId,
          totalsMode,
          filtersCollapsed,
        } satisfies PersistedCalcFilters)
      );
    } catch {
      /* localStorage недоступен — настройки просто не сохранятся */
    }
  }, [filtersRestored, dateFrom, dateTo, officeId, employeeId, totalsMode, filtersCollapsed]);

  const isSnapshot = activeSettlement !== null;

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), 4000);
  }, []);

  /** Счётчик запросов: побеждает последний — поздний ответ устаревшего запроса не затирает свежий. */
  const runSeqRef = useRef(0);

  const run = useCallback(async () => {
    if (!dateFrom || !dateTo) {
      setResult(null);
      setError(null);
      return;
    }
    const seq = ++runSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await calculateSalary({
        dateFrom,
        dateTo,
        officeId: officeId || undefined,
        employeeId: employeeId || undefined,
      });
      if (seq !== runSeqRef.current) return;
      setResult(data);
    } catch (err) {
      if (seq !== runSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Ошибка расчёта');
    } finally {
      if (seq === runSeqRef.current) setLoading(false);
    }
  }, [dateFrom, dateTo, officeId, employeeId]);

  // Живой расчёт запускается сам: при открытии раздела, смене периода/офиса и после
  // изменения договоров или настроек з/п. Пока открыта зафиксированная ведомость,
  // пересчёт идёт фоном и ведомость не закрывает.
  useEffect(() => {
    if (!filtersRestored) return;
    const timer = window.setTimeout(() => void run(), 300);
    return () => window.clearTimeout(timer);
  }, [filtersRestored, run, contractsRevision, settingsRevision]);

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
    setEmployeeId('');
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
    employeeId,
    setEmployeeId,
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
    setPeriod,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
    totalsMode,
    setTotalsMode,
    fixSettlement,
    confirmSettlement,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteSettlement,
  };
}

export type SalaryCalcModel = ReturnType<typeof useSalaryCalc>;
