'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type Contract,
  type CrmDirection,
  type CrmUser,
  getContracts,
  getCrmDirections,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ContractsPage.module.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
};

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatMoney(v: string | number | null | undefined) {
  if (v == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

function getEffectiveAmount(c: Contract): number {
  const total = Number(c.totalAmount);
  const discount = Number(c.discount ?? 0);
  const base = Math.max(0, total - discount);
  const amendmentsTotal = (c.amendments ?? []).reduce(
    (s, a) => s + Number(a.amount) - Number(a.discount ?? 0),
    0
  );
  return base + amendmentsTotal;
}

export function ContractsPage() {
  const router = useRouter();
  const [data, setData] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContracts({
        page,
        limit,
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, managerFilter, directionFilter, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const columns = [
    { key: 'contractNumber', title: '№ договора' },
    {
      key: 'contractDate',
      title: 'Дата заключения',
      render: (c: Contract) => formatDate(c.contractDate),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (c: Contract) => (
        <span className={`${styles.badge} ${styles[`status${c.status}`] ?? ''}`}>
          {STATUS_LABELS[c.status] ?? c.status}
        </span>
      ),
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (c: Contract) => c.direction?.name ?? '—',
    },
    { key: 'manager', title: 'Менеджер', render: (c: Contract) => formatUser(c.manager) },
    { key: 'customerName', title: 'ФИО заказчика' },
    { key: 'customerAddress', title: 'Адрес', render: (c: Contract) => c.customerAddress || '—' },
    {
      key: 'totalAmount',
      title: 'Стоимость',
      render: (c: Contract) => formatMoney(getEffectiveAmount(c)),
    },
    {
      key: 'paidAmount',
      title: 'Оплачено',
      render: (c: Contract) => {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const pct = effectiveAmount > 0 ? ((paid / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(paid)} (${pct}%)`;
      },
    },
    {
      key: 'remaining',
      title: 'Остаток',
      render: (c: Contract) => {
        const effectiveAmount = getEffectiveAmount(c);
        const paid =
          (c as Contract & { payments?: Array<{ amount: string | number }> }).payments?.reduce(
            (s, p) => s + Number(p.amount),
            0
          ) ?? Number(c.advanceAmount);
        const remain = Math.max(0, effectiveAmount - paid);
        const pct = effectiveAmount > 0 ? ((remain / effectiveAmount) * 100).toFixed(1) : '—';
        return `${formatMoney(remain)} (${pct}%)`;
      },
    },
    {
      key: 'installationDate',
      title: 'Дата монтажа',
      render: (c: Contract) => formatDate(c.installationDate),
    },
    {
      key: 'deliveryDate',
      title: 'Дата доставки',
      render: (c: Contract) => formatDate(c.deliveryDate),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Договоры</h1>
          <span className={styles.count}>{total} договоров</span>
        </div>
        <Link href="/admin/crm/contracts/new" className={styles.addButton}>
          + Добавить договор
        </Link>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по № договора, ФИО, адресу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все менеджеры</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {[u.firstName, u.lastName].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все направления</option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className={styles.dateLabel}>
          <span className={styles.dateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className={styles.dateInput}
          />
        </label>
        <label className={styles.dateLabel}>
          <span className={styles.dateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className={styles.dateInput}
          />
        </label>
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(c) => c.id}
        onRowClick={(c) => router.push(`/admin/crm/contracts/${c.id}`)}
        loading={loading}
        emptyMessage="Нет договоров"
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
