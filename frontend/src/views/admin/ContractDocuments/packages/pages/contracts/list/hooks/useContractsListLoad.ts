import { useCallback, useEffect, useState } from 'react';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import {
  type ContractDocumentPackage,
  type ContractDocumentPackagesListCounts,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getRepairContractPackageTrash,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getMyCrmDirectionIds,
} from '@/shared/api/admin-crm';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import type { ContractsListScope } from '../contractsListFilters';
import { loadContractsListData } from '../contractsListLoad';
import type { ContractsListSortBy, ContractsListSortOrder } from '../contractsListSort';

export function useContractsListLoad(
  onLoadError: (message: string) => void,
  params: {
    listScope: ContractsListScope;
    currentUserId?: string | null;
    selectedDirectionIds: string[];
    statusFilters: string[];
    search: string;
    managerFilter: string;
    dateFrom: string;
    dateTo: string;
    sortBy: ContractsListSortBy;
    sortOrder: ContractsListSortOrder;
    page: number;
    limit: number;
  }
) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<ContractDocumentPackagesListCounts | null>(null);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [myDirectionIds, setMyDirectionIds] = useState<string[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [estimatePresets, setEstimatePresets] = useState<ContractEstimatePreset[]>([]);
  const [measurementsById, setMeasurementsById] = useState<Map<string, Measurement>>(new Map());
  const [documentObjects, setDocumentObjects] = useState<ContractDocumentObject[]>([]);

  const fetchContractTrashTotal = useCallback(
    () => getRepairContractPackageTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchContractTrashTotal);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const directionIds = await getMyCrmDirectionIds().catch(() => [] as string[]);
      const data = await loadContractsListData({
        listScope: params.listScope,
        currentUserId: params.currentUserId ?? null,
        preloadDirectionIds: directionIds,
        selectedDirectionIds: params.selectedDirectionIds,
        statusFilters: params.statusFilters,
        search: params.search,
        managerFilter: params.managerFilter,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        page: params.page,
        limit: params.limit,
      });
      setRows(data.rows);
      setTotal(data.total);
      setCounts(data.counts);
      setDocumentObjects(data.documentObjects);
      setCrmUsers(data.crmUsers);
      setDirections(data.directions);
      setMyDirectionIds(directionIds);
      setManagerOptions(data.managerOptions);
      setEstimatePresets(data.estimatePresets);
      setMeasurementsById(data.measurementsById);
    } catch (e) {
      onLoadError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      void refreshTrashCount();
    }
  }, [
    onLoadError,
    params.currentUserId,
    params.listScope,
    params.selectedDirectionIds,
    params.statusFilters,
    params.search,
    params.managerFilter,
    params.dateFrom,
    params.dateTo,
    params.sortBy,
    params.sortOrder,
    params.page,
    params.limit,
    refreshTrashCount,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    rows,
    total,
    counts,
    crmUsers,
    directions,
    myDirectionIds,
    managerOptions,
    estimatePresets,
    measurementsById,
    documentObjects,
    trashCount,
    refreshTrashCount,
    load,
  };
}
