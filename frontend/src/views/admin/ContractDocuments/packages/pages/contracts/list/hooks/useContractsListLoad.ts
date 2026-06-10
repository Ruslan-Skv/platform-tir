import { useCallback, useEffect, useState } from 'react';

import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import {
  type ContractDocumentPackage,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getRepairContractPackageTrash,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import { loadContractsListData } from '../contractsListLoad';

export function useContractsListLoad(onLoadError: (message: string) => void) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
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
      const data = await loadContractsListData();
      setRows(data.rows);
      setDocumentObjects(data.documentObjects);
      setCrmUsers(data.crmUsers);
      setDirections(data.directions);
      setManagerOptions(data.managerOptions);
      setEstimatePresets(data.estimatePresets);
      setMeasurementsById(data.measurementsById);
    } catch (e) {
      onLoadError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      void refreshTrashCount();
    }
  }, [onLoadError, refreshTrashCount]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    loading,
    rows,
    crmUsers,
    directions,
    managerOptions,
    estimatePresets,
    measurementsById,
    documentObjects,
    trashCount,
    refreshTrashCount,
    load,
  };
}
