'use client';

import React, { useCallback, useEffect, useState } from 'react';

import {
  type CrmUser,
  type FunnelStageStat,
  getCrmUsers,
  getFunnelStats,
} from '@/shared/api/admin-crm';

import styles from './FunnelPage.module.css';

const STAGE_LABELS: Record<string, string> = {
  NEW: 'Новая',
  CONTACTED: 'Контакт',
  QUALIFIED: 'Квалификация',
  PROPOSAL: 'Предложение',
  NEGOTIATION: 'Переговоры',
  WON: 'Победа',
  LOST: 'Поражение',
};

const STAGE_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

function formatMoney(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(n)) return '0 ₽';
  return (
    new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n) + ' ₽'
  );
}

export function FunnelPage() {
  const [managers, setManagers] = useState<CrmUser[]>([]);
  const [managerId, setManagerId] = useState<string>('');
  const [stats, setStats] = useState<FunnelStageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadManagers = useCallback(async () => {
    try {
      const list = await getCrmUsers();
      setManagers(list);
    } catch {
      setManagers([]);
    }
  }, []);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFunnelStats(managerId || undefined);
      const ordered = STAGE_ORDER.map((stage) => data.find((s) => s.stage === stage)).filter(
        (s): s is FunnelStageStat => !!s
      );
      setStats(ordered.length ? ordered : data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки воронки');
      setStats([]);
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  const totalDeals = stats.reduce((acc, s) => acc + s.count, 0);
  const totalValue = stats.reduce((acc, s) => {
    const v = typeof s.totalValue === 'string' ? parseFloat(s.totalValue) : s.totalValue;
    return acc + (Number.isNaN(v) ? 0 : v);
  }, 0);

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
