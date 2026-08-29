'use client';

import type { Measurement } from '@/shared/api/admin-crm';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';

import { MeasurementsListMobileCards } from '../list/MeasurementsListMobileCards';
import styles from '../list/MeasurementsPage.module.css';
import {
  formatDate,
  formatUser,
  measurementsFilterFieldClass,
} from '../list/measurements-page.utils';
import {
  MEASUREMENT_STATUS_OPTIONS,
  getMeasurementStatusLabel,
} from '../shared/measurementStatuses';
import type { MeasurementsPageLimit } from '../shared/measurementsListFilters';
import type { MyMeasurementsPageModel } from './hooks/useMyMeasurementsPage';

type Props = {
  model: MyMeasurementsPageModel;
};

function chipClass(active: boolean): string {
  return `${styles.chip}${active ? ` ${styles.chipActive}` : ''}`;
}

export function MyMeasurementsPageView({ model }: Props) {
  const {
    data,
    total,
    page,
    setPage,
    limit,
    setLimit,
    pageLimitOptions,
    loading,
    directions,
    statusFilter,
    setStatusFilter,
    directionFilter,
    setDirectionFilter,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sortBy,
    sortOrder,
    statusCounts,
    linksByMeasurementId,
    message,
    fetchData,
    handleSortChange,
    openMeasurement,
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

  const countTitle = `${total} замеров`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitleRow}>
            <div className={styles.headerTitleCluster}>
              <div className={styles.headerTitleGroup}>
                <h1 className={styles.title}>Мои замеры</h1>
              </div>
              <span className={styles.count} title={countTitle}>
                <span className={styles.countDesktop}>{countTitle}</span>
                <span className={styles.countMobile}>{total}</span>
              </span>
            </div>
            <div className={styles.headerIconActionsMobile}>
              <AdminListRefreshButton
                onClick={() => void fetchData()}
                disabled={loading}
                busy={loading}
                title="Обновить мои замеры"
                aria-label="Обновить мои замеры"
              />
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.headerIconActionsDesktop}>
            <AdminListRefreshButton
              onClick={() => void fetchData()}
              disabled={loading}
              busy={loading}
              title="Обновить мои замеры"
              aria-label="Обновить мои замеры"
            />
          </div>
        </div>
      </div>

      {message ? (
        <p className={styles.pageError} role="alert">
          {message}
        </p>
      ) : null}

      <p className={styles.pageLead}>
        Показаны замеры, где вы назначены замерщиком. Откройте карточку, чтобы внести результаты.
      </p>

      <div className={styles.filtersStack}>
        <div className={styles.chipRow} role="group" aria-label="Статус замера">
          <span className={styles.chipRowLabel}>Статус</span>
          <button
            type="button"
            disabled={loading}
            className={chipClass(statusFilter === '')}
            onClick={() => setStatusFilter('')}
          >
            Все ({statusCounts[''] ?? total})
          </button>
          {MEASUREMENT_STATUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={loading}
              className={chipClass(statusFilter === o.value)}
              onClick={() => setStatusFilter(o.value)}
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
            onChange={(e) => setSearch(e.target.value)}
            className={measurementsFilterFieldClass(
              styles.searchInput,
              Boolean(search.trim()),
              styles.filterActive
            )}
            aria-label="Поиск по ФИО, адресу, телефону"
          />
          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
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
          <div className={styles.dateFilters}>
            <label className={styles.dateLabel}>
              <span className={styles.dateLabelText}>Дата от</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
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
                onChange={(e) => setDateTo(e.target.value)}
                className={measurementsFilterFieldClass(
                  styles.dateInput,
                  Boolean(dateTo),
                  styles.filterActive
                )}
                aria-label="Дата до"
              />
            </label>
          </div>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value) as MeasurementsPageLimit)}
            disabled={loading}
            className={styles.pageLimitSelect}
            aria-label="Количество строк на странице"
          >
            {pageLimitOptions.map((n) => (
              <option key={n} value={n}>
                {n} на странице
              </option>
            ))}
          </select>
        </div>
      </div>

      <MeasurementsListMobileCards
        data={data}
        loading={loading}
        directions={directions}
        linksByMeasurementId={linksByMeasurementId}
        onOpen={openMeasurement}
      />

      <DataTable
        containerClassName={styles.directoryTable}
        paginationClassName={styles.directoryPagination}
        paginationActiveClassName={styles.directoryPaginationPageActive}
        data={data}
        columns={columns}
        keyExtractor={(m) => m.id}
        onRowClick={openMeasurement}
        serverSideSort
        controlledSortBy={sortBy}
        controlledSortOrder={sortOrder}
        onSortChange={handleSortChange}
        loading={loading}
        emptyMessage="Нет назначенных вам замеров"
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
