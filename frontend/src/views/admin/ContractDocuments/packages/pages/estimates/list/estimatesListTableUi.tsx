'use client';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';

import { type EstimatesListSortBy, type EstimatesListSortOrder } from './estimatesListSort';

export function EstimatesListSortableTh({
  column,
  title,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: EstimatesListSortBy;
  title: string;
  sortBy: EstimatesListSortBy;
  sortOrder: EstimatesListSortOrder;
  onSort: (column: EstimatesListSortBy) => void;
}) {
  const isActive = sortBy === column;
  return (
    <th
      className={dataTableStyles.sortable}
      onClick={(e) => {
        e.stopPropagation();
        onSort(column);
      }}
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={dataTableStyles.headerContent}>
        {title}
        <span
          className={`${dataTableStyles.sortIcon} ${
            isActive ? dataTableStyles.sortIconActive : dataTableStyles.sortIconIdle
          }`}
          aria-hidden
        >
          {isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

export function unifiedGroupIdForEstimates(items: ContractEstimatePreset[]): string | null {
  const ids = new Set(
    items.map((it) => it.groupId?.trim()).filter((id): id is string => Boolean(id))
  );
  if (ids.size !== 1) return null;
  return [...ids][0];
}

export function EstimatesArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-3)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 8v13H3V8" />
      <path d="M23 3v5H1V3z" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function EstimatesRestoreFromArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-1)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

export function EstimatesToProspectIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-4)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function EstimatesToActiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-1)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}
