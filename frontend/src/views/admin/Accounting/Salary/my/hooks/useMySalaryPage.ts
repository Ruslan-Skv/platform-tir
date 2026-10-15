'use client';

import { useCallback, useEffect, useState } from 'react';

import { type MySalaryResult, getMySalary } from '@/shared/api/accounting/admin-salary';

import {
  monthEndIso,
  monthStartIso,
  prevMonthEndIso,
  prevMonthStartIso,
} from '../../salary-page.constants';

/** Логика раздела «Моя з/п»: период и личный расчёт текущего сотрудника. */
export function useMySalaryPage() {
  const [dateFrom, setDateFrom] = useState(monthStartIso);
  const [dateTo, setDateTo] = useState(monthEndIso);
  const [result, setResult] = useState<MySalaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const setPeriod = useCallback((kind: 'month' | 'prevMonth') => {
    if (kind === 'month') {
      setDateFrom(monthStartIso());
      setDateTo(monthEndIso());
    } else {
      setDateFrom(prevMonthStartIso());
      setDateTo(prevMonthEndIso());
    }
  }, []);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMySalary({ dateFrom, dateTo })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить з/п');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, reloadToken]);

  return { dateFrom, setDateFrom, dateTo, setDateTo, setPeriod, reload, result, loading, error };
}

export type MySalaryPageModel = ReturnType<typeof useMySalaryPage>;
