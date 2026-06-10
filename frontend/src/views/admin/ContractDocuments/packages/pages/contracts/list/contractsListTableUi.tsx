import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import type { PackageListPipelineStatus } from '../../../platform/hub/packagePipeline';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';

export function ContractsListActPhotosTriggerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width={18} height={18} x={3} y={3} rx={2} ry={2} />
      <circle cx={8.5} cy={8.5} r={1.5} />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

export function contractsListPipelineStatusBadgeClass(st: PackageListPipelineStatus): string {
  const base = cdHub.contractsListStatusBadge;
  switch (st) {
    case 'IN_PROJECT':
      return `${base} ${cdHub.contractsListStatusBadgeInProject}`;
    case 'SIGNED':
      return `${base} ${cdHub.contractsListStatusBadgeSigned}`;
    case 'WORK_IN_PROGRESS':
      return `${base} ${cdHub.contractsListStatusBadgeWork}`;
    case 'CLOSED':
      return `${base} ${cdHub.contractsListStatusBadgeClosed}`;
    case 'REFUSED':
      return `${base} ${cdHub.contractsListStatusBadgeRefused}`;
  }
}

export function ContractsListSortableTh({
  column,
  title,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: ContractsListSortBy;
  title: string;
  sortBy: ContractsListSortBy;
  sortOrder: ContractsListSortOrder;
  onSort: (column: ContractsListSortBy) => void;
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
