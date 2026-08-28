'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import { useAdminAccessibleResources } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import {
  type AdminDashboardSettings,
  type CatalogActivityResponse,
  type CatalogActivityRow,
  DEFAULT_ADMIN_DASHBOARD_SETTINGS,
  type DashboardTrainingDynamicsResponse,
  getAdminDashboardSettings,
  getCatalogActivity,
  getDashboardTrainingDynamics,
} from '@/shared/api/admin-dashboard';
import type { AdminDashboardSectionId } from '@/shared/lib/admin-dashboard-sections';
import { getInitials } from '@/shared/lib/avatar';
import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './Dashboard.module.css';
import { CalendarDashboardWidget } from './components/CalendarDashboardWidget';
import { DashboardSettingsButton } from './components/DashboardSettingsButton';
import { TrainingDynamicsWidget } from './components/TrainingDynamicsWidget';

function formatPerson(row: CatalogActivityRow): string {
  const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return n || row.email;
}

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

function chartFillToneClass(index: number): string {
  switch (index % 8) {
    case 0:
      return styles.chartFillTone0;
    case 1:
      return styles.chartFillTone1;
    case 2:
      return styles.chartFillTone2;
    case 3:
      return styles.chartFillTone3;
    case 4:
      return styles.chartFillTone4;
    case 5:
      return styles.chartFillTone5;
    case 6:
      return styles.chartFillTone6;
    default:
      return styles.chartFillTone7;
  }
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
                  className={`${styles.chartFill} ${chartFillToneClass(index)}`}
                  style={{ width: `${widthPct}%` }}
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

function CatalogActivityWidget({
  loading,
  rows,
}: {
  loading: boolean;
  rows: CatalogActivityRow[];
}) {
  const sumInPeriod = rows.reduce((s, r) => s + r.countInPeriod, 0);
  const sumTotalCreated = rows.reduce((s, r) => s + r.totalCreated, 0);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={styles.panelIcon} aria-hidden>
          📦
        </span>
        <h2 className={styles.panelTitle}>Товары</h2>
      </div>
      {loading ? (
        <p className={styles.empty}>Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>
          Нет данных: за период никто не создавал товары (или у карточек не указан автор).
        </p>
      ) : (
        <>
          <div className={styles.chartsWrap}>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>За выбранный период</h3>
              <ActivityBarChart
                rows={rows}
                valueKey="countInPeriod"
                aria-label="Товары: сравнение по числу созданных записей за период"
              />
            </div>
            <div className={styles.chartBlock}>
              <h3 className={styles.chartTitle}>Всего за всё время</h3>
              <ActivityBarChart
                rows={rows}
                valueKey="totalCreated"
                aria-label="Товары: сравнение по всем созданным записям за всё время"
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
                    <td data-label="Администратор">
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
                    <td className={styles.colNum} data-label="За период">
                      <span className={styles.badgePeriod}>{row.countInPeriod}</span>
                    </td>
                    <td className={styles.colPct} data-label="% пер.">
                      <span className={styles.pctCell}>
                        {formatSharePercent(row.countInPeriod, sumInPeriod)}
                      </span>
                    </td>
                    <td className={styles.colNum} data-label="Всего">
                      <span className={styles.badgeTotal}>{row.totalCreated}</span>
                    </td>
                    <td className={styles.colPct} data-label="% всего">
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
  const { user } = useAuth();
  const { hasAccess } = useAdminAccessibleResources();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isTrainee = user?.role === 'TRAINEE';
  const hasCalendarAccess = hasAccess('admin.calendar');

  const defaultRange = useMemo(() => {
    const now = new Date();
    const from = startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = endOfDayLocal(now);
    return { from, to };
  }, []);

  const [settings, setSettings] = useState<AdminDashboardSettings>(
    DEFAULT_ADMIN_DASHBOARD_SETTINGS
  );
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [fromInput, setFromInput] = useState(() => toDateInputValue(defaultRange.from));
  const [toInput, setToInput] = useState(() => toDateInputValue(defaultRange.to));
  const [catalogData, setCatalogData] = useState<CatalogActivityResponse | null>(null);
  const [trainingData, setTrainingData] = useState<DashboardTrainingDynamicsResponse | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCatalogWidget = settings.catalogActivityVisible;
  const showTrainingWidget = settings.trainingDynamicsVisible && !isTrainee;
  const showCalendarWidget = settings.calendarVisible && hasCalendarAccess;
  const showDateToolbar = showCatalogWidget || showTrainingWidget;

  useEffect(() => {
    void getAdminDashboardSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_ADMIN_DASHBOARD_SETTINGS))
      .finally(() => setSettingsLoaded(true));
  }, []);

  const loadWidgets = useCallback(async () => {
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

    const tasks: Promise<void>[] = [];

    if (showCatalogWidget) {
      setCatalogLoading(true);
      tasks.push(
        getCatalogActivity(from, to)
          .then(setCatalogData)
          .catch((e) => {
            setCatalogData(null);
            throw e;
          })
          .finally(() => setCatalogLoading(false))
      );
    } else {
      setCatalogData(null);
    }

    if (showTrainingWidget) {
      setTrainingLoading(true);
      tasks.push(
        getDashboardTrainingDynamics(fromInput, toInput)
          .then(setTrainingData)
          .catch((e) => {
            setTrainingData(null);
            throw e;
          })
          .finally(() => setTrainingLoading(false))
      );
    } else {
      setTrainingData(null);
    }

    if (tasks.length === 0) return;

    try {
      await Promise.all(tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    }
  }, [fromInput, toInput, showCatalogWidget, showTrainingWidget]);

  useEffect(() => {
    if (!settingsLoaded) return;
    void loadWidgets();
  }, [settingsLoaded, settings, isTrainee, fromInput, toInput, loadWidgets]);

  const applyPreset = (days: number) => {
    const to = endOfDayLocal(new Date());
    const from = startOfDayLocal(new Date(to.getTime() - days * 24 * 60 * 60 * 1000));
    setFromInput(toDateInputValue(from));
    setToInput(toDateInputValue(to));
  };

  const thisMonth = () => {
    const now = new Date();
    const from = startOfDayLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = endOfDayLocal(now);
    setFromInput(toDateInputValue(from));
    setToInput(toDateInputValue(to));
  };

  const rangeFrom = catalogData?.from ?? trainingData?.period.from;
  const rangeTo = catalogData?.to ?? trainingData?.period.to;

  const enabledQuickLinks = useMemo(
    () => settings.quickLinks.filter((link) => link.isEnabled),
    [settings.quickLinks]
  );

  const hasAnyVisibleSection = useMemo(() => {
    if (showTrainingWidget || showCatalogWidget || showCalendarWidget) return true;
    return enabledQuickLinks.length > 0;
  }, [showTrainingWidget, showCatalogWidget, showCalendarWidget, enabledQuickLinks.length]);

  const renderDashboardSection = (sectionId: AdminDashboardSectionId) => {
    switch (sectionId) {
      case 'trainingDynamics':
        return showTrainingWidget ? (
          <TrainingDynamicsWidget key={sectionId} data={trainingData} loading={trainingLoading} />
        ) : null;
      case 'catalogActivity':
        return showCatalogWidget ? (
          <CatalogActivityWidget
            key={sectionId}
            loading={catalogLoading}
            rows={catalogData?.products ?? []}
          />
        ) : null;
      case 'calendar':
        return showCalendarWidget ? <CalendarDashboardWidget key={sectionId} /> : null;
      case 'quickLinks':
        return enabledQuickLinks.length > 0 ? (
          <section key={sectionId} className={styles.quickLinks}>
            <h2 className={styles.quickTitle}>Быстрые ссылки</h2>
            <div className={styles.quickGrid}>
              {enabledQuickLinks.map((link) => (
                <Link
                  key={link.id}
                  href={getSafeHref(link.href, '/admin')}
                  className={styles.quickLink}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroRow}>
          <h1 className={styles.title}>Дашборд</h1>
          {isSuperAdmin ? <DashboardSettingsButton onSettingsChange={setSettings} /> : null}
        </div>
      </header>

      {showDateToolbar ? (
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
                onClick={() => void loadWidgets()}
                disabled={catalogLoading || trainingLoading}
              >
                {catalogLoading || trainingLoading ? 'Загрузка…' : 'Показать'}
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
      ) : null}

      {error && <div className={styles.errorBanner}>{error}</div>}

      {rangeFrom && rangeTo && showDateToolbar && (
        <p className={styles.rangeHint}>
          Период:{' '}
          <strong>
            {new Date(rangeFrom).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}{' '}
            —{' '}
            {new Date(rangeTo).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </strong>
        </p>
      )}

      {!hasAnyVisibleSection && settingsLoaded && (
        <p className={styles.emptyState}>
          На дашборде не включено ни одного блока.
          {isSuperAdmin ? ' Откройте «Настройки» и выберите нужные виджеты.' : null}
        </p>
      )}

      <div className={styles.sections}>
        {settings.sectionOrder.map((sectionId) => renderDashboardSection(sectionId))}
      </div>
    </div>
  );
}
