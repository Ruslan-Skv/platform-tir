'use client';

import styles from './FunnelPage.module.css';
import { STAGE_LABELS } from './funnel-page.constants';
import { formatMoney } from './funnel-page.utils';
import type { FunnelPageModel } from './hooks/useFunnelPage';

type FunnelPageViewProps = {
  model: FunnelPageModel;
};

export function FunnelPageView({ model }: FunnelPageViewProps) {
  const {
    managers,
    managerId,
    setManagerId,
    stats,
    loading,
    error,
    loadFunnel,
    totalDeals,
    totalValue,
  } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Воронка продаж</h1>
          <span className={styles.count}>
            {totalDeals} {totalDeals === 1 ? 'сделка' : 'сделок'}
          </span>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Менеджер
          <select
            className={styles.filterSelect}
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            aria-label="Фильтр по менеджеру"
          >
            <option value="">Все</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {[m.firstName, m.lastName].filter(Boolean).join(' ') || m.email}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className={styles.refreshBtn} onClick={loadFunnel} disabled={loading}>
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {error && (
        <div className={styles.messageError} role="alert">
          {error}
        </div>
      )}

      {!error && (
        <>
          <div className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Всего сделок</span>
              <span className={styles.summaryValue}>{totalDeals}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Сумма по воронке</span>
              <span className={styles.summaryValue}>{formatMoney(totalValue)}</span>
            </div>
          </div>

          {loading ? (
            <div className={styles.loading}>Загрузка воронки…</div>
          ) : (
            <div className={styles.funnel} role="list">
              {stats.map((item) => (
                <div key={item.stage} className={styles.stageCard} role="listitem">
                  <div className={styles.stageHeader}>
                    <span className={styles.stageName}>
                      {STAGE_LABELS[item.stage] ?? item.stage}
                    </span>
                    <span className={styles.stageCount}>{item.count}</span>
                  </div>
                  <div className={styles.stageValue}>{formatMoney(item.totalValue)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
