import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { generateSplitBundleId } from '../../../platform/estimates/estimateSplitBundle';
import {
  type WorkScopeCategoryRow,
  buildEstimateWorkScopeTreeAsync,
  buildSiblingLineClaimIndex,
  collectAllLineScopeIds,
  lineKeysFromCategoryNodeId,
  lineKeysFromRoomNodeId,
  lineKeysFromStageNodeId,
  linesInWorkScopeRoom,
  resolveSplitBundleId,
  selectionIntersectsSiblingClaims,
} from '../../../platform/estimates/estimateWorkScopeTree';
import { isLineKeyClaimedBySibling } from './estimateWorkScopeSplitUtils';

export type UseEstimateWorkScopeSplitModalParams = {
  preset: ContractEstimatePreset;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    splitBundleId: string;
    estimateWorkScopeKeys: string[];
  }) => void | Promise<void>;
};

export function useEstimateWorkScopeSplitModal({
  preset,
  groups,
  allPresets,
  saving,
  onClose,
  onSave,
}: UseEstimateWorkScopeSplitModalParams) {
  const [tree, setTree] = useState<WorkScopeCategoryRow[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [workScopeSplitHint, setWorkScopeSplitHint] = useState<
    'draft_snapshot_mismatch' | 'no_subcategory_buckets' | null
  >(null);
  const treeLoadGen = useRef(0);

  useEffect(() => {
    const gen = ++treeLoadGen.current;
    setTreeLoading(true);
    setWorkScopeSplitHint(null);
    void buildEstimateWorkScopeTreeAsync(preset, groups).then((r) => {
      if (treeLoadGen.current !== gen) return;
      setTree(r.tree);
      setWorkScopeSplitHint(r.hint);
      setTreeLoading(false);
    });
  }, [preset, groups]);

  const allLineIds = useMemo(() => collectAllLineScopeIds(tree), [tree]);
  const resolvedSplitBundleId = useMemo(
    () => resolveSplitBundleId(preset, allPresets),
    [preset, allPresets]
  );
  const claimIndex = useMemo(
    () => buildSiblingLineClaimIndex(allPresets, preset),
    [allPresets, preset]
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const raw = preset.estimateWorkScopeKeys;
    if (Array.isArray(raw)) {
      setSelectedKeys(raw.filter((k) => allLineIds.includes(k)));
    } else if (claimIndex.size > 0) {
      setSelectedKeys(allLineIds.filter((id) => !claimIndex.has(id)));
    } else {
      setSelectedKeys([...allLineIds]);
    }
    setLocalError(null);
  }, [preset.id, preset.estimateWorkScopeKeys, allLineIds, claimIndex]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          if (selectedSet.has(line.id)) sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree, selectedSet]);

  const grandTotalInTree = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree]);

  /** Строка отнесена к другому расчёту связки (по сохранённым `estimateWorkScopeKeys`). */
  const isLineKeyAssignedToSiblingPreset = useMemo(() => {
    if (!resolvedSplitBundleId) return () => false;
    return (lineId: string): boolean => claimIndex.has(lineId);
  }, [resolvedSplitBundleId, claimIndex]);

  /** Сумма позиций, которые ни здесь не выбраны, ни в связанных расчётах не отнесены. */
  const unassignedAcrossBundleTotal = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          if (selectedSet.has(line.id)) continue;
          if (isLineKeyAssignedToSiblingPreset(line.id)) continue;
          sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree, selectedSet, isLineKeyAssignedToSiblingPreset]);

  /** Строки с обычным чекбоксом (не заняты соседним расчётом связки). */
  const selectableLineIds = useMemo(
    () => allLineIds.filter((id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys)),
    [allLineIds, claimIndex, selectedKeys]
  );

  const allSelectableSelected =
    selectableLineIds.length > 0 && selectableLineIds.every((id) => selectedSet.has(id));

  const anySelectableSelected = selectableLineIds.some((id) => selectedSet.has(id));

  const selectAllAvailableLines = () => {
    setSelectedKeys([...selectableLineIds]);
  };

  const deselectAllAvailableLines = () => {
    setSelectedKeys([]);
  };

  const toggleLine = (lineId: string) => {
    if (isLineKeyClaimedBySibling(lineId, claimIndex, selectedKeys)) return;
    setSelectedKeys((prev) =>
      prev.includes(lineId) ? prev.filter((x) => x !== lineId) : [...prev, lineId]
    );
  };

  const toggleRoom = (roomId: string) => {
    const lineIds = lineKeysFromRoomNodeId(tree, roomId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const toggleStage = (stageId: string) => {
    const lineIds = lineKeysFromStageNodeId(tree, stageId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const toggleCategory = (categoryId: string) => {
    const lineIds = lineKeysFromCategoryNodeId(tree, categoryId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const handleSave = async () => {
    const hit = selectionIntersectsSiblingClaims(selectedSet, claimIndex);
    if (hit) {
      setLocalError(
        `Позиция уже отнесена к расчёту «${hit.title}». Снимите пересечение по составу работ.`
      );
      return;
    }
    if (selectedKeys.length === 0) {
      setLocalError('Отметьте хотя бы одну позицию для этого экземпляра расчёта.');
      return;
    }
    const bundle =
      resolvedSplitBundleId ?? ((preset.splitBundleId ?? '').trim() || generateSplitBundleId());
    setLocalError(null);
    await onSave({ splitBundleId: bundle, estimateWorkScopeKeys: [...selectedKeys] });
  };

  return {
    preset,
    saving,
    onClose,
    tree,
    treeLoading,
    workScopeSplitHint,
    selectedKeys,
    selectedSet,
    claimIndex,
    localError,
    resolvedSplitBundleId,
    grandTotalInTree,
    selectedTotal,
    unassignedAcrossBundleTotal,
    allLineIds,
    selectableLineIds,
    allSelectableSelected,
    anySelectableSelected,
    selectAllAvailableLines,
    deselectAllAvailableLines,
    toggleLine,
    toggleRoom,
    toggleStage,
    toggleCategory,
    handleSave,
  };
}

export type EstimateWorkScopeSplitModalModel = ReturnType<typeof useEstimateWorkScopeSplitModal>;
