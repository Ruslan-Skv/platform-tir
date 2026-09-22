import { useMemo } from 'react';

import type {
  ContractDocumentPackage,
  ContractDocumentPackagesListCounts,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import {
  type ContractsListColumnKey,
  countContractsListTableColSpan,
} from '../contractsListColumns';
import type { ContractsListScope, ContractsListViewMode } from '../contractsListFilters';
import {
  buildContractsListTableDisplayItems,
  countContractsListObjectGroups,
} from '../contractsListLayout';
import {
  CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS,
  CONTRACTS_LIST_STATUS_QUEUE_COUNT_KEY,
} from '../contractsListScope';
import type { ContractsListSortBy, ContractsListSortOrder } from '../contractsListSort';
import { contractsListMaxSignedAddendumSlotCount } from '../contractsListUtils';

export type UseContractsListDerivedDataParams = {
  rows: ContractDocumentPackage[];
  /** Server total after exact filters (not just current page). */
  serverTotal: number;
  serverCounts: ContractDocumentPackagesListCounts | null;
  searchNorm: string;
  managerFilter: string;
  statusFilters: string[];
  directionFilters: string[];
  listScope: ContractsListScope;
  currentUserId: string | null;
  myDirectionIds: string[];
  dateFrom: string;
  dateTo: string;
  directions: CrmDirection[];
  presetById: Map<string, ContractEstimatePreset>;
  measurementsById: Map<string, Measurement>;
  listSortBy: ContractsListSortBy;
  listSortOrder: ContractsListSortOrder;
  crmUsers: CrmUser[];
  listViewMode: ContractsListViewMode;
  expandedObjectIds: string[];
  page: number;
  limit: number;
  visibleColumns: readonly ContractsListColumnKey[];
};

export function useContractsListDerivedData(params: UseContractsListDerivedDataParams) {
  const addendumColumnCount = useMemo(
    () => contractsListMaxSignedAddendumSlotCount(params.rows.filter((r) => r.kind === 'REPAIR')),
    [params.rows]
  );

  const contractsListTableColSpan = useMemo(
    () => countContractsListTableColSpan(params.visibleColumns, addendumColumnCount),
    [params.visibleColumns, addendumColumnCount]
  );

  /** Rows already filtered + paginated by server. */
  const visibleRows = params.rows;

  const scopeCounts = useMemo((): Record<ContractsListScope, number> => {
    const c = params.serverCounts?.scope;
    return {
      mine: c?.mine ?? 0,
      my_directions: c?.my_directions ?? 0,
      all: c?.all ?? 0,
    };
  }, [params.serverCounts]);

  /** Счётчики чипов «Статус»: `all` — без фильтра по статусу, далее по pipeline-статусу. */
  const statusCounts = useMemo(() => {
    const q = params.serverCounts?.queue ?? {};
    const entries = [
      ['all', q.all ?? 0] as const,
      ...CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS.map(
        (opt) => [opt.value, q[CONTRACTS_LIST_STATUS_QUEUE_COUNT_KEY[opt.value]] ?? 0] as const
      ),
    ];
    return Object.fromEntries(entries) as Record<string, number>;
  }, [params.serverCounts]);

  const directionCounts = useMemo(() => {
    const d = params.serverCounts?.directions ?? {};
    const entries = params.directions.map(
      (direction) => [direction.id, d[direction.id] ?? 0] as const
    );
    return Object.fromEntries(entries) as Record<string, number>;
  }, [params.serverCounts, params.directions]);

  const tableDisplayItems = useMemo(
    () =>
      buildContractsListTableDisplayItems({
        listViewMode: params.listViewMode,
        visibleRows,
        expandedObjectIds: params.expandedObjectIds,
        listSortOrder: params.listSortOrder,
      }),
    [params.listViewMode, visibleRows, params.expandedObjectIds, params.listSortOrder]
  );

  const objectGroupCount = useMemo(
    () => countContractsListObjectGroups(tableDisplayItems, params.listViewMode),
    [tableDisplayItems, params.listViewMode]
  );

  /** Server total for package-level pagination. */
  const totalVisible = params.serverTotal;

  /** Already a server page — do not slice again. */
  const paginatedDisplayItems = tableDisplayItems;

  const emptyFilteredListMessage = useMemo(() => {
    if (params.serverTotal > 0 || params.rows.length > 0) return '';
    if (params.listScope === 'my_directions' && params.myDirectionIds.length === 0) {
      return 'Не назначены ваши направления. Укажите их в карточке пользователя (Пользователи).';
    }
    const hasActiveFilters = Boolean(
      params.searchNorm ||
      params.managerFilter ||
      params.statusFilters.length > 0 ||
      params.directionFilters.length > 0 ||
      params.dateFrom ||
      params.dateTo ||
      params.listScope !== 'all'
    );
    if (!hasActiveFilters) return '';
    if (params.listScope === 'mine') {
      return 'Нет ваших договоров по выбранным фильтрам.';
    }
    return 'Нет договоров по выбранным фильтрам.';
  }, [
    params.serverTotal,
    params.rows.length,
    params.searchNorm,
    params.managerFilter,
    params.statusFilters,
    params.directionFilters,
    params.dateFrom,
    params.dateTo,
    params.listScope,
    params.myDirectionIds.length,
  ]);

  return {
    addendumColumnCount,
    contractsListTableColSpan,
    visibleRows,
    tableDisplayItems,
    objectGroupCount,
    scopeCounts,
    statusCounts,
    directionCounts,
    totalVisible,
    paginatedDisplayItems,
    emptyFilteredListMessage,
  };
}
