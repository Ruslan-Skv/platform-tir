import { useEffect } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import type { ContractsListViewMode } from '../contractsListFilters';

export type UseContractsListSyncEffectsParams = {
  searchNorm: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
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
  setDirectionFilter: (value: string) => void;
};

export function useContractsListSyncEffects({
  searchNorm,
  managerFilter,
  statusFilter,
  directionFilter,
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
  setDirectionFilter,
}: UseContractsListSyncEffectsParams) {
  useEffect(() => {
    setPage(1);
  }, [
    searchNorm,
    managerFilter,
    statusFilter,
    directionFilter,
    dateFrom,
    dateTo,
    listViewMode,
    setPage,
  ]);

  useEffect(() => {
    if (listViewMode === 'flat') setExpandedObjectId(null);
  }, [listViewMode, setExpandedObjectId]);

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
    if (!directionFilter) return;
    if (!directions.some((d) => d.id === directionFilter)) {
      setDirectionFilter('');
    }
  }, [directionFilter, directions, setDirectionFilter]);
}
