'use client';

import { useState } from 'react';

import styles from './Dashboard.module.css';

interface DashboardStats {
  orders: {
    today: number;
    week: number;
    month: number;
    pending: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  alerts: {
    lowStockProducts: number;
    pendingTasks: number;
  };
  customers: {
    newThisMonth: number;
  };
}

// Mock data - replace with API calls
const mockStats: DashboardStats = {
  orders: {
    today: 12,
    week: 87,
    month: 342,
    pending: 8,
  },
  revenue: {
    today: 156000,
    week: 1234000,
    month: 5678000,
  },
  alerts: {
    lowStockProducts: 15,
    pendingTasks: 7,
  },
  customers: {
    newThisMonth: 48,
  },
};

const mockRecentOrders = [
  { id: '1', number: '#12345', customer: 'Иванов И.И.', total: 45000, status: 'PENDING' },
  { id: '2', number: '#12344', customer: 'Петров П.П.', total: 128000, status: 'PROCESSING' },
  { id: '3', number: '#12343', customer: 'Сидоров С.С.', total: 67000, status: 'SHIPPED' },
  { id: '4', number: '#12342', customer: 'Козлова К.К.', total: 89000, status: 'DELIVERED' },
  { id: '5', number: '#12341', customer: 'Николаев Н.Н.', total: 34000, status: 'PENDING' },
];

const mockTasks = [
  { id: '1', title: 'Позвонить клиенту ООО "Строй"', dueDate: '2026-01-19', priority: 'HIGH' },
  {
    id: '2',
    title: 'Подготовить коммерческое предложение',
    dueDate: '2026-01-20',
    priority: 'MEDIUM',
  },
  { id: '3', title: 'Обновить каталог товаров', dueDate: '2026-01-21', priority: 'LOW' },
];

export function Dashboard() {
  const [stats] = useState<DashboardStats>(mockStats);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает',
      PROCESSING: 'В обработке',
      SHIPPED: 'Отправлен',
      DELIVERED: 'Доставлен',
      CANCELLED: 'Отменен',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      PENDING: styles.statusPending,
      PROCESSING: styles.statusProcessing,
      SHIPPED: styles.statusShipped,
      DELIVERED: styles.statusDelivered,
      CANCELLED: styles.statusCancelled,
    };
    return classes[status] || '';
  };

  const getPriorityClass = (priority: string) => {
    const classes: Record<string, string> = {
      HIGH: styles.priorityHigh,
      MEDIUM: styles.priorityMedium,
      LOW: styles.priorityLow,
      URGENT: styles.priorityUrgent,
    };
    return classes[priority] || '';
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Дашборд</h1>
        <p className={styles.subtitle}>Добро пожаловать в панель управления</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📦</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.orders.today}</span>
            <span className={styles.statLabel}>Заказов сегодня</span>
          </div>
          <div className={styles.statTrend}>
            <span className={styles.trendPositive}>+12%</span>
            <span className={styles.trendLabel}>vs вчера</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatCurrency(stats.revenue.today)}</span>
            <span className={styles.statLabel}>Выручка сегодня</span>
          </div>
          <div className={styles.statTrend}>
            <span className={styles.trendPositive}>+8%</span>
            <span className={styles.trendLabel}>vs вчера</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.customers.newThisMonth}</span>
            <span className={styles.statLabel}>Новых клиентов</span>
          </div>
          <div className={styles.statTrend}>
            <span className={styles.trendPositive}>+25%</span>
            <span className={styles.trendLabel}>vs прошлый месяц</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.orders.pending}</span>
            <span className={styles.statLabel}>Ожидают обработки</span>
          </div>
          <div className={styles.statAction}>
            <a href="/admin/orders?status=PENDING">Обработать →</a>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats.alerts.lowStockProducts > 0 || stats.alerts.pendingTasks > 0) && (
        <div className={styles.alertsSection}>
          {stats.alerts.lowStockProducts > 0 && (
            <div className={`${styles.alert} ${styles.alertWarning}`}>
              <span className={styles.alertIcon}>⚠️</span>
              <span className={styles.alertText}>
                {stats.alerts.lowStockProducts} товаров с низким остатком
              </span>
              <a href="/admin/catalog/products?lowStock=true" className={styles.alertLink}>
                Посмотреть
              </a>
            </div>
          )}
          {stats.alerts.pendingTasks > 0 && (
            <div className={`${styles.alert} ${styles.alertInfo}`}>
              <span className={styles.alertIcon}>📋</span>
              <span className={styles.alertText}>
                {stats.alerts.pendingTasks} задач требуют внимания
              </span>
              <a href="/admin/crm/tasks" className={styles.alertLink}>
                Перейти
              </a>
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className={styles.contentGrid}>
        {/* Recent Orders */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Последние заказы</h2>
            <a href="/admin/orders" className={styles.cardLink}>
              Все заказы →
            </a>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Номер</th>
                  <th>Клиент</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <a href={`/admin/orders/${order.id}`}>{order.number}</a>
                    </td>
                    <td>{order.customer}</td>
                    <td>{formatCurrency(order.total)}</td>
                    <td>
                      <span className={`${styles.status} ${getStatusClass(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tasks */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Мои задачи</h2>
            <a href="/admin/crm/tasks" className={styles.cardLink}>
              Все задачи →
            </a>
          </div>
          <div className={styles.tasksList}>
            {mockTasks.map((task) => (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskContent}>
                  <span className={`${styles.taskPriority} ${getPriorityClass(task.priority)}`} />
                  <div className={styles.taskInfo}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={styles.taskDue}>До: {task.dueDate}</span>
                  </div>
                </div>
                <button className={styles.taskComplete}>✓</button>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Summary */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Выручка</h2>
            <a href="/admin/analytics/sales" className={styles.cardLink}>
              Подробнее →
            </a>
          </div>
          <div className={styles.revenueSummary}>
            <div className={styles.revenueItem}>
              <span className={styles.revenueLabel}>За неделю</span>
              <span className={styles.revenueValue}>{formatCurrency(stats.revenue.week)}</span>
            </div>
            <div className={styles.revenueItem}>
              <span className={styles.revenueLabel}>За месяц</span>
              <span className={styles.revenueValue}>{formatCurrency(stats.revenue.month)}</span>
            </div>
            <div className={styles.revenueChart}>
              {/* Placeholder for chart */}
              <div className={styles.chartPlaceholder}>📊 График выручки</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Быстрые действия</h2>
          </div>
          <div className={styles.quickActions}>
            <a href="/admin/catalog/products/new" className={styles.quickAction}>
              <span className={styles.quickActionIcon}>➕</span>
              <span>Добавить товар</span>
            </a>
            <a href="/admin/crm/customers/new" className={styles.quickAction}>
              <span className={styles.quickActionIcon}>👤</span>
              <span>Новый клиент</span>
            </a>
            <a href="/admin/content/home" className={styles.quickAction}>
              <span className={styles.quickActionIcon}>📄</span>
              <span>Управлять главной</span>
            </a>
            <a href="/admin/content/blog/new" className={styles.quickAction}>
              <span className={styles.quickActionIcon}>✏️</span>
              <span>Написать статью</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
