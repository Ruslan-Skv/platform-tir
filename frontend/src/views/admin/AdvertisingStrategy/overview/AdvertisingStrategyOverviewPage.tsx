'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type MarketingOverview,
  getMarketingOverview,
  updateMarketingBudget,
  updateMarketingStrategy,
} from '@/shared/api/admin-marketing';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import styles from '../shared/AdvertisingStrategy.module.css';
import {
  BudgetDonutChart,
  HorizontalShareChart,
  MetricBarsChart,
  PlannedVsActualChart,
} from '../shared/AdvertisingStrategyCharts';
import { AdvertisingStrategyPageShell } from '../shared/AdvertisingStrategyPageShell';
import {
  budgetFromShare,
  formatNumber,
  formatPercent,
  formatRub,
  roundMoney,
  roundShare,
  shareFromBudget,
} from '../shared/advertising-strategy.utils';

type BudgetRow = {
  id: string;
  name: string;
  isActive: boolean;
  monthlyBudget: string;
  sharePercent: string;
};

export function AdvertisingStrategyOverviewPage() {
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

  if (loading || !data) {
    return (
      <AdvertisingStrategyPageShell subtitle="Динамический бюджет по каналам (₽ и доли), аналитика и диаграммы для управления продвижением.">
        <p className={styles.loading}>Загрузка...</p>
      </AdvertisingStrategyPageShell>
    );
  }

  const { summary, channels, stats } = data;
  const budgetChartItems = channels
    .filter((c) => c.isActive && (c.monthlyBudget ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      label: c.name,
      value: c.monthlyBudget ?? 0,
      hint: c.role ?? undefined,
    }));

  const shareBars = channels
    .filter((c) => c.isActive && (c.budgetSharePercent ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      label: c.name,
      value: c.budgetSharePercent ?? 0,
    }));

  const plannedVsActual = stats
    .filter((s) => s.plannedVsActual)
    .map((s) => ({
      id: s.channel.id,
      label: s.channel.name,
      planned: s.plannedVsActual!.planned,
      actual: s.plannedVsActual!.actual,
    }));

  const leadsBars = stats
    .filter((s) => s.leads > 0)
    .map((s) => ({
      id: s.channel.id,
      label: s.channel.name,
      value: s.leads,
    }));

  const deltaAllocated = roundMoney(parsedTotal - allocatedPreview);

  return (
    <AdvertisingStrategyPageShell
      subtitle="Динамический бюджет по каналам (₽ и доли), аналитика и диаграммы для управления продвижением."
      countLabel={`${summary.activeChannels} каналов`}
      saveNoticeVisible={saveNoticeVisible}
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.stats}>
        <span className={styles.statChip}>
          Бюджет:{' '}
          <span className={styles.statChipStrong}>{formatRub(summary.monthlyBudgetTotal)}</span>
        </span>
        <span className={styles.statChip}>
          Распределено:{' '}
          <span className={styles.statChipStrong}>
            {formatRub(summary.allocatedBudget)} ({formatPercent(summary.allocatedSharePercent)})
          </span>
        </span>
        <span className={styles.statChip}>
          Лиды: <span className={styles.statChipStrong}>{formatNumber(summary.leads)}</span>
        </span>
        <span className={styles.statChip}>
          ROI: <span className={styles.statChipStrong}>{formatPercent(summary.roi)}</span>
        </span>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Диаграммы стратегии</h2>
        </div>
        <div className={styles.chartsGrid}>
          <BudgetDonutChart
            title="Распределение бюджета"
            items={budgetChartItems}
            centerLabel="всего"
            centerValue={formatRub(summary.monthlyBudgetTotal)}
          />
          <HorizontalShareChart
            title="Доли каналов, %"
            items={shareBars}
            formatValue={(v) => formatPercent(v)}
          />
          <PlannedVsActualChart title="План vs факт затрат" items={plannedVsActual} />
          <MetricBarsChart title="Лиды по каналам" items={leadsBars} />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Бюджет: общий и по каналам</h2>
        </div>
        <p className={styles.sectionHint}>
          Меняйте сумму в ₽ или долю в % — второе поле пересчитается от общего бюджета. Сохраните,
          чтобы зафиксировать план.
        </p>
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSaveBudget}>
            <div className={styles.budgetTotalRow}>
              <label className={styles.field}>
                <span>Общий бюджет / мес, ₽</span>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={totalBudget}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Комментарий к бюджету</span>
                <input
                  type="text"
                  value={budgetNote}
                  onChange={(e) => setBudgetNote(e.target.value)}
                  placeholder="Например: прирост за счёт Авито"
                />
              </label>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Канал</th>
                    <th>Бюджет, ₽</th>
                    <th>Доля, %</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {budgetRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className={styles.channelName}>{row.name}</span>
                      </td>
                      <td>
                        <input
                          className={styles.budgetInput}
                          type="number"
                          min={0}
                          step={1000}
                          value={row.monthlyBudget}
                          onChange={(e) => handleBudgetChange(row.id, e.target.value)}
                          placeholder="—"
                          disabled={!row.isActive}
                        />
                      </td>
                      <td>
                        <div className={styles.shareCell}>
                          <input
                            className={styles.budgetInput}
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={row.sharePercent}
                            onChange={(e) => handleShareChange(row.id, e.target.value)}
                            placeholder="—"
                            disabled={!row.isActive || parsedTotal <= 0}
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td>
                        <span className={row.isActive ? styles.statusOn : styles.statusOff}>
                          {row.isActive ? 'Активен' : 'Выкл.'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className={styles.sectionHint}>
              Распределено: {formatRub(allocatedPreview)} · доли:{' '}
              {formatPercent(roundShare(shareSumPreview))}
              {parsedTotal > 0 ? ` · остаток: ${formatRub(Math.max(0, deltaAllocated))}` : ''}
            </p>
            {parsedTotal > 0 && Math.abs(deltaAllocated) > 0.5 ? (
              <p className={deltaAllocated < 0 ? styles.budgetWarn : styles.budgetOk}>
                {deltaAllocated < 0
                  ? `Сумма каналов превышает общий бюджет на ${formatRub(Math.abs(deltaAllocated))}`
                  : `Не распределено ${formatRub(deltaAllocated)}`}
              </p>
            ) : null}
            {parsedTotal > 0 && Math.abs(shareSumPreview - 100) > 0.5 && allocatedPreview > 0 ? (
              <p className={styles.budgetWarn}>
                Сумма долей активных каналов: {formatPercent(roundShare(shareSumPreview))}{' '}
                (ожидается ~100% для полного распределения)
              </p>
            ) : null}

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={savingBudget}>
                {savingBudget ? 'Сохранение...' : 'Сохранить бюджет'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Описание стратегии</h2>
        </div>
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSaveStrategy}>
            <label className={styles.field}>
              <span>Название</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </label>
            <label className={styles.field}>
              <span>Суть стратегии</span>
              <textarea
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                rows={4}
              />
            </label>
            <label className={styles.field}>
              <span>Цели и KPI</span>
              <textarea
                value={form.goals}
                onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))}
                rows={5}
              />
            </label>
            <label className={styles.field}>
              <span>Заметки</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </label>
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={savingStrategy}>
                {savingStrategy ? 'Сохранение...' : 'Сохранить описание'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Каналы продвижения</h2>
          <Link href="/admin/advertising-strategy/channels" className={styles.linkButton}>
            Управление каналами →
          </Link>
        </div>
        <div className={styles.card}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Приоритет</th>
                  <th>Канал</th>
                  <th>Бюджет</th>
                  <th>Доля</th>
                  <th>Роль</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch) => (
                  <tr key={ch.id}>
                    <td>
                      <span className={styles.priorityBadge}>{ch.priority}</span>
                    </td>
                    <td>
                      <span className={styles.channelName}>{ch.name}</span>
                      {ch.description ? (
                        <span className={styles.channelRole}>{ch.description}</span>
                      ) : null}
                    </td>
                    <td>{formatRub(ch.monthlyBudget)}</td>
                    <td>{formatPercent(ch.budgetSharePercent)}</td>
                    <td>{ch.role || '—'}</td>
                    <td>
                      <span className={ch.isActive ? styles.statusOn : styles.statusOff}>
                        {ch.isActive ? 'Активен' : 'Выкл.'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </AdvertisingStrategyPageShell>
  );
}
