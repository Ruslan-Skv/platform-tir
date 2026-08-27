'use client';

import Link from 'next/link';

import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';

import styles from '../shared/AdvertisingStrategy.module.css';
import {
  BudgetDonutChart,
  HorizontalShareChart,
  MetricBarsChart,
  PlannedVsActualChart,
} from '../shared/AdvertisingStrategyCharts';
import { AdvertisingStrategyPageShell } from '../shared/AdvertisingStrategyPageShell';
import {
  formatNumber,
  formatPercent,
  formatRub,
  roundShare,
} from '../shared/advertising-strategy.utils';
import type { AdvertisingStrategyOverviewPageModel } from './hooks/useAdvertisingStrategyOverviewPage';

const OVERVIEW_SUBTITLE =
  'Динамический бюджет по каналам (₽ и доли), аналитика и диаграммы для управления продвижением.';

type AdvertisingStrategyOverviewPageViewProps = {
  model: AdvertisingStrategyOverviewPageModel;
};

export function AdvertisingStrategyOverviewPageView({
  model,
}: AdvertisingStrategyOverviewPageViewProps) {
  const {
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
  } = model;

  if (loading || !data) {
    return (
      <AdvertisingStrategyPageShell subtitle={OVERVIEW_SUBTITLE}>
        <p className={styles.loading}>Загрузка...</p>
      </AdvertisingStrategyPageShell>
    );
  }

  const { summary, channels } = data;
  const { budgetChartItems, shareBars, plannedVsActual, leadsBars } = chartData;

  return (
    <AdvertisingStrategyPageShell
      subtitle={OVERVIEW_SUBTITLE}
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
