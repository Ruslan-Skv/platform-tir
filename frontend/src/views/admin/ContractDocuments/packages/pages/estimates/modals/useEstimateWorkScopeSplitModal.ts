import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { generateSplitBundleId } from '../../../platform/estimates/estimateSplitBundle';
import {
  type EstimateWorkScopeGroupMode,
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
    'draft_snapshot_mismatch' | 'no_subcategory_buckets' | 'no_work_group_marks' | null
  >(null);
  const [splitGroupMode, setSplitGroupMode] = useState<EstimateWorkScopeGroupMode>('subcategory');
  const treeLoadGen = useRef(0);
  const lastPresetIdRef = useRef(preset.id);

  useEffect(() => {
    const gen = ++treeLoadGen.current;
    const presetChanged = lastPresetIdRef.current !== preset.id;
    lastPresetIdRef.current = preset.id;
    setTreeLoading(true);
    // При смене варианта группировки показываем прежнее дерево, пока грузится новое —
    // модалка не «прыгает». Очищаем только при переходе к другому расчёту.
    if (presetChanged) {
      setTree([]);
      setWorkScopeSplitHint(null);
    }
    void buildEstimateWorkScopeTreeAsync(preset, groups, splitGroupMode).then((r) => {
      if (treeLoadGen.current !== gen) return;
      setTree(r.tree);
      setWorkScopeSplitHint(r.hint);
      setTreeLoading(false);
    });
  }, [preset, groups, splitGroupMode]);

  const allLineIds = useMemo(() => collectAllLineScopeIds(tree), [tree]);
  // Ключи строк (`wsl:gri:li`) не зависят от варианта группировки: сравнение по содержимому,
  // чтобы переключение режима не сбрасывало уже отмеченные позиции.
  const allLineIdsKey = useMemo(() => allLineIds.join('\n'), [allLineIds]);
  const resolvedSplitBundleId = useMemo(
    () => resolveSplitBundleId(preset, allPresets),
    [preset, allPresets]
  );
  const claimIndex = useMemo(
    () => buildSiblingLineClaimIndex(allPresets, preset),
    [allPresets, preset]
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  /** Исходное состояние выбора (при открытии расчёта / после сохранения) — для dirty-проверки. */
  const [baselineSelectedKeys, setBaselineSelectedKeys] = useState<string[] | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const raw = preset.estimateWorkScopeKeys;
    let next: string[];
    if (Array.isArray(raw)) {
      next = raw.filter((k) => allLineIds.includes(k));
    } else if (claimIndex.size > 0) {
      next = allLineIds.filter((id) => !claimIndex.has(id));
    } else {
      next = [...allLineIds];
    }
    setSelectedKeys(next);
    setBaselineSelectedKeys(next);
    setLocalError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allLineIds представлен ключом allLineIdsKey
  }, [preset.id, preset.estimateWorkScopeKeys, allLineIdsKey, claimIndex]);

  /** Состав менялся относительно сохранённого — только тогда доступно «Сохранить состав». */
  const selectionDirty = useMemo(() => {
    if (!baselineSelectedKeys) return false;
    if (baselineSelectedKeys.length !== selectedKeys.length) return true;
    const baselineSet = new Set(baselineSelectedKeys);
    return selectedKeys.some((k) => !baselineSet.has(k));
  }, [baselineSelectedKeys, selectedKeys]);

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
    splitGroupMode,
    setSplitGroupMode,
    selectedKeys,
    selectedSet,
    selectionDirty,
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
