'use client';

import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { contractsListFilterFieldClass } from '@/views/admin/ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import styles from '../shared/AdvertisingStrategy.module.css';
import { AdvertisingStrategyPageShell } from '../shared/AdvertisingStrategyPageShell';
import { formatNumber, formatPercent, formatRub } from '../shared/advertising-strategy.utils';
import type { AdvertisingStrategyMetricsPageModel } from './hooks/useAdvertisingStrategyMetricsPage';

type AdvertisingStrategyMetricsPageViewProps = {
  model: AdvertisingStrategyMetricsPageModel;
};

export function AdvertisingStrategyMetricsPageView({
  model,
}: AdvertisingStrategyMetricsPageViewProps) {
  const {
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
  } = model;

  return (
    <AdvertisingStrategyPageShell
      subtitle="Фиксация визитов, лидов, заказов, выручки и затрат по каналам для расчёта ROI."
      countLabel={`${metrics.length} записей`}
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <AdminListRefreshButton
          disabled={loading}
          busy={loading}
          title="Обновить"
          aria-label={loading ? 'Обновление статистики' : 'Обновить статистику'}
          onClick={() => void load()}
        />
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div
        className={`${cdHub.contractsListFilters} ${styles.dateFilters} ${styles.toolbarSpaced}`}
      >
        <label className={`${cdHub.contractsListDateLabel} ${styles.dateLabel}`}>
          <span className={cdHub.contractsListDateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              `${cdHub.contractsListDateInput} ${styles.dateInput}`,
              Boolean(dateFrom),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={`${cdHub.contractsListDateLabel} ${styles.dateLabel}`}>
          <span className={cdHub.contractsListDateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              `${cdHub.contractsListDateInput} ${styles.dateInput}`,
              Boolean(dateTo),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата до"
          />
        </label>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Сводка по каналам</h2>
        </div>
        <div className={styles.card}>
          {loading ? (
            <p className={styles.loading}>Загрузка...</p>
          ) : stats.length === 0 ? (
            <p className={styles.empty}>Нет активных каналов или данных за период.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Канал</th>
                    <th>Визиты</th>
                    <th>Лиды</th>
                    <th>Заказы</th>
                    <th>Выручка</th>
                    <th>Затраты</th>
                    <th>CPL</th>
                    <th>Конв.</th>
                    <th>ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.channel.id}>
                      <td>
                        <span className={styles.priorityBadge}>{row.channel.priority}</span>
                      </td>
                      <td>
                        <span className={styles.channelName}>{row.channel.name}</span>
                        {row.channel.role ? (
                          <span className={styles.channelRole}>{row.channel.role}</span>
                        ) : null}
                      </td>
                      <td>{formatNumber(row.visits)}</td>
                      <td>{formatNumber(row.leads)}</td>
                      <td>{formatNumber(row.orders)}</td>
                      <td>{formatRub(row.revenue)}</td>
                      <td>{formatRub(row.cost)}</td>
                      <td>{formatRub(row.cpl)}</td>
                      <td>{formatPercent(row.conversionRate)}</td>
                      <td>{formatPercent(row.roi)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Внести статистику за день</h2>
        </div>
        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGridCompact}>
              <label className={styles.field}>
                <span>Канал</span>
                <select
                  value={form.channelId}
                  onChange={(e) => setForm((f) => ({ ...f, channelId: e.target.value }))}
                  required
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.priority}. {ch.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Дата</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>Визиты</span>
                <input
                  type="number"
                  min={0}
                  value={form.visits}
                  onChange={(e) => setForm((f) => ({ ...f, visits: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Лиды</span>
                <input
                  type="number"
                  min={0}
                  value={form.leads}
                  onChange={(e) => setForm((f) => ({ ...f, leads: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Заказы</span>
                <input
                  type="number"
                  min={0}
                  value={form.orders}
                  onChange={(e) => setForm((f) => ({ ...f, orders: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Выручка, ₽</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.revenue}
                  onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Затраты, ₽</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.cost}
                  onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                />
              </label>
            </div>
            <p className={styles.sectionHint}>
              Если запись за выбранный день уже есть — она будет обновлена.
            </p>
            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить метрику'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Последние записи</h2>
        </div>
        <div className={styles.card}>
          {metrics.length === 0 ? (
            <p className={styles.empty}>Записей пока нет — внесите первую статистику выше.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Канал</th>
                    <th>Визиты</th>
                    <th>Лиды</th>
                    <th>Заказы</th>
                    <th>Выручка</th>
                    <th>Затраты</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {new Date(row.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td>{row.channel.name}</td>
                      <td>{formatNumber(row.visits)}</td>
                      <td>{formatNumber(row.leads)}</td>
                      <td>{formatNumber(row.orders)}</td>
                      <td>{formatRub(row.revenue)}</td>
                      <td>{formatRub(row.cost)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => void handleDelete(row)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdvertisingStrategyPageShell>
  );
}
