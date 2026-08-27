'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type MarketingOverview,
  getMarketingOverview,
  updateMarketingBudget,
  updateMarketingStrategy,
} from '@/shared/api/marketing/admin-marketing';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import {
  budgetFromShare,
  roundMoney,
  shareFromBudget,
} from '../../shared/advertising-strategy.utils';
import type { BudgetRow } from '../advertising-strategy-overview.types';

export function useAdvertisingStrategyOverviewPage() {
  const [data, setData] = useState<MarketingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    goals: '',
    notes: '',
  });
  const [totalBudget, setTotalBudget] = useState('');
  const [budgetNote, setBudgetNote] = useState('');
  const [budgetRows, setBudgetRows] = useState<BudgetRow[]>([]);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const applyOverview = useCallback((overview: MarketingOverview) => {
    setData(overview);
    setForm({
      title: overview.strategy.title ?? '',
      summary: overview.strategy.summary ?? '',
      goals: overview.strategy.goals ?? '',
      notes: overview.strategy.notes ?? '',
    });
    setTotalBudget(
      overview.strategy.monthlyBudgetTotal != null
        ? String(overview.strategy.monthlyBudgetTotal)
        : overview.summary.monthlyBudgetTotal
          ? String(overview.summary.monthlyBudgetTotal)
          : ''
    );
    setBudgetNote(overview.strategy.monthlyBudgetNote ?? '');
    setBudgetRows(
      overview.channels.map((ch) => ({
        id: ch.id,
        name: ch.name,
        isActive: ch.isActive,
        monthlyBudget: ch.monthlyBudget != null ? String(ch.monthlyBudget) : '',
        sharePercent: ch.budgetSharePercent != null ? String(ch.budgetSharePercent) : '',
      }))
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      applyOverview(await getMarketingOverview());
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [applyOverview, showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const parsedTotal = useMemo(() => {
    const n = Number(totalBudget);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [totalBudget]);

  const allocatedPreview = useMemo(
    () =>
      budgetRows.reduce((sum, row) => {
        if (!row.isActive || row.monthlyBudget.trim() === '') return sum;
        return sum + (Number(row.monthlyBudget) || 0);
      }, 0),
    [budgetRows]
  );

  const shareSumPreview = useMemo(
    () =>
      budgetRows.reduce((sum, row) => {
        if (!row.isActive || row.sharePercent.trim() === '') return sum;
        return sum + (Number(row.sharePercent) || 0);
      }, 0),
    [budgetRows]
  );

  const handleBudgetChange = (id: string, money: string) => {
    setBudgetRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const amount = money.trim() === '' ? null : Number(money);
        const share =
          amount === null || !Number.isFinite(amount)
            ? ''
            : parsedTotal > 0
              ? String(shareFromBudget(amount, parsedTotal) ?? '')
              : row.sharePercent;
        return { ...row, monthlyBudget: money, sharePercent: share };
      })
    );
  };

  const handleShareChange = (id: string, share: string) => {
    setBudgetRows((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const pct = share.trim() === '' ? null : Number(share);
        const money =
          pct === null || !Number.isFinite(pct)
            ? ''
            : parsedTotal > 0
              ? String(budgetFromShare(pct, parsedTotal) ?? '')
              : row.monthlyBudget;
        return { ...row, sharePercent: share, monthlyBudget: money };
      })
    );
  };

  const handleTotalChange = (value: string) => {
    setTotalBudget(value);
    const nextTotal = Number(value);
    if (!Number.isFinite(nextTotal) || nextTotal <= 0) return;
    setBudgetRows((rows) =>
      rows.map((row) => {
        if (row.sharePercent.trim() !== '') {
          const pct = Number(row.sharePercent);
          if (!Number.isFinite(pct)) return row;
          return {
            ...row,
            monthlyBudget: String(budgetFromShare(pct, nextTotal) ?? ''),
          };
        }
        if (row.monthlyBudget.trim() !== '') {
          const amount = Number(row.monthlyBudget);
          if (!Number.isFinite(amount)) return row;
          return {
            ...row,
            sharePercent: String(shareFromBudget(amount, nextTotal) ?? ''),
          };
        }
        return row;
      })
    );
  };

  const handleSaveStrategy = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingStrategy(true);
    resetSaveFeedback();
    try {
      const strategy = await updateMarketingStrategy({
        title: form.title,
        summary: form.summary || null,
        goals: form.goals || null,
        notes: form.notes || null,
      });
      setData((prev) => (prev ? { ...prev, strategy: { ...prev.strategy, ...strategy } } : prev));
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleSaveBudget = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingBudget(true);
    resetSaveFeedback();
    try {
      const overview = await updateMarketingBudget({
        monthlyBudgetTotal: totalBudget.trim() === '' ? null : Number(totalBudget),
        monthlyBudgetNote: budgetNote.trim() || null,
        channels: budgetRows.map((row) => ({
          id: row.id,
          monthlyBudget: row.monthlyBudget.trim() === '' ? null : Number(row.monthlyBudget),
        })),
      });
      applyOverview(overview);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения бюджета');
    } finally {
      setSavingBudget(false);
    }
  };

  const deltaAllocated = roundMoney(parsedTotal - allocatedPreview);

  const chartData = useMemo(() => {
    if (!data) {
      return {
        budgetChartItems: [] as { id: string; label: string; value: number; hint?: string }[],
        shareBars: [] as { id: string; label: string; value: number }[],
        plannedVsActual: [] as {
          id: string;
          label: string;
          planned: number;
          actual: number;
        }[],
        leadsBars: [] as { id: string; label: string; value: number }[],
      };
    }
    const { channels, stats } = data;
    return {
      budgetChartItems: channels
        .filter((c) => c.isActive && (c.monthlyBudget ?? 0) > 0)
        .map((c) => ({
          id: c.id,
          label: c.name,
          value: c.monthlyBudget ?? 0,
          hint: c.role ?? undefined,
        })),
      shareBars: channels
        .filter((c) => c.isActive && (c.budgetSharePercent ?? 0) > 0)
        .map((c) => ({
          id: c.id,
          label: c.name,
          value: c.budgetSharePercent ?? 0,
        })),
      plannedVsActual: stats
        .filter((s) => s.plannedVsActual)
        .map((s) => ({
          id: s.channel.id,
          label: s.channel.name,
          planned: s.plannedVsActual!.planned,
          actual: s.plannedVsActual!.actual,
        })),
      leadsBars: stats
        .filter((s) => s.leads > 0)
        .map((s) => ({
          id: s.channel.id,
          label: s.channel.name,
          value: s.leads,
        })),
    };
  }, [data]);

  return {
    data,
    loading,
    savingStrategy,
    savingBudget,
    form,
    setForm,
    totalBudget,
    budgetNote,
    setBudgetNote,
    budgetRows,
    saveNoticeVisible,
    errorMessage,
    parsedTotal,
    allocatedPreview,
    shareSumPreview,
    deltaAllocated,
    chartData,
    handleBudgetChange,
    handleShareChange,
    handleTotalChange,
    handleSaveStrategy,
    handleSaveBudget,
  };
}

export type AdvertisingStrategyOverviewPageModel = ReturnType<
  typeof useAdvertisingStrategyOverviewPage
>;
