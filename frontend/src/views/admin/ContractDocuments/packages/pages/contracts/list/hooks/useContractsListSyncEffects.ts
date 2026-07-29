import { useEffect } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import type { ContractsListScope, ContractsListViewMode } from '../contractsListFilters';

export type UseContractsListSyncEffectsParams = {
  searchNorm: string;
  managerFilter: string;
  statusFilters: string[];
  directionFilters: string[];
  listScope: ContractsListScope;
  dateFrom: string;
  dateTo: string;
  listViewMode: ContractsListViewMode;
  setPage: (page: number) => void;
  setExpandedObjectId: (id: string | null) => void;
  totalVisible: number;
  limit: number;
  page: number;
  managerOptions: ContractSignatoryProfile[];
  setManagerFilter: (value: string) => void;
  directions: CrmDirection[];
  setDirectionFilters: (value: string[] | ((prev: string[]) => string[])) => void;
};

export function useContractsListSyncEffects({
  searchNorm,
  managerFilter,
  statusFilters,
  directionFilters,
  listScope,
  dateFrom,
  dateTo,
  listViewMode,
  setPage,
  setExpandedObjectId,
  totalVisible,
  limit,
  page,
  managerOptions,
  setManagerFilter,
  directions,
  setDirectionFilters,
}: UseContractsListSyncEffectsParams) {
  useEffect(() => {
    setPage(1);
    setExpandedObjectId(null);
  }, [
    searchNorm,
    managerFilter,
    statusFilters,
    directionFilters,
    listScope,
    dateFrom,
    dateTo,
    listViewMode,
    setPage,
    setExpandedObjectId,
  ]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalVisible / limit));
    if (page > totalPages) setPage(totalPages);
  }, [totalVisible, limit, page, setPage]);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerOptions, setManagerFilter]);

  useEffect(() => {
    if (directionFilters.length === 0) return;
    const valid = new Set(directions.map((d) => d.id));
    const next = directionFilters.filter((id) => valid.has(id));
    if (next.length !== directionFilters.length) {
      setDirectionFilters(next);
    }
  }, [directionFilters, directions, setDirectionFilters]);
}
