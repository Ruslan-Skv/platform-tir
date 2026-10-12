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

/** «Отложить»: пауза заказчика (подумать, сделать позже). */
export function EstimatesDeferIcon() {
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
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
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

export function EstimatesPreviewIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-2)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
