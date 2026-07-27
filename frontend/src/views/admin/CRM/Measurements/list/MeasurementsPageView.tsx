'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Measurement } from '@/shared/api/admin-crm';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import {
  MEASUREMENT_STATUS_OPTIONS,
  getMeasurementStatusLabel,
} from '../shared/measurementStatuses';
import {
  MEASUREMENTS_PAGE_LIMIT_OPTIONS,
  type MeasurementsPageLimit,
} from '../shared/measurementsListFilters';
import { MeasurementsListFiltersPanel } from './MeasurementsListFiltersPanel';
import { MeasurementsListRulesInfoTip } from './MeasurementsListRulesInfoTip';
import styles from './MeasurementsPage.module.css';
import type { MeasurementsPageModel } from './hooks/useMeasurementsPage';
import { formatDate, formatUser, measurementsFilterFieldClass } from './measurements-page.utils';

type MeasurementsPageViewProps = {
  model: MeasurementsPageModel;
};

function chipClass(active: boolean): string {
  return `${styles.chip}${active ? ` ${styles.chipActive}` : ''}`;
}

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
    listScope,
    setListScope,
    scopeCounts,
    statusCounts,
    measurementSortBy,
    measurementSortOrder,
    linksByMeasurementId,
    fetchData,
    handleMeasurementSortChange,
  } = model;

  const showManagerFilter = listScope !== 'mine';

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
          <div className={styles.headerTitleGroup}>
            <h1 className={styles.title}>Замеры</h1>
            <MeasurementsListRulesInfoTip />
          </div>
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
          <Link data-admin-mutation href="/admin/measurements/new" className={styles.addButton}>
            + Новый замер
          </Link>
        </div>
      </div>

      <div className={styles.filtersStack}>
        <MeasurementsListFiltersPanel
          listScope={listScope}
          statusFilter={statusFilter}
          search={search}
          managerFilter={managerFilter}
          managerOptions={managerOptions}
          directionFilter={directionFilter}
          directions={directions}
          dateFrom={dateFrom}
          dateTo={dateTo}
          limit={limit}
        >
          <div className={styles.chipRow} role="group" aria-label="Область списка замеров">
            <span className={styles.chipRowLabel}>Очередь</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(listScope === 'mine')}
              onClick={() => setListScope('mine')}
            >
              Мои ({scopeCounts.mine ?? 0})
            </button>
            <button
              type="button"
              disabled={loading}
              className={chipClass(listScope === 'my_directions')}
              onClick={() => setListScope('my_directions')}
            >
              Мои направления ({scopeCounts.my_directions ?? 0})
            </button>
            <button
              type="button"
              disabled={loading}
              className={chipClass(listScope === 'all')}
              onClick={() => setListScope('all')}
            >
              Все ({scopeCounts.all ?? 0})
            </button>
          </div>

          <div className={styles.chipRow} role="group" aria-label="Статус замера">
            <span className={styles.chipRowLabel}>Статус</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(statusFilter === '')}
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
            >
              Все ({statusCounts[''] ?? total})
            </button>
            {MEASUREMENT_STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={loading}
                className={chipClass(statusFilter === o.value)}
                onClick={() => {
                  setStatusFilter(o.value);
                  setPage(1);
                }}
              >
                {o.label} ({statusCounts[o.value] ?? 0})
              </button>
            ))}
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
            {showManagerFilter ? (
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
            ) : null}
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
        </MeasurementsListFiltersPanel>
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
