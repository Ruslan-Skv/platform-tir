import { useCallback, useEffect, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractSignatoryProfile,
} from '@/shared/api/admin-contract-document-packages';

import { loadEstimatesListData } from '../estimatesListLoad';
import type { EstimatesListWorkspacePackage } from '../estimatesListPackageUsage';

export function useEstimatesListLoad(onLoadError: (message: string) => void) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [groups, setGroups] = useState<ContractEstimateGroup[]>([]);
  const [workspacePackages, setWorkspacePackages] = useState<EstimatesListWorkspacePackage[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);

  const fetchEstimatesFromServer = useCallback(async () => {
    const data = await loadEstimatesListData();
    setItems(data.items);
    setGroups(data.groups);
    setWorkspacePackages(data.workspacePackages);
    setManagerOptions(data.managerOptions);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await fetchEstimatesFromServer();
      } catch (e) {
        onLoadError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchEstimatesFromServer, onLoadError]);

  return {
    loading,
    refreshing,
    setRefreshing,
    items,
    setItems,
    groups,
    setGroups,
    workspacePackages,
    setWorkspacePackages,
    managerOptions,
    fetchEstimatesFromServer,
  };
}
