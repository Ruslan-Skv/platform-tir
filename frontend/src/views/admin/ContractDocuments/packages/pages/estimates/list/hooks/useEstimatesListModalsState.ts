import { useCallback, useMemo, useState } from 'react';

import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import { getContractDocumentEstimatePresetsTrash } from '@/shared/api/contract-documents/admin-contract-document-estimate-presets-trash';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import type { EstimateArchiveConfirmState } from '../../modals/EstimateArchiveConfirmModal';
import type { EstimateTrashConfirmState } from '../../modals/EstimateTrashConfirmModal';
import type { EstimatesListScope } from '../estimatesListFilters';
import type { EstimatePackageUsage } from '../estimatesListUtils';

export function useEstimatesListModalsState(
  items: ContractEstimatePreset[],
  listScope: EstimatesListScope
) {
  const [detachEditModal, setDetachEditModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [trashConfirmModal, setTrashConfirmModal] = useState<EstimateTrashConfirmState | null>(
    null
  );
  const [archiveConfirmModal, setArchiveConfirmModal] =
    useState<EstimateArchiveConfirmState | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [workScopeModalPresetId, setWorkScopeModalPresetId] = useState<string | null>(null);
  const [copyChoicePresetId, setCopyChoicePresetId] = useState<string | null>(null);

  const trashMineOnly = listScope === 'mine';

  const fetchEstimateTrashTotal = useCallback(
    () =>
      getContractDocumentEstimatePresetsTrash({
        page: 1,
        limit: 1,
        mine: trashMineOnly,
      }),
    [trashMineOnly]
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(
    fetchEstimateTrashTotal,
    trashMineOnly
  );

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
    archiveConfirmModal,
    setArchiveConfirmModal,
    trashOpen,
    setTrashOpen,
    workScopeModalPresetId,
    setWorkScopeModalPresetId,
    copyChoicePresetId,
    setCopyChoicePresetId,
    trashCount,
    refreshTrashCount,
    trashMineOnly,
    workScopePreset,
    copyChoicePreset,
  };
}
