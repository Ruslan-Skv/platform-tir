'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Measurement } from '@/shared/api/admin-crm';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './MeasurementsPage.module.css';
import type { MeasurementsPageModel } from './hooks/useMeasurementsPage';
import { MEASUREMENT_STATUS_OPTIONS, getMeasurementStatusLabel } from './measurementStatuses';
import { formatDate, formatUser, measurementsFilterFieldClass } from './measurements-page.utils';
import {
  MEASUREMENTS_PAGE_LIMIT_OPTIONS,
  type MeasurementsPageLimit,
} from './measurementsListFilters';

type MeasurementsPageViewProps = {
  model: MeasurementsPageModel;
};

export function MeasurementsPageView({ model }: MeasurementsPageViewProps) {
  const router = useRouter();
  const {
    data,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    directions,
    managerOptions,
    statusFilter,
    setStatusFilter,
    managerFilter,
    setManagerFilter,
    directionFilter,
    setDirectionFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    measurementSortBy,
    measurementSortOrder,
    linksByMeasurementId,
    fetchData,
    handleMeasurementSortChange,
  } = model;

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
          <AdminListRefreshButton
            onClick={() => void fetchData()}
            disabled={loading}
            busy={loading}
            title="Обновить список замеров"
            aria-label="Обновить список замеров"
          />
          <Link href="/admin/measurements/new" className={styles.addButton}>
            + Новый замер
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по ФИО, адресу, телефону..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className={measurementsFilterFieldClass(
            styles.searchInput,
            Boolean(search.trim()),
            styles.filterActive
          )}
          aria-label="Поиск по ФИО, адресу, телефону"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={measurementsFilterFieldClass(
            styles.select,
            Boolean(statusFilter),
            styles.filterActive
          )}
          aria-label="Статус"
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
          onChange={(e) => {
            setManagerFilter(e.target.value);
            setPage(1);
          }}
          className={measurementsFilterFieldClass(
            styles.select,
            Boolean(managerFilter),
            styles.filterActive
          )}
          aria-label="Менеджер"
        >
          <option value="">Все менеджеры</option>
          {managerOptions.map((p) => (
            <option key={p.crmUserId} value={p.crmUserId}>
              {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
            </option>
          ))}
        </select>
        <select
          value={directionFilter}
          onChange={(e) => {
            setDirectionFilter(e.target.value);
            setPage(1);
          }}
          className={measurementsFilterFieldClass(
            styles.select,
            Boolean(directionFilter),
            styles.filterActive
          )}
          aria-label="Направление"
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
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className={measurementsFilterFieldClass(
              styles.dateInput,
              Boolean(dateFrom),
              styles.filterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={styles.dateLabel}>
          <span className={styles.dateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className={measurementsFilterFieldClass(
              styles.dateInput,
              Boolean(dateTo),
              styles.filterActive
            )}
            aria-label="Дата до"
          />
        </label>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value) as MeasurementsPageLimit);
            setPage(1);
          }}
          disabled={loading}
          className={styles.pageLimitSelect}
          aria-label="Количество строк на странице"
        >
          {MEASUREMENTS_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>

      <DataTable
        containerClassName={styles.directoryTable}
        paginationClassName={styles.directoryPagination}
        paginationActiveClassName={styles.directoryPaginationPageActive}
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
