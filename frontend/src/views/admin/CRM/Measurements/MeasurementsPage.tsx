'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
} from '@/shared/api/admin-crm';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './MeasurementsPage.module.css';
import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  loadMeasurementListSort,
  parseMeasurementListSortBy,
  persistMeasurementListSort,
} from './measurementListSort';
import { MEASUREMENT_STATUS_OPTIONS, getMeasurementStatusLabel } from './measurementStatuses';

function formatDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU');
}

function formatUser(u: { firstName?: string | null; lastName?: string | null } | null | undefined) {
  if (!u) return '—';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
}

interface MeasurementLinksInfo {
  estimateId: string;
  estimateTitle: string;
  packageId?: string;
  packageTitle?: string;
}

export function MeasurementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<Measurement[]>([]);
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
  const [measurementSortBy, setMeasurementSortBy] = useState<MeasurementListSortBy>(
    () => loadMeasurementListSort().sortBy
  );
  const [measurementSortOrder, setMeasurementSortOrder] = useState<MeasurementListSortOrder>(
    () => loadMeasurementListSort().sortOrder
  );

  useEffect(() => {
    persistMeasurementListSort(measurementSortBy, measurementSortOrder);
  }, [measurementSortBy, measurementSortOrder]);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q && q.trim()) setSearch(q.trim());
  }, [searchParams]);

  const [linksByMeasurementId, setLinksByMeasurementId] = useState<
    Record<string, MeasurementLinksInfo>
  >({});

  const extractEstimatePresetIdsFromPackageForm = (formData: unknown): string[] => {
    if (!formData || typeof formData !== 'object') return [];
    const estimate = (formData as Record<string, unknown>).estimate;
    if (!estimate || typeof estimate !== 'object') return [];
    const rawIds = (estimate as Record<string, unknown>).estimatePresetIds;
    if (!Array.isArray(rawIds)) return [];
    return rawIds
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim());
  };

  const chooseLatestByUpdatedAt = <T extends { updatedAt?: string }>(items: T[]): T | null => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => {
      const da = new Date(a.updatedAt ?? 0).getTime();
      const db = new Date(b.updatedAt ?? 0).getTime();
      return db - da;
    })[0];
  };

  const loadMeasurementLinks = useCallback(async (measurements: Measurement[]) => {
    const measurementIds = new Set(measurements.map((m) => m.id));
    if (measurementIds.size === 0) {
      setLinksByMeasurementId({});
      return;
    }
    try {
      const [{ items: estimates }, packages] = await Promise.all([
        getContractDocumentEstimatePresets('REPAIR'),
        getContractDocumentPackages('REPAIR'),
      ]);
      const estimatesByMeasurement = new Map<string, ContractEstimatePreset[]>();
      for (const estimate of estimates) {
        const sourceMeasurementId = estimate.sourceMeasurementId?.trim();
        if (!sourceMeasurementId || !measurementIds.has(sourceMeasurementId)) continue;
        const bucket = estimatesByMeasurement.get(sourceMeasurementId) ?? [];
        bucket.push(estimate);
        estimatesByMeasurement.set(sourceMeasurementId, bucket);
      }

      const packagesByEstimateId = new Map<string, ContractDocumentPackage[]>();
      for (const pkg of packages) {
        const estimateIds = extractEstimatePresetIdsFromPackageForm(pkg.formData);
        for (const estimateId of estimateIds) {
          const bucket = packagesByEstimateId.get(estimateId) ?? [];
          bucket.push(pkg);
          packagesByEstimateId.set(estimateId, bucket);
        }
      }

      const nextMap: Record<string, MeasurementLinksInfo> = {};
      for (const measurement of measurements) {
        const relatedEstimates = estimatesByMeasurement.get(measurement.id) ?? [];
        const latestEstimate = chooseLatestByUpdatedAt(relatedEstimates);
        if (!latestEstimate) continue;
        const relatedPackages = packagesByEstimateId.get(latestEstimate.id) ?? [];
        const latestPackage = chooseLatestByUpdatedAt(relatedPackages);
        nextMap[measurement.id] = {
          estimateId: latestEstimate.id,
          estimateTitle: latestEstimate.title || 'Расчёт',
          ...(latestPackage
            ? {
                packageId: latestPackage.id,
                packageTitle: latestPackage.title || 'Пакет документов',
              }
            : {}),
        };
      }
      setLinksByMeasurementId(nextMap);
    } catch {
      setLinksByMeasurementId({});
    }
  }, []);

  const handleMeasurementSortChange = useCallback(
    (sortBy: string, sortOrder: MeasurementListSortOrder) => {
      setMeasurementSortBy(parseMeasurementListSortBy(sortBy));
      setMeasurementSortOrder(sortOrder);
      setPage(1);
    },
    []
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMeasurements({
        page,
        limit,
        status: statusFilter || undefined,
        managerId: managerFilter || undefined,
        directionId: directionFilter || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy: measurementSortBy,
        sortOrder: measurementSortOrder,
      });
      setData(res.data);
      setTotal(res.total);
      await loadMeasurementLinks(res.data);
    } catch (err) {
      console.error(err);
      setData([]);
      setTotal(0);
      setLinksByMeasurementId({});
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    statusFilter,
    managerFilter,
    directionFilter,
    search,
    dateFrom,
    dateTo,
    measurementSortBy,
    measurementSortOrder,
    loadMeasurementLinks,
  ]);

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

  const renderDirection = (m: Measurement) => {
    const primary = m.direction?.name;
    const extra =
      m.additionalDirections?.map((d) => d.name).filter(Boolean) ??
      (m.additionalDirectionIds ?? [])
        .map((id) => directions.find((d) => d.id === id)?.name)
        .filter(Boolean);
    if (primary && extra.length > 0) return `${primary} (+${extra.join(', ')})`;
    if (primary) return primary;
    if (extra.length > 0) return extra.join(', ');
    return '—';
  };

  const columns = [
    {
      key: 'receptionDate',
      title: 'Дата',
      sortable: true,
      sortKey: 'receptionDate',
      render: (m: Measurement) => formatDate(m.receptionDate),
    },
    {
      key: 'executionDate',
      title: 'Дата замера',
      sortable: true,
      sortKey: 'executionDate',
      render: (m: Measurement) => formatDate(m.executionDate),
    },
    {
      key: 'managerId',
      title: 'Менеджер',
      render: (m: Measurement) => formatUser(m.manager),
    },
    {
      key: 'surveyorId',
      title: 'Замерщик',
      render: (m: Measurement) => formatUser(m.surveyor),
    },
    {
      key: 'directionId',
      title: 'Направление',
      render: renderDirection,
    },
    {
      key: 'customerName',
      title: 'ФИО заказчика',
      render: (m: Measurement) => m.customerName || '—',
    },
    {
      key: 'customerAddress',
      title: 'Адрес',
      render: (m: Measurement) => m.customerAddress || '—',
    },
    {
      key: 'customerPhone',
      title: 'Телефон',
      render: (m: Measurement) => m.customerPhone || '—',
    },
    {
      key: 'status',
      title: 'Статус',
      sortable: true,
      sortKey: 'status',
      render: (m: Measurement) => (
        <span className={`${styles.badge} ${styles[`status${m.status}`] ?? ''}`}>
          {getMeasurementStatusLabel(m.status)}
        </span>
      ),
    },
    {
      key: 'links',
      title: 'Связи',
      render: (m: Measurement) => {
        const links = linksByMeasurementId[m.id];
        if (!links) {
          return <span className={styles.muted}>Нет связанного расчёта</span>;
        }
        return (
          <div>
            <div className={styles.linkStateOk}>Расчёт создан</div>
            {links.packageId ? (
              <div className={styles.linkStateDone}>Договор создан</div>
            ) : (
              <div className={styles.linkStatePending}>Договор не создан</div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Замеры</h1>
          <span className={styles.count}>{total} замеров</span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.secondaryButton} ${styles.refreshButton}`}
            onClick={() => void fetchData()}
            disabled={loading}
            title="Обновить список замеров"
            aria-label="Обновить список замеров"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? styles.refreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <Link href="/admin/measurements/new" className={styles.addButton}>
            + Добавить замер
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по ФИО, адресу, телефону..."
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
          {MEASUREMENT_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
              {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
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
        containerClassName={styles.directoryTable}
        data={data}
        columns={columns}
        keyExtractor={(m) => m.id}
        onRowClick={(m) => router.push(`/admin/measurements/${m.id}`)}
        serverSideSort
        controlledSortBy={measurementSortBy}
        controlledSortOrder={measurementSortOrder}
        onSortChange={handleMeasurementSortChange}
        loading={loading}
        emptyMessage="Нет замеров"
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
