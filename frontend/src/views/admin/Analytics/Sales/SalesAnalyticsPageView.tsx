'use client';

import styles from './SalesAnalyticsPage.module.css';
import type { SalesAnalyticsPageModel } from './hooks/useSalesAnalyticsPage';
import { overview, salesByDay, topCategories, topProducts } from './sales-analytics-page.constants';
import { formatCurrency } from './sales-analytics-page.utils';

type SalesAnalyticsPageViewProps = {
  model: SalesAnalyticsPageModel;
};

export function SalesAnalyticsPageView({ model }: SalesAnalyticsPageViewProps) {
  const { period, setPeriod, dateFrom, setDateFrom, dateTo, setDateTo } = model;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Аналитика продаж</h1>
        <div className={styles.filters}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className={styles.select}
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="quarter">Квартал</option>
            <option value="year">Год</option>
            <option value="custom">Произвольный период</option>
          </select>
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={styles.dateInput}
              />
              <span>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={styles.dateInput}
              />
            </>
          )}
        </div>
      </div>

      <div className={styles.overviewGrid}>
        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>💰</div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{formatCurrency(overview.totalRevenue)}</span>
            <span className={styles.overviewLabel}>Общая выручка</span>
          </div>
          <div className={styles.overviewTrend}>
            <span className={styles.trendUp}>+15.3%</span>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>📦</div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{overview.totalOrders}</span>
            <span className={styles.overviewLabel}>Всего заказов</span>
          </div>
          <div className={styles.overviewTrend}>
            <span className={styles.trendUp}>+8.2%</span>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>💳</div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{formatCurrency(overview.avgOrderValue)}</span>
            <span className={styles.overviewLabel}>Средний чек</span>
          </div>
          <div className={styles.overviewTrend}>
            <span className={styles.trendUp}>+6.5%</span>
          </div>
        </div>

        <div className={styles.overviewCard}>
          <div className={styles.overviewIcon}>🛍️</div>
          <div className={styles.overviewContent}>
            <span className={styles.overviewValue}>{overview.totalProductsSold}</span>
            <span className={styles.overviewLabel}>Продано товаров</span>
          </div>
          <div className={styles.overviewTrend}>
            <span className={styles.trendUp}>+12.1%</span>
          </div>
        </div>
      </div>

      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Динамика продаж</h2>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotRevenue}`} />
                Выручка
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotOrders}`} />
                Заказы
              </span>
            </div>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.barsContainer}>
              {salesByDay.map((day) => (
                <div key={day.date} className={styles.barGroup}>
                  <div
                    className={`${styles.bar} ${styles.barRevenue}`}
                    style={{
                      height: `${(day.revenue / 350000) * 100}%`,
                    }}
                  />
                  <span className={styles.barLabel}>
                    {new Date(day.date).toLocaleDateString('ru-RU', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tablesRow}>
        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Топ товаров</h2>
            <a href="/admin/analytics/products" className={styles.cardLink}>
              Все товары →
            </a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Продано</th>
                <th>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, index) => (
                <tr key={index}>
                  <td>
                    <span className={styles.rank}>{index + 1}</span>
                    {product.name}
                  </td>
                  <td>{product.quantity} шт.</td>
                  <td>{formatCurrency(product.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Топ категорий</h2>
            <a href="/admin/analytics/categories" className={styles.cardLink}>
              Все категории →
            </a>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Категория</th>
                <th>Заказов</th>
                <th>Выручка</th>
              </tr>
            </thead>
            <tbody>
              {topCategories.map((category, index) => (
                <tr key={index}>
                  <td>
                    <span className={styles.rank}>{index + 1}</span>
                    {category.name}
                  </td>
                  <td>{category.orders}</td>
                  <td>{formatCurrency(category.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
