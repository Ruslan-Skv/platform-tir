'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ContractPayment,
  type CrmUser,
  getContractPayments,
  getCrmUsers,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './ContractPaymentsPage.module.css';

const PAYMENT_FORM_LABELS: Record<string, string> = {
  CASH: 'Наличные',
  TERMINAL: 'Терминал',
  QR: 'QR-код',
  INVOICE: 'По счёту',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Частичная оплата',
  FINAL: 'Окончательный расчёт',
  AMENDMENT: 'Оплата доп. соглашения',
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

export function ContractPaymentsPage() {
  const [data, setData] = useState<ContractPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [managerFilter, setManagerFilter] = useState('');
  const [paymentFormFilter, setPaymentFormFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContractPayments({
        page,
        limit,
        managerId: managerFilter || undefined,
        paymentForm: paymentFormFilter || undefined,
        paymentType: paymentTypeFilter || undefined,
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
  }, [page, limit, managerFilter, paymentFormFilter, paymentTypeFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const columns = [
    {
      key: 'paymentDate',
      title: 'Дата оплаты',
      render: (p: ContractPayment) => formatDate(p.paymentDate),
    },
    {
      key: 'contract',
      title: '№ договора',
      render: (p: ContractPayment) => p.contract?.contractNumber ?? '—',
    },
    {
      key: 'customerName',
      title: 'ФИО заказчика',
      render: (p: ContractPayment) => p.contract?.customerName ?? '—',
    },
    {
      key: 'totalAmount',
      title: 'Стоимость заказа',
      render: (p: ContractPayment) => formatMoney(p.contract?.totalAmount),
    },
    {
      key: 'amount',
      title: 'Сумма оплаты',
      render: (p: ContractPayment) => formatMoney(p.amount),
    },
    {
      key: 'percent',
      title: '% оплаты',
      render: (p: ContractPayment) => {
        const total = p.contractTotalPaid ?? 0;
        if (total <= 0) return '—';
        const pct = (Number(p.amount) / total) * 100;
        return `${pct.toFixed(1)}%`;
      },
    },
    {
      key: 'paymentForm',
      title: 'Форма оплаты',
      render: (p: ContractPayment) => PAYMENT_FORM_LABELS[p.paymentForm] ?? p.paymentForm,
    },
    {
      key: 'paymentType',
      title: 'Тип оплаты',
      render: (p: ContractPayment) => PAYMENT_TYPE_LABELS[p.paymentType] ?? p.paymentType,
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (p: ContractPayment) => formatUser(p.manager),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Оплаты по договорам</h1>
          <span className={styles.count}>{total} оплат</span>
        </div>
      </div>

      <div className={styles.filters}>
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
          value={paymentFormFilter}
          onChange={(e) => setPaymentFormFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все формы</option>
          {Object.entries(PAYMENT_FORM_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={paymentTypeFilter}
          onChange={(e) => setPaymentTypeFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все типы</option>
          {Object.entries(PAYMENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={styles.dateInput}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={styles.dateInput}
        />
      </div>

      <DataTable
        data={data}
        columns={columns}
        keyExtractor={(p) => p.id}
        loading={loading}
        emptyMessage="Нет оплат"
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
