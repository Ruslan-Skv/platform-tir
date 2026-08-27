'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type MarketingChannel,
  type MarketingChannelStat,
  type MarketingMetricRow,
  deleteMarketingMetric,
  getMarketingChannels,
  getMarketingMetrics,
  getMarketingStats,
  upsertMarketingMetric,
} from '@/shared/api/marketing/admin-marketing';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import { todayIsoDate } from '../../shared/advertising-strategy.utils';

type MetricForm = {
  channelId: string;
  date: string;
  visits: string;
  leads: string;
  orders: string;
  revenue: string;
  cost: string;
};

export function useAdvertisingStrategyMetricsPage() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [stats, setStats] = useState<MarketingChannelStat[]>([]);
  const [metrics, setMetrics] = useState<MarketingMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState<MetricForm>({
    channelId: '',
    date: todayIsoDate(),
    visits: '0',
    leads: '0',
    orders: '0',
    revenue: '0',
    cost: '0',
  });
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chs, st, rows] = await Promise.all([
        getMarketingChannels(),
        getMarketingStats({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        getMarketingMetrics({
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          limit: 100,
        }),
      ]);
      setChannels(chs);
      setStats(st);
      setMetrics(rows.data);
      setForm((f) => ({
        ...f,
        channelId: f.channelId || chs.find((c) => c.isActive)?.id || chs[0]?.id || '',
      }));
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить статистику');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.channelId) return;
    setSaving(true);
    resetSaveFeedback();
    try {
      await upsertMarketingMetric({
        channelId: form.channelId,
        date: form.date,
        visits: Number(form.visits) || 0,
        leads: Number(form.leads) || 0,
        orders: Number(form.orders) || 0,
        revenue: Number(form.revenue) || 0,
        cost: Number(form.cost) || 0,
      });
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: MarketingMetricRow) => {
    if (!window.confirm('Удалить запись статистики?')) return;
    resetSaveFeedback();
    try {
      await deleteMarketingMetric(row.id);
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return {
    channels,
    stats,
    metrics,
    loading,
    saving,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    form,
    setForm,
    saveNoticeVisible,
    errorMessage,
    load,
    handleSubmit,
    handleDelete,
  };
}

export type AdvertisingStrategyMetricsPageModel = ReturnType<
  typeof useAdvertisingStrategyMetricsPage
>;
