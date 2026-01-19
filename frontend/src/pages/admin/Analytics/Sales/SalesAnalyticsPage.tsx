'use client';

import { useState } from 'react';

import styles from './SalesAnalyticsPage.module.css';

export function SalesAnalyticsPage() {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Mock data
  const overview = {
    totalRevenue: 5678000,
    totalOrders: 342,
    avgOrderValue: 16602,
    totalProductsSold: 856,
  };

  const topProducts = [
    { name: 'Дверь входная Аргус ДА-61', quantity: 45, revenue: 2025000 },
    { name: 'Дверь межкомнатная Porta-22', quantity: 78, revenue: 975000 },
    { name: 'Дверь входная Torex Delta', quantity: 32, revenue: 1440000 },
    { name: 'Фурнитура дверная Комплект', quantity: 124, revenue: 434000 },
    { name: 'Замок врезной Kale', quantity: 89, revenue: 267000 },
  ];

  const topCategories = [
    { name: 'Входные двери', revenue: 3200000, orders: 156 },
    { name: 'Межкомнатные двери', revenue: 1450000, orders: 98 },
    { name: 'Фурнитура', revenue: 678000, orders: 234 },
    { name: 'Замки', revenue: 350000, orders: 87 },
  ];

  const salesByDay = [
    { date: '2026-01-13', revenue: 156000, orders: 12 },
    { date: '2026-01-14', revenue: 234000, orders: 18 },
    { date: '2026-01-15', revenue: 189000, orders: 15 },
    { date: '2026-01-16', revenue: 278000, orders: 21 },
    { date: '2026-01-17', revenue: 312000, orders: 24 },
    { date: '2026-01-18', revenue: 198000, orders: 16 },
    { date: '2026-01-19', revenue: 256000, orders: 19 },
  ];

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

      {/* Overview Cards */}
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

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Динамика продаж</h2>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#6366f1' }} />
                Выручка
              </span>
              <span className={styles.legendItem}>
                <span className={styles.legendDot} style={{ background: '#10b981' }} />
                Заказы
              </span>
            </div>
          </div>
          <div className={styles.chartPlaceholder}>
            {/* Replace with actual chart component */}
            <div className={styles.barsContainer}>
              {salesByDay.map((day) => (
                <div key={day.date} className={styles.barGroup}>
                  <div
                    className={styles.bar}
                    style={{
                      height: `${(day.revenue / 350000) * 100}%`,
                      background: '#6366f1',
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

      {/* Tables Row */}
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
