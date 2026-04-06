'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type CatalogActivityResponse,
  type CatalogActivityRow,
  getCatalogActivity,
} from '@/shared/api/admin-dashboard';
import { getInitials } from '@/shared/lib/avatar';

import styles from './Dashboard.module.css';

function formatPerson(row: CatalogActivityRow): string {
  const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return n || row.email;
}

/** Доля `part` от `total` в процентах (для отображения в UI). */
function formatSharePercent(part: number, total: number): string {
  if (total <= 0) return '0%';
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(part / total);
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInput(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

const CHART_BAR_HUES = [250, 265, 280, 220, 200, 310, 235, 295] as const;

function chartBarColor(index: number): string {
  const h = CHART_BAR_HUES[index % CHART_BAR_HUES.length];
  return `hsl(${h} 65% 48%)`;
}

function ActivityBarChart({
  rows,
  valueKey,
  'aria-label': ariaLabel,
}: {
  rows: CatalogActivityRow[];
  valueKey: 'countInPeriod' | 'totalCreated';
  'aria-label': string;
}) {
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b[valueKey] - a[valueKey]),
    [rows, valueKey]
  );
  const totalSum = useMemo(() => rows.reduce((s, r) => s + r[valueKey], 0), [rows, valueKey]);

  return (
    <div className={styles.chart} role="img" aria-label={ariaLabel}>
      <p className={styles.chartHint}>
        Столбцы — доля каждого администратора от суммы по таблице ({totalSum} шт.).
      </p>
      <ul className={styles.chartList}>
        {sorted.map((row, index) => {
          const v = row[valueKey];
          const widthPct = totalSum > 0 ? (v / totalSum) * 100 : 0;
          const shareLabel = formatSharePercent(v, totalSum);
          return (
            <li key={row.userId} className={styles.chartRow}>
              <span className={styles.chartName} title={formatPerson(row)}>
                {formatPerson(row)}
              </span>
              <div className={styles.chartTrack}>
                <div
                  className={styles.chartFill}
                  style={{
                    width: `${widthPct}%`,
                    background: chartBarColor(index),
                  }}
                />
              </div>
              <span className={styles.chartNum}>
                <span className={styles.chartCount}>{v}</span>
                <span className={styles.chartPct} title="Доля от суммы">
                  {shareLabel}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ActivityTable({
  title,
  icon,
  rows,
  emptyHint,
  loading,
}: {
  title: string;
  icon: string;
  rows: CatalogActivityRow[];
  emptyHint: string;
  loading: boolean;
}) {
  const sumInPeriod = rows.reduce((s, r) => s + r.countInPeriod, 0);
  const sumTotalCreated = rows.reduce((s, r) => s + r.totalCreated, 0);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelIcon} aria-hidden>
          {icon}
        </span>
        <h2 className={styles.panelTitle}>{title}</h2>
      </div>
      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>{emptyHint}</p>
      ) : (
        <>
          <div className={styles.chartsWrap}>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>За выбранный период</h3>
              <ActivityBarChart
                rows={rows}
                valueKey="countInPeriod"
                aria-label={`${title}: сравнение по числу созданных записей за период`}
              />
            </div>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>Всего за всё время</h3>
              <ActivityBarChart
                rows={rows}
                valueKey="totalCreated"
                aria-label={`${title}: сравнение по всем созданным записям за всё время`}
              />
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Администратор</th>
                  <th className={styles.colNum}>За период</th>
                  <th
                    className={styles.colPct}
                    title="Доля от суммы созданных за период по всем администраторам в таблице"
                  >
                    % пер.
                  </th>
                  <th className={styles.colNum}>Всего</th>
                  <th
                    className={styles.colPct}
                    title="Доля от суммы всего созданного по всем администраторам в таблице"
                  >
                    % всего
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.avatar} aria-hidden>
                          {getInitials(row.firstName, row.lastName, row.email)}
                        </span>
                        <div className={styles.userText}>
                          <span className={styles.userName}>{formatPerson(row)}</span>
                          <span className={styles.userEmail}>{row.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.colNum}>
                      <span className={styles.badgePeriod}>{row.countInPeriod}</span>
                    </td>
                    <td className={styles.colPct}>
                      <span className={styles.pctCell}>
                        {formatSharePercent(row.countInPeriod, sumInPeriod)}
                      </span>
                    </td>
                    <td className={styles.colNum}>
                      <span className={styles.badgeTotal}>{row.totalCreated}</span>
                    </td>
                    <td className={styles.colPct}>
                      <span className={styles.pctCell}>
                        {formatSharePercent(row.totalCreated, sumTotalCreated)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export function Dashboard() {
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: startOfDayLocal(from), to: endOfDayLocal(to) };
  }, []);

  const [fromInput, setFromInput] = useState(() => toDateInputValue(defaultRange.from));
  const [toInput, setToInput] = useState(() => toDateInputValue(defaultRange.to));
  const [data, setData] = useState<CatalogActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const fromD = parseDateInput(fromInput);
    const toD = parseDateInput(toInput);
    if (!fromD || !toD) {
      setError('Укажите корректные даты');
      return;
    }
    const from = startOfDayLocal(fromD);
    const to = endOfDayLocal(toD);
    if (from > to) {
      setError('Дата «с» не может быть позже «по»');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await getCatalogActivity(from, to);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [fromInput, toInput]);

  useEffect(() => {
    void load();
    // Только начальная загрузка; дальше — кнопка «Показать» и пресеты
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRange = useCallback((from: Date, to: Date) => {
    setFromInput(toDateInputValue(from));
    setToInput(toDateInputValue(to));
    setLoading(true);
    setError(null);
    getCatalogActivity(from, to)
      .then(setData)
      .catch((e) => {
        setData(null);
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => setLoading(false));
  }, []);

  const applyPreset = (days: number) => {
    const to = endOfDayLocal(new Date());
    const from = startOfDayLocal(new Date(to.getTime() - days * 24 * 60 * 60 * 1000));
    fetchRange(from, to);
  };

  const thisMonth = () => {
    const now = new Date();
    const from = startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = endOfDayLocal(now);
    fetchRange(from, to);
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.title}>Дашборд</h1>
          <p className={styles.subtitle}>
            Активность по каталогу: диаграммы и таблица показывают, кто сколько карточек товаров
            создал за выбранный период и за всё время.
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <div className={styles.dateRow}>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>С</span>
              <input
                type="date"
                className={styles.dateInput}
                value={fromInput}
                onChange={(e) => setFromInput(e.target.value)}
              />
            </label>
            <span className={styles.dateSep}>—</span>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>По</span>
              <input
                type="date"
                className={styles.dateInput}
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => load()}
              disabled={loading}
            >
              {loading ? 'Загрузка…' : 'Показать'}
            </button>
          </div>
          <div className={styles.presets}>
            <span className={styles.presetsLabel}>Быстро:</span>
            <button type="button" className={styles.chip} onClick={() => applyPreset(7)}>
              7 дней
            </button>
            <button type="button" className={styles.chip} onClick={() => applyPreset(30)}>
              30 дней
            </button>
            <button type="button" className={styles.chip} onClick={thisMonth}>
              С начала месяца
            </button>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {data && (
        <p className={styles.rangeHint}>
          Период:{' '}
          <strong>
            {new Date(data.from).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}{' '}
            —{' '}
            {new Date(data.to).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </strong>
        </p>
      )}

      <div className={styles.grid}>
        <ActivityTable
          title="Товары"
          icon="📦"
          loading={loading}
          rows={data?.products ?? []}
          emptyHint="Нет данных: за период никто не создавал товары (или у карточек не указан автор)."
        />
      </div>

      <section className={styles.quickLinks}>
        <h2 className={styles.quickTitle}>Быстрые ссылки</h2>
        <div className={styles.quickGrid}>
          <Link href="/admin/catalog/products" className={styles.quickLink}>
            Каталог товаров
          </Link>
          <Link href="/admin/catalog/categories" className={styles.quickLink}>
            Категории
          </Link>
          <Link href="/admin/catalog/products/new" className={styles.quickLink}>
            Новый товар
          </Link>
          <Link href="/admin/orders" className={styles.quickLink}>
            Заказы
          </Link>
        </div>
      </section>
    </div>
  );
}
