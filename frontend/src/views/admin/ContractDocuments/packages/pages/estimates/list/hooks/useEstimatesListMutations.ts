import { type Dispatch, type SetStateAction, useCallback } from 'react';

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentPackages,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { trashContractEstimatePreset } from '@/shared/api/contract-documents/admin-contract-document-estimate-presets-trash';

import { packageKindsUsingSharedEstimateCatalog } from '../../../../config/packageDirectionRegistry';
import { clampEstimateAdditionalMarkupPercent } from '../../../../platform/estimates/applyEstimatePresetIds';
import { persistPackageAfterRemovingEstimatePreset } from '../../../../platform/estimates/detachEstimatePresetFromPackages';
import { ensureEstimateObjectGroups } from '../../../../platform/estimates/estimateObjectGroupSync';
import {
  type EstimatePipelineTab,
  applyGroupPipelineTab,
  applyPresetPipelineTab,
} from '../../../../platform/estimates/estimatePipelineStage';
import { applySplitBundleSaveToPresets } from '../../../../platform/estimates/estimateWorkScopeTree';
import type { EstimateArchiveConfirmState } from '../../modals/EstimateArchiveConfirmModal';
import type { EstimateTrashConfirmState } from '../../modals/EstimateTrashConfirmModal';
import {
  type EstimatesListWorkspacePackage,
  mapPackagesForEstimatesList,
} from '../estimatesListPackageUsage';
import { unifiedGroupIdForEstimates } from '../estimatesListTableUi';
import {
  type EstimatePackageUsage,
  estimateObjectAddressKey,
  isUsageLocked,
  parseOptionalPercentInput,
  stripOrphanGroupIds,
} from '../estimatesListUtils';

export type UseEstimatesListMutationsParams = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  setItems: Dispatch<SetStateAction<ContractEstimatePreset[]>>;
  setGroups: Dispatch<SetStateAction<ContractEstimateGroup[]>>;
  setWorkspacePackages: Dispatch<SetStateAction<EstimatesListWorkspacePackage[]>>;
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
  groupIdsWithLockedEstimate: Set<string>;
  detachEditModal: { estimateId: string; usages: EstimatePackageUsage[] } | null;
  setDetachEditModal: Dispatch<
    SetStateAction<{ estimateId: string; usages: EstimatePackageUsage[] } | null>
  >;
  trashConfirmModal: EstimateTrashConfirmState | null;
  setTrashConfirmModal: Dispatch<SetStateAction<EstimateTrashConfirmState | null>>;
  archiveConfirmModal: EstimateArchiveConfirmState | null;
  setArchiveConfirmModal: Dispatch<SetStateAction<EstimateArchiveConfirmState | null>>;
  setWorkScopeModalPresetId: Dispatch<SetStateAction<string | null>>;
  router: AppRouterInstance;
  refreshTrashCount: () => void;
  showAutosaveOk: () => void;
  showOkMessage: (text: string, dismissMs: number) => void;
  clearOkMessage: () => void;
  setError: Dispatch<SetStateAction<string | null>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  refreshing: boolean;
  saving: boolean;
  setRefreshing: Dispatch<SetStateAction<boolean>>;
  fetchEstimatesFromServer: () => Promise<void>;
};

export function useEstimatesListMutations({
  items,
  groups,
  setItems,
  setGroups,
  setWorkspacePackages,
  usageByEstimateId,
  groupIdsWithLockedEstimate,
  detachEditModal,
  setDetachEditModal,
  trashConfirmModal,
  setTrashConfirmModal,
  archiveConfirmModal,
  setArchiveConfirmModal,
  setWorkScopeModalPresetId,
  router,
  refreshTrashCount,
  showAutosaveOk,
  showOkMessage,
  clearOkMessage,
  setError,
  setSaving,
  refreshing,
  saving,
  setRefreshing,
  fetchEstimatesFromServer,
}: UseEstimatesListMutationsParams) {
  const { canEdit } = useAdminSectionCanEdit();

  const refreshPackagesFromServer = useCallback(async () => {
    const packagesRes = await getContractDocumentPackages({
      kinds: packageKindsUsingSharedEstimateCatalog(),
    });
    setWorkspacePackages(mapPackagesForEstimatesList(packagesRes));
  }, [setWorkspacePackages]);

  const persistEstimates = useCallback(
    async (
      nextItems: ContractEstimatePreset[],
      nextGroups: ContractEstimateGroup[],
      options?: { suppressSuccessMessage?: boolean }
    ): Promise<boolean> => {
      if (!canEdit) return false;
      setSaving(true);
      setError(null);
      if (!options?.suppressSuccessMessage) {
        clearOkMessage();
      }
      try {
        const stripped = stripOrphanGroupIds(nextItems, nextGroups);
        const synced = ensureEstimateObjectGroups(stripped, nextGroups);
        await putContractDocumentEstimatePresets({
          kind: 'REPAIR',
          items: synced.items,
          groups: synced.groups,
        });
        setItems(synced.items);
        setGroups(synced.groups);
        if (!options?.suppressSuccessMessage) {
          showAutosaveOk();
        }
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, clearOkMessage, setError, setGroups, setItems, setSaving, showAutosaveOk]
  );

  const refreshEstimates = useCallback(async () => {
    if (refreshing || saving) return;
    setRefreshing(true);
    setError(null);
    clearOkMessage();
    try {
      await fetchEstimatesFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
    } finally {
      setRefreshing(false);
    }
  }, [clearOkMessage, fetchEstimatesFromServer, refreshing, saving, setError, setRefreshing]);

  const handleWorkScopeSave = useCallback(
    async (
      presetId: string,
      payload: { splitBundleId: string; estimateWorkScopeKeys: string[] }
    ) => {
      const next = applySplitBundleSaveToPresets(
        items,
        presetId,
        payload.splitBundleId,
        payload.estimateWorkScopeKeys
      );
      const ok = await persistEstimates(next, groups);
      if (ok) setWorkScopeModalPresetId(null);
    },
    [groups, items, persistEstimates, setWorkScopeModalPresetId]
  );

  const setEstimatesArchivedByAddress = useCallback(
    (addressKey: string, archived: boolean) => {
      const ts = new Date().toISOString();
      const nextItems = items.map((it) =>
        estimateObjectAddressKey(it) === addressKey ? { ...it, archived, updatedAt: ts } : it
      );
      void persistEstimates(nextItems, groups);
    },
    [groups, items, persistEstimates]
  );

  const setGroupPipelineStage = useCallback(
    (groupId: string, tab: EstimatePipelineTab) => {
      const ts = new Date().toISOString();
      const nextGroups = groups.map((g) =>
        g.id === groupId ? applyGroupPipelineTab(g, tab, ts) : g
      );
      const nextItems = items.map((it) =>
        it.groupId === groupId ? applyPresetPipelineTab(it, tab, ts) : it
      );
      void persistEstimates(nextItems, nextGroups);
    },
    [groups, items, persistEstimates]
  );

  const setPresetPipelineStage = useCallback(
    (estimateId: string, tab: EstimatePipelineTab) => {
      const ts = new Date().toISOString();
      const nextItems = items.map((it) =>
        it.id === estimateId ? applyPresetPipelineTab(it, tab, ts) : it
      );
      void persistEstimates(nextItems, groups);
    },
    [groups, items, persistEstimates]
  );

  const setAddressPipelineStage = useCallback(
    (addressKey: string, tab: EstimatePipelineTab) => {
      const ts = new Date().toISOString();
      const unifiedGroupId = unifiedGroupIdForEstimates(
        items.filter((it) => estimateObjectAddressKey(it) === addressKey)
      );
      if (unifiedGroupId) {
        setGroupPipelineStage(unifiedGroupId, tab);
        return;
      }
      const nextItems = items.map((it) =>
        estimateObjectAddressKey(it) === addressKey ? applyPresetPipelineTab(it, tab, ts) : it
      );
      void persistEstimates(nextItems, groups);
    },
    [groups, items, persistEstimates, setGroupPipelineStage]
  );

  const setPresetArchived = useCallback(
    (estimateId: string, archived: boolean) => {
      const nextItems = items.map((it) => {
        if (it.id !== estimateId) return it;
        if (archived) {
          return { ...it, archived: true, updatedAt: new Date().toISOString() };
        }
        const { archived: _drop, ...rest } = it;
        return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimatePreset;
      });
      void persistEstimates(nextItems, groups);
    },
    [groups, items, persistEstimates]
  );

  const moveEstimateToTrashById = useCallback(
    async (estimateId: string): Promise<boolean> => {
      if (!canEdit) return false;
      setSaving(true);
      setError(null);
      try {
        await trashContractEstimatePreset(estimateId);
        setItems((prev) => prev.filter((it) => it.id !== estimateId));
        void refreshTrashCount();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить расчёт в корзину');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, refreshTrashCount, setError, setItems, setSaving]
  );

  const detachEstimateFromPackages = useCallback(
    async (estimateId: string, usages: EstimatePackageUsage[]): Promise<boolean> => {
      const it = items.find((x) => x.id === estimateId);
      if (!it) return false;
      setSaving(true);
      setError(null);
      try {
        for (const u of usages) {
          await persistPackageAfterRemovingEstimatePreset(u.packageId, it.id, items, groups);
        }
        await refreshPackagesFromServer();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось отвязать расчёт от договоров');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [groups, items, refreshPackagesFromServer, setError, setSaving]
  );

  const handleConfirmDetachEdit = useCallback(async () => {
    if (!detachEditModal) return;
    const { estimateId, usages } = detachEditModal;
    const detachOk = await detachEstimateFromPackages(estimateId, usages);
    if (!detachOk) return;
    setDetachEditModal(null);
    router.push(
      `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(estimateId)}`
    );
  }, [detachEditModal, detachEstimateFromPackages, router, setDetachEditModal]);

  const handleConfirmTrashMove = useCallback(async () => {
    if (!trashConfirmModal) return;
    const { estimateId, detachedUsages } = trashConfirmModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setTrashConfirmModal(null);
      return;
    }
    if (detachedUsages.length > 0) {
      const detachOk = await detachEstimateFromPackages(estimateId, detachedUsages);
      if (!detachOk) return;
    }
    const moved = await moveEstimateToTrashById(estimateId);
    if (moved) {
      setTrashConfirmModal(null);
      showOkMessage('Расчёт перемещён в корзину.', 3000);
    }
  }, [
    detachEstimateFromPackages,
    items,
    moveEstimateToTrashById,
    setTrashConfirmModal,
    showOkMessage,
    trashConfirmModal,
  ]);

  const handleConfirmArchive = useCallback(async () => {
    if (!archiveConfirmModal) return;
    const { estimateId } = archiveConfirmModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setArchiveConfirmModal(null);
      return;
    }
    setArchiveConfirmModal(null);
    setPresetArchived(estimateId, true);
    showOkMessage('Расчёт отправлен в архив.', 3000);
  }, [archiveConfirmModal, items, setArchiveConfirmModal, setPresetArchived, showOkMessage]);

  const updateGroupAdditionalMarkupPercent = useCallback(
    (groupId: string, raw: string) => {
      if (groupIdsWithLockedEstimate.has(groupId)) return;
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;
      const parsed = parseOptionalPercentInput(raw);
      const hadExplicit = typeof group.additionalMarkupPercent === 'number';

      if (parsed === undefined) {
        if (!hadExplicit) return;
        const { additionalMarkupPercent: _drop, ...rest } = group;
        const nextGroups = groups.map((g) =>
          g.id === groupId
            ? ({ ...rest, updatedAt: new Date().toISOString() } as ContractEstimateGroup)
            : g
        );
        void persistEstimates(items, nextGroups);
        return;
      }

      const nextGroups = groups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          updatedAt: new Date().toISOString(),
          additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsed),
        };
      });
      void persistEstimates(items, nextGroups);
    },
    [groupIdsWithLockedEstimate, groups, items, persistEstimates]
  );

  const updatePresetAdditionalMarkupPercent = useCallback(
    (estimateId: string, raw: string) => {
      const usages = usageByEstimateId.get(estimateId) ?? [];
      if (usages.some((u) => isUsageLocked(u))) return;
      const current = items.find((it) => it.id === estimateId);
      if (!current) return;
      const parsed = parseOptionalPercentInput(raw);
      const hadExplicit = typeof current.additionalMarkupPercent === 'number';

      if (parsed === undefined) {
        if (!hadExplicit) return;
        const { additionalMarkupPercent: _drop, ...rest } = current;
        const nextItems = items.map((it) =>
          it.id === estimateId ? (rest as ContractEstimatePreset) : it
        );
        void persistEstimates(nextItems, groups);
        return;
      }

      const nextItems = items.map((it) => {
        if (it.id !== estimateId) return it;
        return {
          ...it,
          additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(parsed),
        };
      });
      void persistEstimates(nextItems, groups);
    },
    [groups, items, persistEstimates, usageByEstimateId]
  );

  return {
    refreshEstimates,
    handleWorkScopeSave,
    setEstimatesArchivedByAddress,
    setPresetPipelineStage,
    setAddressPipelineStage,
    setPresetArchived,
    handleConfirmDetachEdit,
    handleConfirmTrashMove,
    handleConfirmArchive,
    updateGroupAdditionalMarkupPercent,
    updatePresetAdditionalMarkupPercent,
  };
}
