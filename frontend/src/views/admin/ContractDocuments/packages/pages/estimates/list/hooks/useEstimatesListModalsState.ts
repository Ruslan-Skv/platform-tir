import { useCallback, useMemo, useState } from 'react';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import { getContractDocumentEstimatePresetsTrash } from '@/shared/api/contract-documents/admin-contract-document-estimate-presets-trash';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import type { EstimateTrashConfirmState } from '../../modals/EstimateTrashConfirmModal';
import type { EstimatePackageUsage } from '../estimatesListUtils';

export function useEstimatesListModalsState(items: ContractEstimatePreset[]) {
  const [detachEditModal, setDetachEditModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [trashConfirmModal, setTrashConfirmModal] = useState<EstimateTrashConfirmState | null>(
    null
  );
  const [trashOpen, setTrashOpen] = useState(false);
  const [workScopeModalPresetId, setWorkScopeModalPresetId] = useState<string | null>(null);
  const [copyChoicePresetId, setCopyChoicePresetId] = useState<string | null>(null);

  const fetchEstimateTrashTotal = useCallback(
    () => getContractDocumentEstimatePresetsTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchEstimateTrashTotal);

  const workScopePreset = useMemo(
    () =>
      workScopeModalPresetId == null
        ? null
        : (items.find((x) => x.id === workScopeModalPresetId) ?? null),
    [workScopeModalPresetId, items]
  );

  const copyChoicePreset = useMemo(
    () =>
      copyChoicePresetId == null ? null : (items.find((x) => x.id === copyChoicePresetId) ?? null),
    [copyChoicePresetId, items]
  );

  return {
    detachEditModal,
    setDetachEditModal,
    trashConfirmModal,
    setTrashConfirmModal,
    trashOpen,
    setTrashOpen,
    workScopeModalPresetId,
    setWorkScopeModalPresetId,
    copyChoicePresetId,
    setCopyChoicePresetId,
    trashCount,
    refreshTrashCount,
    workScopePreset,
    copyChoicePreset,
  };
}
