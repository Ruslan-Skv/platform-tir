import { useMemo } from 'react';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type {
  ContractDocumentPackage,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import type { ContractsListViewMode } from '../contractsListFilters';
import {
  buildContractsListTableDisplayItems,
  countContractsListObjectGroups,
  filterContractsListVisibleRows,
  paginateContractsListDisplayItems,
} from '../contractsListLayout';
import type { ContractsListSortBy, ContractsListSortOrder } from '../contractsListSort';
import { contractsListMaxSignedAddendumSlotCount } from '../contractsListUtils';

export type UseContractsListDerivedDataParams = {
  rows: ContractDocumentPackage[];
  searchNorm: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
  dateFrom: string;
  dateTo: string;
  directions: CrmDirection[];
  presetById: Map<string, ContractEstimatePreset>;
  measurementsById: Map<string, Measurement>;
  listSortBy: ContractsListSortBy;
  listSortOrder: ContractsListSortOrder;
  crmUsers: CrmUser[];
  listViewMode: ContractsListViewMode;
  documentObjects: ContractDocumentObject[];
  objectsById: Map<string, ContractDocumentObject>;
  expandedObjectId: string | null;
  page: number;
  limit: number;
};

export function useContractsListDerivedData(params: UseContractsListDerivedDataParams) {
  const addendumColumnCount = useMemo(
    () => contractsListMaxSignedAddendumSlotCount(params.rows.filter((r) => r.kind === 'REPAIR')),
    [params.rows]
  );

  const contractsListTableColSpan = 15 + addendumColumnCount + (addendumColumnCount > 0 ? 1 : 0);

  const visibleRows = useMemo(
    () =>
      filterContractsListVisibleRows({
        rows: params.rows,
        searchNorm: params.searchNorm,
        managerFilter: params.managerFilter,
        statusFilter: params.statusFilter,
        directionFilter: params.directionFilter,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        directions: params.directions,
        presetById: params.presetById,
        measurementsById: params.measurementsById,
        listSortBy: params.listSortBy,
        listSortOrder: params.listSortOrder,
        crmUsers: params.crmUsers,
        addendumColumnCount,
      }),
    [
      params.rows,
      params.searchNorm,
      params.managerFilter,
      params.statusFilter,
      params.directionFilter,
      params.dateFrom,
      params.dateTo,
      params.directions,
      params.presetById,
      params.measurementsById,
      params.listSortBy,
      params.listSortOrder,
      params.crmUsers,
      addendumColumnCount,
    ]
  );

  const tableDisplayItems = useMemo(
    () =>
      buildContractsListTableDisplayItems({
        listViewMode: params.listViewMode,
        visibleRows,
        documentObjects: params.documentObjects,
        objectsById: params.objectsById,
        expandedObjectId: params.expandedObjectId,
        listSortOrder: params.listSortOrder,
      }),
    [
      params.listViewMode,
      visibleRows,
      params.documentObjects,
      params.objectsById,
      params.expandedObjectId,
      params.listSortOrder,
    ]
  );

  const objectGroupCount = useMemo(
    () => countContractsListObjectGroups(tableDisplayItems, params.listViewMode),
    [tableDisplayItems, params.listViewMode]
  );

  const totalVisible =
    params.listViewMode === 'flat' ? visibleRows.length : tableDisplayItems.length;

  const paginatedDisplayItems = useMemo(
    () => paginateContractsListDisplayItems(tableDisplayItems, params.page, params.limit),
    [tableDisplayItems, params.page, params.limit]
  );

  const emptyFilteredListMessage = useMemo(() => {
    if (params.rows.length === 0) return '';
    const hasActiveFilters = Boolean(
      params.searchNorm ||
      params.managerFilter ||
      params.statusFilter ||
      params.directionFilter ||
      params.dateFrom ||
      params.dateTo
    );
    if (!hasActiveFilters) return '';
    return 'Нет договоров по выбранным фильтрам.';
  }, [
    params.rows.length,
    params.searchNorm,
    params.managerFilter,
    params.statusFilter,
    params.directionFilter,
    params.dateFrom,
    params.dateTo,
  ]);

  return {
    addendumColumnCount,
    contractsListTableColSpan,
    visibleRows,
    tableDisplayItems,
    objectGroupCount,
    totalVisible,
    paginatedDisplayItems,
    emptyFilteredListMessage,
  };
}
