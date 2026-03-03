'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import type { Contract } from '@/shared/api/admin-crm';
import { getContracts } from '@/shared/api/admin-crm';

import styles from './PayrollManagementPage.module.css';

const TABLE_HEADERS = [
  { key: 'contractNumber', title: '№ договора', width: '100px' },
  { key: 'contractDate', title: 'Дата заключения', width: '110px' },
  { key: 'deliveryDate', title: 'Дата сдачи', width: '110px' },
  { key: 'contractAmount', title: 'Стоимость договора (без дс)', width: '140px' },
  { key: 'ds1', title: 'дс 1', width: '80px' },
  { key: 'ds2', title: 'дс 2', width: '80px' },
  { key: 'ds3', title: 'дс 3', width: '80px' },
  { key: 'ds4', title: 'дс 4', width: '80px' },
  { key: 'ds5', title: 'дс 5', width: '80px' },
  { key: 'payment1', title: 'Оплата 1', width: '90px' },
  { key: 'payment2', title: 'Оплата 2', width: '90px' },
  { key: 'payment3', title: 'Оплата 3', width: '90px' },
  { key: 'payment4', title: 'Оплата 4', width: '90px' },
  { key: 'payment5', title: 'Оплата 5', width: '90px' },
  { key: 'payment6', title: 'Оплата 6', width: '90px' },
  { key: 'payment7', title: 'Оплата 7', width: '90px' },
  { key: 'salaryContract', title: 'з/п дог.', width: '90px' },
  { key: 'salaryDs', title: 'з/п дс', width: '90px' },
];

function formatDate(s: string | null | undefined): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatMoney(v: string | number | null | undefined): string {
  if (v == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function isDateInPeriod(
  dateStr: string | null | undefined,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateStr || !dateFrom || !dateTo) return false;
  const d = dateStr.slice(0, 10);
  return d >= dateFrom && d <= dateTo;
}

function contractToRow(
  c: Contract,
  options: { dateFrom: string; dateTo: string; prepaymentPct: string }
): Record<string, string> {
  const amendments = (c.amendments ?? [])
    .slice(0, 5)
    .sort((a, b) => (a.number ?? 99) - (b.number ?? 99));
  const dsByIndex = [amendments[0], amendments[1], amendments[2], amendments[3], amendments[4]];

  const payments = (c.payments ?? [])
    .slice()
    .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
    .slice(0, 7);

  const contractDateInPeriod = isDateInPeriod(c.contractDate, options.dateFrom, options.dateTo);
  const deliveryDateInPeriod = isDateInPeriod(c.actWorkEndDate, options.dateFrom, options.dateTo);
  const pct = parseFloat(options.prepaymentPct.replace(',', '.')) || 0;
  const amount = Number(c.totalAmount) || 0;

  let salaryContractValue = 0;
  if (amount <= 0) {
    // не считаем
  } else if (contractDateInPeriod && deliveryDateInPeriod) {
    // Обе даты в периоде: стоимость договора × 1%
    salaryContractValue = amount * (1 / 100);
  } else if (contractDateInPeriod) {
    // Только дата заключения в периоде: стоимость × предоплата% × 1%
    salaryContractValue = amount * (pct / 100) * (1 / 100);
  } else if (deliveryDateInPeriod) {
    // Только дата сдачи в периоде: стоимость × (100% − предоплата%) × 1%
    salaryContractValue = amount * ((100 - pct) / 100) * (1 / 100);
  }

  return {
    contractNumber: c.contractNumber ?? '—',
    contractDate: formatDate(c.contractDate),
    deliveryDate: formatDate(c.actWorkEndDate),
    contractAmount: formatMoney(c.totalAmount),
    ds1: dsByIndex[0] ? `${formatMoney(dsByIndex[0].amount)}` : '—',
    ds2: dsByIndex[1] ? `${formatMoney(dsByIndex[1].amount)}` : '—',
    ds3: dsByIndex[2] ? `${formatMoney(dsByIndex[2].amount)}` : '—',
    ds4: dsByIndex[3] ? `${formatMoney(dsByIndex[3].amount)}` : '—',
    ds5: dsByIndex[4] ? `${formatMoney(dsByIndex[4].amount)}` : '—',
    payment1: payments[0] ? formatMoney(payments[0].amount) : '—',
    payment2: payments[1] ? formatMoney(payments[1].amount) : '—',
    payment3: payments[2] ? formatMoney(payments[2].amount) : '—',
    payment4: payments[3] ? formatMoney(payments[3].amount) : '—',
    payment5: payments[4] ? formatMoney(payments[4].amount) : '—',
    payment6: payments[5] ? formatMoney(payments[5].amount) : '—',
    payment7: payments[6] ? formatMoney(payments[6].amount) : '—',
    salaryContract: salaryContractValue > 0 ? formatMoney(salaryContractValue) : '—',
    salaryDs: '—',
  };
}

function getDefaultPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    dateFrom: from.toISOString().slice(0, 10),
    dateTo: now.toISOString().slice(0, 10),
  };
}

export function PayrollManagementPage() {
  const [dateFrom, setDateFrom] = useState(() => getDefaultPeriod().dateFrom);
  const [dateTo, setDateTo] = useState(() => getDefaultPeriod().dateTo);
  const [prepaymentPct, setPrepaymentPct] = useState('70');

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      contracts.map((c) =>
        contractToRow(c, {
          dateFrom: dateFrom || '',
          dateTo: dateTo || '',
          prepaymentPct,
        })
      ),
    [contracts, dateFrom, dateTo, prepaymentPct]
  );

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getContracts({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: 1,
        limit: 500,
      });
      setContracts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки договоров');
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/admin/crm/payroll" className={styles.backLink}>
            ← Расчёт з/п
          </Link>
          <h1 className={styles.title}>Управление</h1>
        </div>
      </header>

      <div className={styles.filters}>
        <label className={styles.filterLabel}>
          Период с
          <input
            type="date"
            className={styles.filterDateInput}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="Дата начала периода"
          />
        </label>
        <label className={styles.filterLabel}>
          по
          <input
            type="date"
            className={styles.filterDateInput}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="Дата окончания периода"
          />
        </label>
        <label className={styles.filterLabel}>
          Предоплата:
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="%"
            className={styles.filterNumberInput}
            value={prepaymentPct}
            onChange={(e) => setPrepaymentPct(e.target.value.replace(',', '.'))}
            aria-label="Размер предоплаты в процентах"
          />
          <span className={styles.filterUnit}>%</span>
        </label>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadContracts}
          disabled={loading}
        >
          {loading ? 'Загрузка…' : 'Обновить'}
        </button>
      </div>

      {error && (
        <div className={styles.messageError} role="alert">
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {TABLE_HEADERS.map((col) => (
                <th key={col.key} style={{ minWidth: col.width }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className={styles.emptyCell}>
                  Загрузка…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={TABLE_HEADERS.length} className={styles.emptyCell}>
                  Нет договоров за выбранный период.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={idx}>
                  {TABLE_HEADERS.map((col) => (
                    <td key={col.key}>{row[col.key] ?? '—'}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
