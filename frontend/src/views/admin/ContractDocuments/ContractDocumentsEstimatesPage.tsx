'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackageStatus,
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getMeasurements } from '@/shared/api/admin-crm';
import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

import styles from './ContractDocuments.module.css';
import {
  type SiblingClaim,
  type WorkScopeCategoryRow,
  type WorkScopeLineRow,
  buildEstimateWorkScopeTree,
  buildEstimateWorkScopeTreeAsync,
  buildSiblingLineClaimIndex,
  collectAllLineScopeIds,
  lineKeysFromCategoryNodeId,
  lineKeysFromRoomNodeId,
  lineKeysFromStageNodeId,
  linesInWorkScopeRoom,
  selectionIntersectsSiblingClaims,
} from './repair/estimateWorkScopeTree';
import { getDisplayContractDate, getDisplayContractNumber } from './repair/packageContractDisplay';
import {
  clampEstimateAdditionalMarkupPercent,
  getBaseSnapshotWithMarkupForPreset,
  getSnapshotForEstimateAttach,
} from './repair/repairApplyEstimatePresetIds';
import { persistRepairPackageAfterRemovingEstimatePreset } from './repair/repairDetachEstimatePresetFromPackages';

type EstimatePackageUsage =
  | {
      packageId: string;
      packageTitle: string;
      kind: 'contract';
      packageStatus: ContractDocumentPackageStatus;
      contractNumber: string;
      contractDate: string;
    }
  | {
      packageId: string;
      packageTitle: string;
      kind: 'addendum';
      addendumOrdinal: number;
      addendumStatus: 'OPEN' | 'SIGNED';
      /** Дата из шапки Д/с (как в пакете документов), часто дд.мм.гггг */
      addendumDate: string;
      contractNumber: string;
      contractDate: string;
    };

function isUsageLocked(u: EstimatePackageUsage): boolean {
  if (u.kind === 'contract') {
    return u.packageStatus === 'CONTRACT_CONCLUDED';
  }
  return u.addendumStatus === 'SIGNED';
}

function formatEstimatePackageUsageLabel(u: EstimatePackageUsage): string {
  if (u.kind === 'contract') {
    return `Договор № ${u.contractNumber} от ${u.contractDate}`;
  }
  const d = u.addendumDate.trim();
  const datePart = d ? `${d} г.` : '—';
  return `Д/с №${u.addendumOrdinal} от ${datePart} к договору № ${u.contractNumber} от ${u.contractDate}`;
}

function sortEstimateGroupsByTitle(gs: ContractEstimateGroup[]) {
  return [...gs].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
}

function parseOptionalPercentInput(raw: string): number | undefined {
  const t = raw.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function formatEstimatePresetTotalRub(total: number): string {
  return `${total.toFixed(2).replace('.', ',')} руб.`;
}

/** Можно создать связанный экземпляр: уже есть сохранённый состав разделения сметы. */
function isPresetEligibleForLinkedSplitInstance(p: ContractEstimatePreset): boolean {
  return (
    Boolean(p.splitBundleId) ||
    (Array.isArray(p.estimateWorkScopeKeys) && p.estimateWorkScopeKeys.length > 0)
  );
}

/** Объединение ключей строк сметы (`wsl:…`) по всем расчётам связки: явный список или «вся смета», если ключей нет в данных. */
function mergeSplitBundleWorkScopeLineKeys(
  peers: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): Set<string> {
  const union = new Set<string>();
  for (const p of peers) {
    const keys = p.estimateWorkScopeKeys;
    if (Array.isArray(keys) && keys.length > 0) {
      for (const k of keys) {
        if (typeof k === 'string' && k.length > 0) union.add(k);
      }
    } else if (!Array.isArray(keys)) {
      const tree = p.groupId ? buildEstimateWorkScopeTree(p, groups) : [];
      for (const id of collectAllLineScopeIds(tree)) union.add(id);
    }
  }
  return union;
}

/** Не менее двух расчётов в связке и вместе они покрывают все строки дерева состава для `cardPreset`. */
function splitBundleCoversAllWorkScopeLines(
  cardPreset: ContractEstimatePreset,
  peers: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): boolean {
  if (!cardPreset.splitBundleId?.trim() || peers.length < 2) return false;
  const tree = cardPreset.groupId ? buildEstimateWorkScopeTree(cardPreset, groups) : [];
  const allIds = collectAllLineScopeIds(tree);
  if (allIds.length === 0) return false;
  const union = mergeSplitBundleWorkScopeLineKeys(peers, groups);
  return allIds.every((id) => union.has(id));
}

type EstimatesListSortMode = 'estimateDate' | 'updatedAt';

function parseIsoTs(raw: string | undefined): number {
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

/** Дата расчёта для сортировки: `createdAt` → метка в id `est_<ms>` → `updatedAt` (наследие). */
function presetEstimateDateSortTs(p: ContractEstimatePreset): number {
  const fromCreated = parseIsoTs(p.createdAt);
  if (fromCreated > 0) return fromCreated;
  const m = /^est_(\d+)$/.exec(p.id.trim());
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) return n;
  }
  return parseIsoTs(p.updatedAt);
}

function presetSortTs(p: ContractEstimatePreset, mode: EstimatesListSortMode): number {
  return mode === 'estimateDate' ? presetEstimateDateSortTs(p) : parseIsoTs(p.updatedAt);
}

type MergeSortRow =
  | {
      kind: 'group';
      group: ContractEstimateGroup;
      items: ContractEstimatePreset[];
      sortTs: number;
    }
  | { kind: 'standalone'; preset: ContractEstimatePreset; sortTs: number };

function mergeListOrderRank(sortTs: number, order: number | undefined): number {
  if (order != null && Number.isFinite(order)) return order;
  return 1e15 - sortTs;
}

function comparePresetsInGroup(
  a: ContractEstimatePreset,
  b: ContractEstimatePreset,
  mode: EstimatesListSortMode
): number {
  const ai = a.inGroupListOrder;
  const bi = b.inGroupListOrder;
  if (ai != null && bi != null && ai !== bi) return ai - bi;
  if (ai != null && bi == null) return -1;
  if (ai == null && bi != null) return 1;
  const td = presetSortTs(b, mode) - presetSortTs(a, mode);
  if (td !== 0) return td;
  return a.title.localeCompare(b.title, 'ru');
}

function buildMergeSortRows(args: {
  groupsForLayout: ContractEstimateGroup[];
  visibleItems: ContractEstimatePreset[];
  attachmentFilter: 'all' | 'bound' | 'unbound';
  estimateListSortMode: EstimatesListSortMode;
}): MergeSortRow[] {
  const { groupsForLayout, visibleItems, attachmentFilter, estimateListSortMode: sortMode } = args;
  const sortPresets = (list: ContractEstimatePreset[]) =>
    [...list].sort((a, b) => comparePresetsInGroup(a, b, sortMode));

  const groupIdSet = new Set(groupsForLayout.map((g) => g.id));
  const rows: MergeSortRow[] = [];

  for (const group of groupsForLayout) {
    const inGroup = visibleItems.filter((it) => it.groupId === group.id);
    if (inGroup.length === 0 && attachmentFilter !== 'all') continue;
    const sorted = sortPresets(inGroup);
    const sortTs =
      sorted.length > 0 ? Math.max(...sorted.map((p) => presetSortTs(p, sortMode))) : 0;
    rows.push({ kind: 'group', group, items: sorted, sortTs });
  }

  const standaloneRaw = visibleItems.filter((it) => !it.groupId || !groupIdSet.has(it.groupId));
  for (const preset of sortPresets(standaloneRaw)) {
    rows.push({ kind: 'standalone', preset, sortTs: presetSortTs(preset, sortMode) });
  }

  rows.sort((a, b) => {
    const ra =
      a.kind === 'group'
        ? mergeListOrderRank(a.sortTs, a.group.mergeListOrder)
        : mergeListOrderRank(a.sortTs, a.preset.mergeListOrder);
    const rb =
      b.kind === 'group'
        ? mergeListOrderRank(b.sortTs, b.group.mergeListOrder)
        : mergeListOrderRank(b.sortTs, b.preset.mergeListOrder);
    if (ra !== rb) return ra - rb;
    if (a.kind !== b.kind) return a.kind === 'group' ? -1 : 1;
    if (a.kind === 'group' && b.kind === 'group') {
      return a.group.title.localeCompare(b.group.title, 'ru');
    }
    if (a.kind === 'standalone' && b.kind === 'standalone') {
      return a.preset.title.localeCompare(b.preset.title, 'ru');
    }
    return 0;
  });

  return rows;
}

function applyMergeListOrdersFromRows(
  rows: MergeSortRow[],
  baseItems: ContractEstimatePreset[],
  baseGroups: ContractEstimateGroup[]
): { nextItems: ContractEstimatePreset[]; nextGroups: ContractEstimateGroup[] } {
  const gPatch = new Map<string, number>();
  const pPatch = new Map<string, number>();
  rows.forEach((row, idx) => {
    const v = idx * 10;
    if (row.kind === 'group') gPatch.set(row.group.id, v);
    else pPatch.set(row.preset.id, v);
  });
  const nextGroups = baseGroups.map((g) =>
    gPatch.has(g.id) ? { ...g, mergeListOrder: gPatch.get(g.id)! } : { ...g }
  );
  const nextItems = baseItems.map((it) =>
    pPatch.has(it.id) ? { ...it, mergeListOrder: pPatch.get(it.id)! } : { ...it }
  );
  return { nextItems, nextGroups };
}

function applyInGroupListOrders(
  groupId: string,
  orderedVisible: ContractEstimatePreset[],
  baseItems: ContractEstimatePreset[],
  visibleIds: Set<string>
): ContractEstimatePreset[] {
  const hidden = baseItems.filter((it) => it.groupId === groupId && !visibleIds.has(it.id));
  const fullOrder = [...orderedVisible, ...hidden];
  return baseItems.map((it) => {
    if (it.groupId !== groupId) return it;
    const idx = fullOrder.findIndex((p) => p.id === it.id);
    if (idx < 0) return it;
    return { ...it, inGroupListOrder: idx * 10 };
  });
}

/** Сортировка списка расчётов: выпадающий список. */
function EstimatesListSortControl({
  value,
  onChange,
  disabled,
}: {
  value: EstimatesListSortMode;
  onChange: (next: EstimatesListSortMode) => void;
  disabled?: boolean;
}) {
  return (
    <label className={styles.estimatesSortSelectField}>
      <span>Сортировка</span>
      <select
        value={value}
        disabled={disabled}
        aria-label="Сортировка списка расчётов"
        onChange={(e) => onChange(e.target.value as EstimatesListSortMode)}
      >
        <option value="updatedAt">По дате обновления</option>
        <option value="estimateDate">По дате расчёта</option>
      </select>
    </label>
  );
}

function EstimatesReorderArrowUp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={8} height={8} viewBox="0 0 24 24" aria-hidden>
      <polygon points="12,5 6,18 18,18" fill="currentColor" />
    </svg>
  );
}

function EstimatesReorderArrowDown() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={8} height={8} viewBox="0 0 24 24" aria-hidden>
      <polygon points="12,19 6,6 18,6" fill="currentColor" />
    </svg>
  );
}

function EstimatesArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-3)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 8v13H3V8" />
      <path d="M23 3v5H1V3z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function EstimatesRestoreFromArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-1)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

/** Убирает ссылку на несуществующую группу (после удаления объекта и т.п.). */
function stripOrphanGroupIds(
  rows: ContractEstimatePreset[],
  groupList: ContractEstimateGroup[]
): ContractEstimatePreset[] {
  const ids = new Set(groupList.map((g) => g.id));
  return rows.map((it) => {
    if (it.groupId && ids.has(it.groupId)) return it;
    const { groupId: _removed, ...rest } = it;
    return rest as ContractEstimatePreset;
  });
}

/** Иконки фильтра по привязке расчёта к договору (отдельная визуальная группа). */
function EstimatesAttachmentFilterControl({
  value,
  onChange,
  disabled,
}: {
  value: 'all' | 'bound' | 'unbound';
  onChange: (next: 'all' | 'bound' | 'unbound') => void;
  disabled?: boolean;
}) {
  const btn = (mode: 'all' | 'bound' | 'unbound', label: string, children: ReactNode) => (
    <button
      type="button"
      className={`${styles.estimatesAttachmentFilterBtn} ${value === mode ? styles.estimatesAttachmentFilterBtnActive : ''}`}
      disabled={disabled}
      aria-pressed={value === mode}
      aria-label={label}
      title={label}
      onClick={() => onChange(mode)}
    >
      {children}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Фильтр по привязке к договору"
      className={styles.estimatesAttachmentFilterGroup}
    >
      {btn(
        'all',
        'Все расчёты',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      )}
      {btn(
        'bound',
        'Только привязанные к договору',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      )}
      {btn(
        'unbound',
        'Только не привязанные к договору',
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          <line x1="4" y1="4" x2="20" y2="20" />
        </svg>
      )}
    </div>
  );
}

function generateSplitBundleId(): string {
  return `split_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isLineKeyClaimedBySibling(
  lineId: string,
  claimIndex: Map<string, SiblingClaim[]>,
  selectedKeys: string[]
): boolean {
  if (selectedKeys.includes(lineId)) return false;
  return (claimIndex.get(lineId)?.length ?? 0) > 0;
}

function EstimateWorkScopeSplitModal({
  preset,
  groups,
  allPresets,
  saving,
  onClose,
  onSave,
}: {
  preset: ContractEstimatePreset;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    splitBundleId: string;
    estimateWorkScopeKeys: string[];
  }) => void | Promise<void>;
}) {
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
  const claimIndex = useMemo(
    () => buildSiblingLineClaimIndex(allPresets, preset.splitBundleId, preset.id),
    [allPresets, preset.splitBundleId, preset.id]
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const raw = preset.estimateWorkScopeKeys;
    if (Array.isArray(raw)) {
      setSelectedKeys(raw.filter((k) => allLineIds.includes(k)));
    } else {
      setSelectedKeys([...allLineIds]);
    }
    setLocalError(null);
  }, [preset.id, preset.estimateWorkScopeKeys, allLineIds]);

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
    const bundle = preset.splitBundleId?.trim();
    if (!bundle) return () => false;
    return (lineId: string): boolean => {
      for (const p of allPresets) {
        if (p.id === preset.id) continue;
        if (p.splitBundleId !== bundle) continue;
        const keys = p.estimateWorkScopeKeys;
        if (!Array.isArray(keys) || keys.length === 0) continue;
        if (keys.includes(lineId)) return true;
      }
      return false;
    };
  }, [allPresets, preset.id, preset.splitBundleId]);

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

  const renderWorkScopeLineRow = (line: WorkScopeLineRow, indentClass: string) => {
    const claims = claimIndex.get(line.id);
    const claimed = isLineKeyClaimedBySibling(line.id, claimIndex, selectedKeys);
    const claimTitle = claims?.[0]?.title;
    return (
      <label key={line.id} className={`${styles.workScopeSplitRow} ${indentClass}`}>
        {claimed ? (
          <span
            className={styles.workScopeSplitClaimedCheckbox}
            role="img"
            aria-label={
              claimTitle
                ? `Позиция уже включена в расчёт «${claimTitle}»`
                : 'Позиция уже включена в другом расчёте связки'
            }
            title={claimTitle ? `Уже в расчёте «${claimTitle}»` : 'Уже в другом расчёте связки'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : (
          <input
            type="checkbox"
            checked={selectedSet.has(line.id)}
            disabled={saving || treeLoading}
            onChange={() => toggleLine(line.id)}
          />
        )}
        <span style={{ flex: 1, minWidth: 0 }}>{line.label}</span>
        <span className={styles.workScopeSplitRowMeta}>
          {formatEstimatePresetTotalRub(line.amount)}
        </span>
      </label>
    );
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
    const bundle = (preset.splitBundleId ?? '').trim() || generateSplitBundleId();
    setLocalError(null);
    await onSave({ splitBundleId: bundle, estimateWorkScopeKeys: [...selectedKeys] });
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Разделение сметы по договорам"
      size="lg"
      showCloseButton
    >
      <form
        className={styles.workScopeSplitModalForm}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <p data-modal-form-hint>
          Расчёт: <strong>{preset.title}</strong>. Отметьте позиции, которые войдут в этот экземпляр
          для договора. Связанные копии расчёта (та же группа разделения) видят занятые позиции и не
          могут включить их повторно.
        </p>
        <p data-modal-form-hint>
          Сумма всех позиций: <strong>{formatEstimatePresetTotalRub(grandTotalInTree)}</strong>
          {' · '}
          Выбрано здесь: <strong>{formatEstimatePresetTotalRub(selectedTotal)}</strong>
          {' · '}
          Невыбранные позиции
          {preset.splitBundleId?.trim() ? ' (по связке)' : ''}:{' '}
          <strong>{formatEstimatePresetTotalRub(unassignedAcrossBundleTotal)}</strong>
        </p>
        {localError ? <p data-modal-form-error>{localError}</p> : null}

        <div className={styles.workScopeSplitTreePanel}>
          {!treeLoading && tree.length > 0 ? (
            <div className={styles.workScopeSplitTreeToolbar}>
              <button
                type="button"
                className={styles.workScopeSplitBulkLink}
                disabled={
                  saving || treeLoading || selectableLineIds.length === 0 || allSelectableSelected
                }
                onClick={selectAllAvailableLines}
              >
                Отметить все
              </button>
              <span className={styles.workScopeSplitBulkSep} aria-hidden>
                ·
              </span>
              <button
                type="button"
                className={styles.workScopeSplitBulkLink}
                disabled={
                  saving || treeLoading || selectableLineIds.length === 0 || !anySelectableSelected
                }
                onClick={deselectAllAvailableLines}
              >
                Снять все
              </button>
            </div>
          ) : null}
          <div className={styles.workScopeSplitTreeScroll}>
            {treeLoading ? (
              <p data-modal-form-hint style={{ margin: 0 }}>
                Загрузка подкатегорий из каталога…
              </p>
            ) : tree.length === 0 ? (
              <p data-modal-form-hint style={{ margin: 0 }}>
                Нет строк сметы для разделения.
              </p>
            ) : (
              tree.map((cat) => (
                <div key={cat.id}>
                  <label
                    className={`${styles.workScopeSplitRow} ${styles.workScopeSplitIndent1} ${styles.workScopeSplitHeading}`}
                  >
                    <input
                      type="checkbox"
                      checked={(() => {
                        const ids = lineKeysFromCategoryNodeId(tree, cat.id);
                        const selectable = ids.filter(
                          (id) =>
                            !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) ||
                            selectedKeys.includes(id)
                        );
                        return (
                          selectable.length > 0 && selectable.every((id) => selectedSet.has(id))
                        );
                      })()}
                      disabled={saving || treeLoading}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span className={styles.workScopeSplitHeadingLabel}>{cat.label}</span>
                    <span className={styles.workScopeSplitHeadingLeader} aria-hidden="true" />
                    <span className={styles.workScopeSplitRowMeta}>
                      {formatEstimatePresetTotalRub(cat.amount)}
                    </span>
                  </label>
                  {cat.rooms.map((room) => {
                    const showStages = room.stages.length > 1;
                    return (
                      <div key={room.id}>
                        <label
                          className={`${styles.workScopeSplitRow} ${styles.workScopeSplitIndent2} ${styles.workScopeSplitHeading}`}
                        >
                          <input
                            type="checkbox"
                            checked={(() => {
                              const lineIds = lineKeysFromRoomNodeId(tree, room.id);
                              const selectable = lineIds.filter(
                                (id) =>
                                  !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) ||
                                  selectedKeys.includes(id)
                              );
                              return (
                                selectable.length > 0 &&
                                selectable.every((id) => selectedSet.has(id))
                              );
                            })()}
                            disabled={saving || treeLoading}
                            onChange={() => toggleRoom(room.id)}
                          />
                          <span className={styles.workScopeSplitHeadingLabel}>{room.label}</span>
                          <span className={styles.workScopeSplitHeadingLeader} aria-hidden="true" />
                          <span className={styles.workScopeSplitRowMeta}>
                            {formatEstimatePresetTotalRub(room.amount)}
                          </span>
                        </label>
                        {showStages
                          ? room.stages.map((stage) => (
                              <div key={stage.id}>
                                <label
                                  className={`${styles.workScopeSplitRow} ${styles.workScopeSplitIndent3} ${styles.workScopeSplitHeading}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      const lineIds = lineKeysFromStageNodeId(tree, stage.id);
                                      const selectable = lineIds.filter(
                                        (id) =>
                                          !isLineKeyClaimedBySibling(
                                            id,
                                            claimIndex,
                                            selectedKeys
                                          ) || selectedKeys.includes(id)
                                      );
                                      return (
                                        selectable.length > 0 &&
                                        selectable.every((id) => selectedSet.has(id))
                                      );
                                    })()}
                                    disabled={saving || treeLoading}
                                    onChange={() => toggleStage(stage.id)}
                                  />
                                  <span className={styles.workScopeSplitHeadingLabel}>
                                    {stage.label}
                                  </span>
                                  <span
                                    className={styles.workScopeSplitHeadingLeader}
                                    aria-hidden="true"
                                  />
                                  <span className={styles.workScopeSplitRowMeta}>
                                    {formatEstimatePresetTotalRub(stage.amount)}
                                  </span>
                                </label>
                                {stage.lines.map((line) =>
                                  renderWorkScopeLineRow(line, styles.workScopeSplitIndent4)
                                )}
                              </div>
                            ))
                          : linesInWorkScopeRoom(room).map((line) =>
                              renderWorkScopeLineRow(line, styles.workScopeSplitIndent3)
                            )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {!treeLoading && workScopeSplitHint === 'draft_snapshot_mismatch' ? (
          <p data-modal-form-hint>
            Подкатегории недоступны: в сохранённом снимке этой сметы нет скрытых id позиций каталога
            (так было до последнего обновления). Они появляются после следующего сохранения сметы из
            редактора расчёта. Если кнопки «Сохранить» не видно — внесите любое маленькое изменение
            (например пробел в названии помещения), затем сохраните.
          </p>
        ) : null}
        {!treeLoading && workScopeSplitHint === 'no_subcategory_buckets' ? (
          <p data-modal-form-hint>
            Подкатегории не разделены: в каталоге для этих видов работ одна секция позиций, либо
            ответ каталога не содержит нужных id позиций.
          </p>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Подкатегории (секции позиций в каталоге услуг) подставляются только в этой модалке, если
            совпадают черновик калькулятора и снимок сметы. В печатной смете по-прежнему только
            помещения и родительские категории.
          </span>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </button>
          <button
            type="submit"
            data-modal-btn="primary"
            disabled={saving || treeLoading || allLineIds.length === 0}
          >
            {saving ? 'Сохранение…' : 'Сохранить состав'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ContractDocumentsEstimatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [items, setItems] = useState<ContractEstimatePreset[]>([]);
  const [groups, setGroups] = useState<ContractEstimateGroup[]>([]);
  const [repairPackages, setRepairPackages] = useState<
    Array<{
      id: string;
      title: string | null;
      status: ContractDocumentPackageStatus;
      formData: Record<string, unknown>;
      crmContract?: { contractNumber: string; contractDate: string } | null;
    }>
  >([]);
  const [attachmentFilter, setAttachmentFilter] = useState<'all' | 'bound' | 'unbound'>('all');
  const [estimateListSortMode, setEstimateListSortMode] =
    useState<EstimatesListSortMode>('updatedAt');
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set());
  const [detachEditModal, setDetachEditModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [detachDeleteModal, setDetachDeleteModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [simpleDeleteModal, setSimpleDeleteModal] = useState<{
    estimateId: string;
    title: string;
    inSplitBundle: boolean;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerateFromMeasurementOpen, setIsGenerateFromMeasurementOpen] = useState(false);
  const [completedMeasurements, setCompletedMeasurements] = useState<
    Array<{
      id: string;
      customerName: string;
      customerAddress: string | null;
      receptionDate: string;
    }>
  >([]);
  const [completedMeasurementsBusy, setCompletedMeasurementsBusy] = useState(false);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState('');
  const [archiveView, setArchiveView] = useState(false);
  const [workScopeModalPresetId, setWorkScopeModalPresetId] = useState<string | null>(null);

  const openGenerateFromMeasurementModal = useCallback(async () => {
    setIsGenerateFromMeasurementOpen(true);
    setCompletedMeasurementsBusy(true);
    setSelectedMeasurementId('');
    try {
      const res = await getMeasurements({ status: 'COMPLETED', page: 1, limit: 200 });
      const rows = (res.data ?? [])
        .filter((m) => (m.comments ?? '').includes('[REPAIR_MEASUREMENT_DATA_V1]'))
        .map((m) => ({
          id: m.id,
          customerName: m.customerName || 'Без имени',
          customerAddress: m.customerAddress ?? null,
          receptionDate: m.receptionDate,
        }));
      setCompletedMeasurements(rows);
      if (rows.length > 0) setSelectedMeasurementId(rows[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить выполненные замеры');
    } finally {
      setCompletedMeasurementsBusy(false);
    }
  }, []);

  const fetchEstimatesFromServer = useCallback(async () => {
    const [presetsRes, packagesRes] = await Promise.all([
      getContractDocumentEstimatePresets('REPAIR'),
      getContractDocumentPackages('REPAIR'),
    ]);
    const loadedGroups = presetsRes.groups ?? [];
    setGroups(loadedGroups);
    setItems(stripOrphanGroupIds(presetsRes.items ?? [], loadedGroups));
    setRepairPackages(
      (packagesRes ?? []).map((p) => ({
        id: p.id,
        title: p.title ?? null,
        status:
          p.status === 'CONTRACT_CONCLUDED'
            ? 'CONTRACT_CONCLUDED'
            : p.status === 'REFUSED'
              ? 'REFUSED'
              : 'IN_PROGRESS',
        formData: (p.formData ?? {}) as Record<string, unknown>,
        crmContract: p.crmContract
          ? {
              contractNumber: p.crmContract.contractNumber,
              contractDate: p.crmContract.contractDate,
            }
          : null,
      }))
    );
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await fetchEstimatesFromServer();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchEstimatesFromServer]);

  useEffect(() => {
    if (workScopeModalPresetId && !items.some((x) => x.id === workScopeModalPresetId)) {
      setWorkScopeModalPresetId(null);
    }
  }, [workScopeModalPresetId, items]);

  const refreshEstimates = async () => {
    if (refreshing || saving) return;
    setRefreshing(true);
    setError(null);
    setOk(null);
    try {
      await fetchEstimatesFromServer();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить расчёты');
    } finally {
      setRefreshing(false);
    }
  };

  const persistEstimates = async (
    nextItems: ContractEstimatePreset[],
    nextGroups: ContractEstimateGroup[],
    options?: { suppressSuccessMessage?: boolean }
  ): Promise<boolean> => {
    setSaving(true);
    setError(null);
    if (!options?.suppressSuccessMessage) {
      setOk(null);
    }
    try {
      const cleaned = stripOrphanGroupIds(nextItems, nextGroups);
      await putContractDocumentEstimatePresets({
        kind: 'REPAIR',
        items: cleaned,
        groups: nextGroups,
      });
      setItems(cleaned);
      setGroups(nextGroups);
      if (!options?.suppressSuccessMessage) {
        setOk('Сохранено.');
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить расчёты');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleWorkScopeSave = async (
    presetId: string,
    payload: { splitBundleId: string; estimateWorkScopeKeys: string[] }
  ) => {
    const next = items.map((it) =>
      it.id === presetId
        ? {
            ...it,
            splitBundleId: payload.splitBundleId,
            estimateWorkScopeKeys: payload.estimateWorkScopeKeys,
            updatedAt: new Date().toISOString(),
          }
        : it
    );
    const ok = await persistEstimates(next, groups);
    if (ok) setWorkScopeModalPresetId(null);
  };

  const createObjectGroup = () => {
    const nextGroup: ContractEstimateGroup = {
      id: `grp_${Date.now()}`,
      title: `Объект ${groups.length + 1}`,
      updatedAt: new Date().toISOString(),
    };
    void persistEstimates(items, [...groups, nextGroup]);
  };

  const renameObjectGroup = (groupId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const nextGroups = groups.map((g) =>
      g.id === groupId ? { ...g, title: trimmed, updatedAt: new Date().toISOString() } : g
    );
    void persistEstimates(items, nextGroups);
  };

  const removeObjectGroup = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      next.delete(groupId);
      return next;
    });
    const nextGroups = groups.filter((g) => g.id !== groupId);
    const nextItems = items.map((it) => {
      if (it.groupId !== groupId) return it;
      const { groupId: _g, ...rest } = it;
      return rest as ContractEstimatePreset;
    });
    void persistEstimates(nextItems, nextGroups);
  };

  const setGroupArchived = (groupId: string, archived: boolean) => {
    const nextGroups = groups.map((g) => {
      if (g.id !== groupId) return g;
      if (archived) {
        return { ...g, archived: true, updatedAt: new Date().toISOString() };
      }
      const { archived: _drop, ...rest } = g;
      return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimateGroup;
    });
    if (!archived) {
      const nextItems = items.map((it) => {
        if (it.groupId !== groupId || !it.archived) return it;
        const { archived: _d, ...rest } = it;
        return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimatePreset;
      });
      void persistEstimates(nextItems, nextGroups);
      return;
    }
    void persistEstimates(items, nextGroups);
  };

  const setPresetArchived = (estimateId: string, archived: boolean) => {
    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      if (archived) {
        return { ...it, archived: true, updatedAt: new Date().toISOString() };
      }
      const { archived: _drop, ...rest } = it;
      return { ...rest, updatedAt: new Date().toISOString() } as ContractEstimatePreset;
    });
    void persistEstimates(nextItems, groups);
  };

  const assignEstimateToGroup = (estimateId: string, groupId: string | null) => {
    const nextItems = items.map((it) => {
      if (it.id !== estimateId) return it;
      let next: ContractEstimatePreset;
      if (!groupId) {
        const { groupId: _g, inGroupListOrder: _ig, ...rest } = it;
        next = rest as ContractEstimatePreset;
      } else {
        const maxInGroup = Math.max(
          -1,
          ...items.filter((x) => x.groupId === groupId).map((x) => x.inGroupListOrder ?? -1)
        );
        const { mergeListOrder: _ml, ...base } = it;
        next = {
          ...base,
          groupId,
          inGroupListOrder: maxInGroup + 10,
        };
        if (next.archived) {
          const { archived: _a, ...r } = next;
          next = { ...r } as ContractEstimatePreset;
        }
      }
      return next;
    });
    void persistEstimates(nextItems, groups);
  };

  const handleConfirmDetachEdit = async () => {
    if (!detachEditModal) return;
    const { estimateId, usages } = detachEditModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setDetachEditModal(null);
      return;
    }
    setSaving(true);
    setError(null);
    let detachOk = false;
    try {
      for (const u of usages) {
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items, groups);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status:
            p.status === 'CONTRACT_CONCLUDED'
              ? 'CONTRACT_CONCLUDED'
              : p.status === 'REFUSED'
                ? 'REFUSED'
                : 'IN_PROGRESS',
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
      detachOk = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отвязать расчёт от договоров');
    } finally {
      setSaving(false);
    }
    if (!detachOk) return;
    setDetachEditModal(null);
    router.push(
      `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(estimateId)}`
    );
  };

  const handleConfirmDetachDelete = async () => {
    if (!detachDeleteModal) return;
    const { estimateId, usages } = detachDeleteModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setDetachDeleteModal(null);
      return;
    }
    setSaving(true);
    setError(null);
    let detachOk = false;
    try {
      for (const u of usages) {
        await persistRepairPackageAfterRemovingEstimatePreset(u.packageId, it.id, items, groups);
      }
      const packagesRes = await getContractDocumentPackages('REPAIR');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          status:
            p.status === 'CONTRACT_CONCLUDED'
              ? 'CONTRACT_CONCLUDED'
              : p.status === 'REFUSED'
                ? 'REFUSED'
                : 'IN_PROGRESS',
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
      detachOk = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отвязать расчёт от договоров');
    } finally {
      setSaving(false);
    }
    if (!detachOk) return;
    setDetachDeleteModal(null);
    const removed = await removeEstimateById(estimateId);
    if (!removed) return;
  };

  const removeEstimateById = async (id: string): Promise<boolean> => {
    const next = items.filter((it) => it.id !== id);
    return persistEstimates(next, groups);
  };

  const handleConfirmSimpleDelete = async () => {
    if (!simpleDeleteModal) return;
    const ok = await removeEstimateById(simpleDeleteModal.estimateId);
    if (ok) setSimpleDeleteModal(null);
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const usageByEstimateId = useMemo(() => {
    const map = new Map<string, EstimatePackageUsage[]>();
    const pushUsage = (presetId: string, usage: EstimatePackageUsage) => {
      map.set(presetId, [...(map.get(presetId) ?? []), usage]);
    };

    for (const pkg of repairPackages) {
      const baseMeta = {
        packageId: pkg.id,
        packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
      };
      const contractNumber = getDisplayContractNumber(pkg);
      const contractDate = getDisplayContractDate(pkg);

      const estimateRaw = (pkg.formData?.estimate ?? null) as Record<string, unknown> | null;
      const contractIds: string[] = [];
      if (estimateRaw && typeof estimateRaw.selectedPresetId === 'string') {
        const legacy = estimateRaw.selectedPresetId.trim();
        if (legacy) contractIds.push(legacy);
      }
      if (estimateRaw && Array.isArray(estimateRaw.selectedPresetIds)) {
        for (const id of estimateRaw.selectedPresetIds) {
          if (typeof id === 'string' && id.trim()) contractIds.push(id.trim());
        }
      }
      const contractUnique = [...new Set(contractIds)];
      if (contractUnique.length > 0) {
        const contractRow: EstimatePackageUsage = {
          ...baseMeta,
          kind: 'contract',
          packageStatus: pkg.status,
          contractNumber,
          contractDate,
        };
        for (const presetId of contractUnique) {
          pushUsage(presetId, contractRow);
        }
      }

      const addendumDatesRaw = pkg.formData?.addendumDocumentDates;
      const addendumDates: [string, string, string, string, string] = ['', '', '', '', ''];
      if (Array.isArray(addendumDatesRaw)) {
        for (let i = 0; i < 5; i++) {
          const d = addendumDatesRaw[i];
          addendumDates[i] = typeof d === 'string' ? d.trim() : '';
        }
      }

      const addendumSlotsRaw = pkg.formData?.addendumSlots;
      if (Array.isArray(addendumSlotsRaw)) {
        addendumSlotsRaw.forEach((slot, slotIndex0) => {
          if (slotIndex0 > 4) return;
          if (!slot || typeof slot !== 'object') return;
          const s = slot as Record<string, unknown>;
          const slotIds: string[] = [];
          const collect = (value: unknown) => {
            if (!Array.isArray(value)) return;
            for (const id of value) {
              if (typeof id === 'string' && id.trim()) slotIds.push(id.trim());
            }
          };
          collect(s.selectedPresetIds);
          collect(s.excludedSelectedPresetIds);
          const uniqueSlotIds = [...new Set(slotIds)];
          if (uniqueSlotIds.length === 0) return;
          const addendumRow: EstimatePackageUsage = {
            ...baseMeta,
            kind: 'addendum',
            addendumOrdinal: slotIndex0 + 1,
            addendumStatus: s.status === 'SIGNED' ? 'SIGNED' : 'OPEN',
            addendumDate: addendumDates[slotIndex0] ?? '',
            contractNumber,
            contractDate,
          };
          for (const presetId of uniqueSlotIds) {
            pushUsage(presetId, addendumRow);
          }
        });
      }
    }
    return map;
  }, [repairPackages]);

  /** Объект: нельзя менять наценку на уровне группы, если хотя бы один расчёт группы в подписанном договоре / Д/с. */
  const groupIdsWithLockedEstimate = useMemo(() => {
    const ids = new Set<string>();
    for (const it of items) {
      if (!it.groupId) continue;
      const usages = usageByEstimateId.get(it.id) ?? [];
      if (usages.some((u) => isUsageLocked(u))) ids.add(it.groupId);
    }
    return ids;
  }, [items, usageByEstimateId]);

  const updateGroupAdditionalMarkupPercent = (groupId: string, raw: string) => {
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
  };

  const updatePresetAdditionalMarkupPercent = (estimateId: string, raw: string) => {
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
  };

  const visibleItems = useMemo(() => {
    const base = items.filter((it) => {
      const isBound = (usageByEstimateId.get(it.id)?.length ?? 0) > 0;
      if (attachmentFilter === 'bound') return isBound;
      if (attachmentFilter === 'unbound') return !isBound;
      return true;
    });
    return base.filter((it) => {
      const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
      const groupArchived = Boolean(g?.archived);
      const rowArchived = Boolean(it.archived);
      const inArchiveCombined = groupArchived || rowArchived;
      return archiveView ? inArchiveCombined : !inArchiveCombined;
    });
  }, [items, attachmentFilter, usageByEstimateId, archiveView, groups]);

  const hasAnythingInArchive = useMemo(
    () =>
      items.some((it) => {
        const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
        return Boolean(it.archived) || Boolean(g?.archived);
      }),
    [items, groups]
  );

  const groupsSortedMain = useMemo(
    () => sortEstimateGroupsByTitle(groups.filter((g) => !g.archived)),
    [groups]
  );
  const groupsSortedArchived = useMemo(
    () => sortEstimateGroupsByTitle(groups.filter((g) => Boolean(g.archived))),
    [groups]
  );
  const groupsForLayout = archiveView ? groupsSortedArchived : groupsSortedMain;
  const groupsForSelect = groupsForLayout;

  type EstimateLayoutBlock =
    | {
        kind: 'group';
        group: ContractEstimateGroup;
        items: ContractEstimatePreset[];
        mergeGlobalIndex: number;
        mergeGlobalTotal: number;
      }
    | {
        kind: 'standaloneRun';
        entries: Array<{
          preset: ContractEstimatePreset;
          mergeGlobalIndex: number;
          mergeGlobalTotal: number;
        }>;
      }
    | { kind: 'soloArchived'; items: ContractEstimatePreset[] };

  const { estimateLayoutBlocks } = useMemo(() => {
    const mergeSortRows = buildMergeSortRows({
      groupsForLayout,
      visibleItems,
      attachmentFilter,
      estimateListSortMode,
    });
    const mergeGlobalTotal = mergeSortRows.length;

    const blocks: EstimateLayoutBlock[] = [];
    let i = 0;
    while (i < mergeSortRows.length) {
      const row = mergeSortRows[i];
      if (row.kind === 'group') {
        blocks.push({
          kind: 'group',
          group: row.group,
          items: row.items,
          mergeGlobalIndex: i,
          mergeGlobalTotal,
        });
        i++;
      } else {
        const entries: Array<{
          preset: ContractEstimatePreset;
          mergeGlobalIndex: number;
          mergeGlobalTotal: number;
        }> = [];
        while (i < mergeSortRows.length && mergeSortRows[i].kind === 'standalone') {
          const s = mergeSortRows[i];
          if (s.kind !== 'standalone') break;
          entries.push({
            preset: s.preset,
            mergeGlobalIndex: i,
            mergeGlobalTotal,
          });
          i++;
        }
        if (entries.length > 0) blocks.push({ kind: 'standaloneRun', entries });
      }
    }

    if (archiveView) {
      const soloArchived = visibleItems.filter((it) => {
        if (!it.groupId || !it.archived) return false;
        const g = groups.find((x) => x.id === it.groupId);
        if (!g) return false;
        return !g.archived;
      });
      if (soloArchived.length > 0) {
        blocks.push({
          kind: 'soloArchived',
          items: [...soloArchived].sort((a, b) =>
            comparePresetsInGroup(a, b, estimateListSortMode)
          ),
        });
      }
    }

    return { estimateLayoutBlocks: blocks };
  }, [groupsForLayout, visibleItems, attachmentFilter, archiveView, groups, estimateListSortMode]);

  type EstimateCardReorder =
    | { scope: 'inGroup'; groupId: string; index: number; total: number }
    | { scope: 'orphan'; mergeGlobalIndex: number; mergeGlobalTotal: number };

  const handleMoveMergeGroup = (groupId: string, dir: -1 | 1) => {
    const rows = buildMergeSortRows({
      groupsForLayout,
      visibleItems,
      attachmentFilter,
      estimateListSortMode,
    });
    const idx = rows.findIndex((r) => r.kind === 'group' && r.group.id === groupId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const swapped = [...rows];
    [swapped[idx], swapped[j]] = [swapped[j], swapped[idx]];
    const { nextItems, nextGroups } = applyMergeListOrdersFromRows(swapped, items, groups);
    void persistEstimates(nextItems, nextGroups, { suppressSuccessMessage: true });
  };

  const handleMoveOrphanPreset = (presetId: string, dir: -1 | 1) => {
    const rows = buildMergeSortRows({
      groupsForLayout,
      visibleItems,
      attachmentFilter,
      estimateListSortMode,
    });
    const idx = rows.findIndex((r) => r.kind === 'standalone' && r.preset.id === presetId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const swapped = [...rows];
    [swapped[idx], swapped[j]] = [swapped[j], swapped[idx]];
    const { nextItems, nextGroups } = applyMergeListOrdersFromRows(swapped, items, groups);
    void persistEstimates(nextItems, nextGroups, { suppressSuccessMessage: true });
  };

  const handleMovePresetInGroup = (groupId: string, presetId: string, dir: -1 | 1) => {
    const visibleIds = new Set(visibleItems.map((x) => x.id));
    const peers = visibleItems
      .filter((it) => it.groupId === groupId)
      .sort((a, b) => comparePresetsInGroup(a, b, estimateListSortMode));
    const idx = peers.findIndex((p) => p.id === presetId);
    if (idx < 0) return;
    const j = idx + dir;
    if (j < 0 || j >= peers.length) return;
    const swapped = [...peers];
    [swapped[idx], swapped[j]] = [swapped[j], swapped[idx]];
    const nextItems = applyInGroupListOrders(groupId, swapped, items, visibleIds);
    void persistEstimates(nextItems, groups, { suppressSuccessMessage: true });
  };

  const renderEstimateCard = (it: ContractEstimatePreset, reorder?: EstimateCardReorder) => {
    const usages = usageByEstimateId.get(it.id) ?? [];
    const isBound = usages.length > 0;
    const hasLockedUsage = usages.some((u) => isUsageLocked(u));
    const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
    const groupArchived = Boolean(groupForIt?.archived);
    const canPresetArchive = !isBound && !it.archived && !groupArchived && !it.groupId;
    const canPresetRestoreFromArchive = Boolean(it.archived) && !groupArchived;
    const primaryUsage = usages[0];
    const primaryLabel = primaryUsage ? formatEstimatePackageUsageLabel(primaryUsage) : '';
    const boundBadgeText = primaryUsage
      ? usages.length > 1
        ? `${primaryLabel} (+${usages.length - 1})`
        : primaryLabel
      : 'Не привязан';
    const attachSnap = getSnapshotForEstimateAttach(it, groups);
    const fullMarkupSnap = getBaseSnapshotWithMarkupForPreset(it, groups);
    const snapshotTotal = attachSnap?.total;
    const fullSnapshotTotal = fullMarkupSnap?.total;
    const hasSnapshotTotal = typeof snapshotTotal === 'number' && Number.isFinite(snapshotTotal);
    const hasFullSnapshotTotal =
      typeof fullSnapshotTotal === 'number' && Number.isFinite(fullSnapshotTotal);
    const showFullEstimateTotalInParens =
      Boolean(it.splitBundleId) &&
      hasSnapshotTotal &&
      hasFullSnapshotTotal &&
      Math.abs(fullSnapshotTotal - snapshotTotal) > 0.005;
    const splitTree = it.groupId ? buildEstimateWorkScopeTree(it, groups) : [];
    const canOpenWorkScopeSplit = Boolean(it.groupId) && splitTree.length > 0;
    const splitBundlePeers = it.splitBundleId
      ? items.filter((p) => p.splitBundleId === it.splitBundleId)
      : [];
    const splitBundleCoversAllPositions = splitBundleCoversAllWorkScopeLines(
      it,
      splitBundlePeers,
      groups
    );
    const splitBundleTooltip =
      splitBundlePeers.length > 0
        ? `Связанные расчёты (${splitBundlePeers.length}):\n${splitBundlePeers.map((p) => `· ${p.title}`).join('\n')}${
            splitBundleCoversAllPositions
              ? '\n\nВсе позиции сметы распределены по расчётам связки.'
              : ''
          }`
        : '';
    const canAddLinkedSplitInstance =
      Boolean(it.groupId) && isPresetEligibleForLinkedSplitInstance(it);
    return (
      <div
        key={it.id}
        className={`${styles.estimatesCard}${it.splitBundleId ? ` ${styles.estimatesCardSplitBundle}` : ''}`}
      >
        {reorder ? (
          <div
            className={styles.estimatesCardReorderCol}
            role="group"
            aria-label="Порядок в списке"
          >
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn} ${styles.estimatesReorderStackBtn}`}
              disabled={
                saving ||
                (reorder.scope === 'inGroup' ? reorder.index <= 0 : reorder.mergeGlobalIndex <= 0)
              }
              aria-label="Выше в списке"
              title="Выше в списке"
              onClick={() =>
                reorder.scope === 'inGroup'
                  ? handleMovePresetInGroup(reorder.groupId, it.id, -1)
                  : handleMoveOrphanPreset(it.id, -1)
              }
            >
              <EstimatesReorderArrowUp />
            </button>
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn} ${styles.estimatesReorderStackBtn}`}
              disabled={
                saving ||
                (reorder.scope === 'inGroup'
                  ? reorder.index >= reorder.total - 1
                  : reorder.mergeGlobalIndex >= reorder.mergeGlobalTotal - 1)
              }
              aria-label="Ниже в списке"
              title="Ниже в списке"
              onClick={() =>
                reorder.scope === 'inGroup'
                  ? handleMovePresetInGroup(reorder.groupId, it.id, 1)
                  : handleMoveOrphanPreset(it.id, 1)
              }
            >
              <EstimatesReorderArrowDown />
            </button>
          </div>
        ) : null}
        <div className={styles.estimatesCardMain}>
          <div className={styles.estimatesCardTitleRow}>
            <strong className={styles.estimatesCardTitle}>{it.title}</strong>
            {hasLockedUsage ? (
              <span
                className={styles.estimatesBadge}
                title="Расчёт нельзя редактировать: договор подписан или Д/с подписано"
                aria-label="Расчёт заблокирован для редактирования"
              >
                🔒
              </span>
            ) : null}
            <span
              className={`${styles.estimatesBadge} ${isBound ? styles.estimatesBadgeBound : styles.estimatesBadgeFree}`}
            >
              {isBound ? boundBadgeText : 'Не привязан'}
            </span>
            {it.splitBundleId ? (
              <span
                className={`${styles.estimatesBadge} ${styles.estimatesSplitBundleBadge}${
                  splitBundleCoversAllPositions
                    ? ` ${styles.estimatesSplitBundleBadgeComplete}`
                    : ''
                }`}
                title={splitBundleTooltip}
              >
                Связка · {splitBundlePeers.length}
              </span>
            ) : null}
          </div>
          <span className={styles.estimatesCardMeta}>
            {it.categoryName}
            {it.updatedAt ? ` · ${new Date(it.updatedAt).toLocaleString('ru-RU')}` : ''}
          </span>
          <span className={styles.estimatesCardCost}>
            Стоимость:{' '}
            {hasSnapshotTotal ? (
              <>
                <strong>{formatEstimatePresetTotalRub(snapshotTotal)}</strong>
                {showFullEstimateTotalInParens ? (
                  <span className={styles.estimatesCardCostFull}>
                    {' '}
                    (всего {formatEstimatePresetTotalRub(fullSnapshotTotal)})
                  </span>
                ) : null}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>
        <label className={`${styles.field} ${styles.estimatesCardGroupField}`}>
          <span>Объект</span>
          <select
            value={it.groupId && groups.some((g) => g.id === it.groupId) ? it.groupId : ''}
            disabled={saving}
            onChange={(e) => assignEstimateToGroup(it.id, e.target.value ? e.target.value : null)}
          >
            <option value="">Не в объекте</option>
            {groupsForSelect.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label
          className={`${styles.field} ${styles.estimatesCardMarkupField}`}
          title={
            hasLockedUsage
              ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
              : 'Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете.'
          }
        >
          <span>Наценка, %</span>
          <input
            key={`${it.id}:markup:${it.additionalMarkupPercent ?? 'none'}`}
            type="number"
            min={0}
            max={999}
            step={0.1}
            defaultValue={
              typeof it.additionalMarkupPercent === 'number'
                ? String(it.additionalMarkupPercent)
                : '0'
            }
            disabled={saving || hasLockedUsage}
            onFocus={(e) => {
              e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
            }}
            onBlur={(e) => {
              if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
              updatePresetAdditionalMarkupPercent(it.id, e.target.value);
            }}
          />
        </label>
        <div className={styles.estimatesCardActions}>
          {!archiveView && canPresetArchive ? (
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
              disabled={saving}
              aria-label="В архив"
              title="Отправить расчёт в архив: скрыть из основного списка и из выбора при оформлении договоров"
              onClick={() => setPresetArchived(it.id, true)}
            >
              <EstimatesArchiveIcon />
            </button>
          ) : null}
          {archiveView && canPresetRestoreFromArchive ? (
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
              disabled={saving}
              aria-label="Восстановить"
              title="Вернуть расчёт в основной список"
              onClick={() => setPresetArchived(it.id, false)}
            >
              <EstimatesRestoreFromArchiveIcon />
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Редактировать"
            title={
              hasLockedUsage
                ? 'Редактирование запрещено: договор подписан или Д/с подписано'
                : 'Редактировать'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              if (usages.length > 0) {
                setDetachEditModal({
                  estimateId: it.id,
                  usages: [...usages],
                });
                return;
              }
              router.push(
                `/admin/contract-documents/estimates/workspace?id=${encodeURIComponent(it.id)}`
              );
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-1)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Копировать расчёт"
            title="Создать обычную копию расчёта (отдельный расчёт без связи при разделении сметы)"
            disabled={saving}
            onClick={() =>
              router.push(
                `/admin/contract-documents/estimates/workspace?copyFrom=${encodeURIComponent(it.id)}`
              )
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-2)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          {it.groupId && !archiveView ? (
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
              aria-label="Связанный экземпляр для другого договора"
              title={
                canAddLinkedSplitInstance
                  ? 'Создать связанный экземпляр расчёта (после сохранения выберите позиции).'
                  : 'Сначала сохраните состав позиций в модалке «Разделение сметы» у этого расчёта.'
              }
              disabled={saving || hasLockedUsage || !canAddLinkedSplitInstance}
              onClick={() => {
                if (!canAddLinkedSplitInstance || hasLockedUsage) return;
                router.push(
                  `/admin/contract-documents/estimates/workspace?copyFrom=${encodeURIComponent(it.id)}&splitInstance=1`
                );
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--admin-chart-series-5)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
          ) : null}
          {canOpenWorkScopeSplit && !archiveView ? (
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
              aria-label="Состав работ по договорам"
              title="Разделение сметы: выбор позиций для этого экземпляра и связанных копий"
              disabled={saving || hasLockedUsage}
              onClick={() => setWorkScopeModalPresetId(it.id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--admin-chart-series-4)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M16 3h5v5" />
                <path d="M8 3H3v5" />
                <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
                <path d="m15 9 6-6" />
                <path d="M21 16v5h-5" />
                <path d="M8 21H3v-5" />
                <path d="M12 11V3" />
              </svg>
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
            aria-label="Удалить"
            title={
              hasLockedUsage ? 'Удаление запрещено: договор подписан или Д/с подписано' : 'Удалить'
            }
            disabled={saving || hasLockedUsage}
            onClick={() => {
              if (hasLockedUsage) return;
              if (usages.length > 0) {
                setDetachDeleteModal({
                  estimateId: it.id,
                  usages: [...usages],
                });
                return;
              }
              setSimpleDeleteModal({
                estimateId: it.id,
                title: it.title.trim() || 'Расчёт',
                inSplitBundle: Boolean(it.splitBundleId),
              });
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--admin-chart-series-6)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const workScopePreset =
    workScopeModalPresetId == null
      ? null
      : (items.find((x) => x.id === workScopeModalPresetId) ?? null);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${styles.pageWide} ${styles.estimatesPage}${archiveView ? ` ${styles.estimatesPageInArchive}` : ''}`}
    >
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents">
            ← К разделу «Оформление договоров»
          </Link>
          <h1 className={styles.title}>{archiveView ? 'Архив расчётов' : 'Расчёты'}</h1>
        </div>
        <div className={styles.headerButtonsRow}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
            disabled={saving || refreshing}
            aria-busy={refreshing}
            aria-label={refreshing ? 'Обновление списка расчётов' : 'Обновить список расчётов'}
            title="Обновить"
            onClick={() => void refreshEstimates()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={refreshing ? styles.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn} ${styles.estimatesPageArchiveIconBtn}`}
            disabled={saving || refreshing}
            aria-label={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : 'Архив: объекты и расчёты, отправленные в архив'
            }
            title={
              archiveView
                ? 'Вернуться к основному списку расчётов'
                : 'Объекты с расчётами, отправленные в архив'
            }
            onClick={() => setArchiveView((v) => !v)}
          >
            {archiveView ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M8 6h13" />
                <path d="M8 12h13" />
                <path d="M8 18h13" />
                <path d="M3 6h.01" />
                <path d="M3 12h.01" />
                <path d="M3 18h.01" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M21 8v13H3V8" />
                <path d="M23 3v5H1V3z" />
                <path d="M10 12h4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div
        className={`${styles.sectionCard} ${styles.estimatesListSection}${archiveView ? ` ${styles.estimatesListSectionArchive}` : ''}`}
      >
        <div
          className={`${styles.estimatesControlsSingleRow}${archiveView ? ` ${styles.estimatesControlsSingleRowArchive}` : ''}`}
        >
          {!archiveView ? (
            <>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesGenerateFromMeasurementBtn}`}
                disabled={saving || refreshing}
                onClick={() => void openGenerateFromMeasurementModal()}
              >
                Создать расчёт из замера
              </button>
              <Link
                className={`${styles.primaryBtn} ${styles.estimatesCompactPrimaryLink}`}
                href="/admin/contract-documents/estimates/workspace"
                style={{ textDecoration: 'none' }}
              >
                Создать расчёт
              </Link>
            </>
          ) : null}
          <EstimatesAttachmentFilterControl
            value={attachmentFilter}
            onChange={setAttachmentFilter}
            disabled={saving}
          />
          <EstimatesListSortControl
            value={estimateListSortMode}
            onChange={setEstimateListSortMode}
            disabled={saving}
          />
          <div className={styles.estimatesFilterRowSpacer} aria-hidden />
          {!archiveView ? (
            <div className={styles.estimatesFilterRowTrailing}>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesAddObjectBtn}`}
                disabled={saving}
                onClick={createObjectGroup}
              >
                Добавить объект
              </button>
            </div>
          ) : null}
        </div>
        <div
          className={`${styles.estimatesSectionsStack}${archiveView ? ` ${styles.estimatesSectionsStackArchive}` : ''}`}
        >
          {visibleItems.length === 0 ? (
            <p className={styles.hint} style={{ margin: 0 }}>
              {archiveView && !hasAnythingInArchive
                ? 'В архиве пока нет расчётов и объектов.'
                : 'Нет расчётов для текущего фильтра.'}
            </p>
          ) : (
            estimateLayoutBlocks.map((block) => {
              if (block.kind === 'group') {
                const section = block;
                const groupCollapsed = collapsedGroupIds.has(section.group.id);
                const allInGroup = items.filter((it) => it.groupId === section.group.id);
                const totalInGroup = allInGroup.length;
                const boundInGroup = allInGroup.filter(
                  (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
                ).length;
                return (
                  <div
                    key={section.group.id}
                    className={`${styles.estimatesGroupBlock} ${boundInGroup > 0 ? styles.estimatesGroupBlockHasBound : ''}`}
                  >
                    <div
                      className={`${styles.estimatesGroupHeader} ${groupCollapsed ? styles.estimatesGroupHeaderCollapsed : ''}`}
                    >
                      <button
                        type="button"
                        className={`${styles.secondaryBtn} ${styles.estimatesGroupCollapseBtn}`}
                        aria-expanded={!groupCollapsed}
                        aria-label={
                          groupCollapsed ? 'Развернуть расчёты объекта' : 'Свернуть расчёты объекта'
                        }
                        title={groupCollapsed ? 'Развернуть' : 'Свернуть'}
                        disabled={saving}
                        onClick={() => toggleGroupCollapsed(section.group.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`${styles.estimatesGroupCollapseChevron}${groupCollapsed ? ` ${styles.estimatesGroupCollapseChevronFolded}` : ''}`}
                          aria-hidden
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      <div
                        className={styles.estimatesGroupReorderCol}
                        role="group"
                        aria-label="Порядок объекта в списке"
                      >
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.estimatesIconBtn} ${styles.estimatesGroupReorderBtn}`}
                          disabled={
                            saving || section.mergeGlobalTotal < 2 || section.mergeGlobalIndex <= 0
                          }
                          aria-label="Объект выше в списке"
                          title="Объект выше в общем списке"
                          onClick={() => handleMoveMergeGroup(section.group.id, -1)}
                        >
                          <EstimatesReorderArrowUp />
                        </button>
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.estimatesIconBtn} ${styles.estimatesGroupReorderBtn}`}
                          disabled={
                            saving ||
                            section.mergeGlobalTotal < 2 ||
                            section.mergeGlobalIndex >= section.mergeGlobalTotal - 1
                          }
                          aria-label="Объект ниже в списке"
                          title="Объект ниже в общем списке"
                          onClick={() => handleMoveMergeGroup(section.group.id, 1)}
                        >
                          <EstimatesReorderArrowDown />
                        </button>
                      </div>
                      <label className={`${styles.field} ${styles.estimatesGroupTitleField}`}>
                        <span>Название объекта</span>
                        <input
                          key={`${section.group.id}:${section.group.title}`}
                          defaultValue={section.group.title}
                          disabled={saving}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== section.group.title) {
                              renameObjectGroup(section.group.id, v);
                            }
                          }}
                        />
                      </label>
                      <label
                        className={`${styles.field} ${styles.estimatesGroupTitleField}`}
                        style={{ maxWidth: 150 }}
                      >
                        <span>Доп. наценка, %</span>
                        <input
                          key={`${section.group.id}:markup:${section.group.additionalMarkupPercent ?? 'none'}`}
                          type="number"
                          min={0}
                          max={999}
                          step={0.1}
                          defaultValue={
                            typeof section.group.additionalMarkupPercent === 'number'
                              ? String(section.group.additionalMarkupPercent)
                              : '0'
                          }
                          disabled={saving || groupIdsWithLockedEstimate.has(section.group.id)}
                          title={
                            groupIdsWithLockedEstimate.has(section.group.id)
                              ? 'Нельзя менять наценку объекта: в группе есть расчёт, прикреплённый к пакету со статусом «Договор подписан» или к подписанному Д/с.'
                              : 'На все расчёты этого объекта: +% к цене каждой позиции в смете'
                          }
                          onFocus={(e) => {
                            e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
                          }}
                          onBlur={(e) => {
                            if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value)
                              return;
                            updateGroupAdditionalMarkupPercent(section.group.id, e.target.value);
                          }}
                        />
                      </label>
                      <span className={styles.estimatesGroupCount}>
                        Расчётов: {totalInGroup} · привязано: {boundInGroup}
                      </span>
                      {!archiveView && totalInGroup > 0 ? (
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                          disabled={saving}
                          aria-label="В архив"
                          title="Скрыть объект из основного списка и из выбора при оформлении договоров"
                          onClick={() => setGroupArchived(section.group.id, true)}
                        >
                          <EstimatesArchiveIcon />
                        </button>
                      ) : null}
                      {archiveView ? (
                        <button
                          type="button"
                          className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                          disabled={saving}
                          aria-label="Восстановить"
                          title="Вернуть объект в основной список и в выбор при оформлении договоров"
                          onClick={() => setGroupArchived(section.group.id, false)}
                        >
                          <EstimatesRestoreFromArchiveIcon />
                        </button>
                      ) : null}
                      {totalInGroup === 0 ? (
                        <button
                          type="button"
                          className={`${styles.dangerBtn} ${styles.estimatesGroupDangerBtn}`}
                          disabled={saving}
                          title="Удалить пустой объект"
                          onClick={() => removeObjectGroup(section.group.id)}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                    {!groupCollapsed ? (
                      <div className={styles.estimatesCardsStack}>
                        {section.items.length === 0 ? (
                          <p className={styles.estimatesEmptyInGroup}>
                            В этом объекте нет расчётов для текущего фильтра.
                          </p>
                        ) : (
                          section.items.map((it, idx) =>
                            renderEstimateCard(it, {
                              scope: 'inGroup',
                              groupId: section.group.id,
                              index: idx,
                              total: section.items.length,
                            })
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              }
              if (block.kind === 'soloArchived') {
                return (
                  <div key="_soloArchived" className={styles.estimatesUngroupedBlock}>
                    <h4 className={styles.estimatesUngroupedHeading}>
                      В архиве отдельно (объект в основном списке)
                    </h4>
                    <div className={styles.estimatesCardsStack}>
                      {block.items.map((it) => renderEstimateCard(it))}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={`standRun_${[...block.entries]
                    .map((e) => e.preset.id)
                    .sort()
                    .join('|')}`}
                  className={styles.estimatesCardsStack}
                >
                  {block.entries.map(({ preset, mergeGlobalIndex, mergeGlobalTotal }) =>
                    renderEstimateCard(preset, {
                      scope: 'orphan',
                      mergeGlobalIndex,
                      mergeGlobalTotal,
                    })
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {workScopePreset ? (
        <EstimateWorkScopeSplitModal
          preset={workScopePreset}
          groups={groups}
          allPresets={items}
          saving={saving}
          onClose={() => setWorkScopeModalPresetId(null)}
          onSave={(payload) => handleWorkScopeSave(workScopePreset.id, payload)}
        />
      ) : null}

      {detachEditModal ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detach-edit-estimate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setDetachEditModal(null);
            }
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="detach-edit-estimate-title" className={styles.saveModalTitle}>
              Редактирование расчёта
            </h3>
            <p className={styles.saveModalText}>
              Этот расчёт прикреплён к смете договора или к дополнительному соглашению. После
              сохранения изменений его нужно будет заново прикрепить в пакете документов. Текущая
              привязка будет снята автоматически. Продолжить?
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={saving}
                onClick={() => setDetachEditModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving}
                onClick={() => void handleConfirmDetachEdit()}
              >
                {saving ? 'Подождите…' : 'Продолжить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detachDeleteModal ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="detach-delete-estimate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setDetachDeleteModal(null);
            }
          }}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="detach-delete-estimate-title" className={styles.saveModalTitle}>
              Удаление расчёта
            </h3>
            <p className={styles.saveModalText}>
              Этот расчёт прикреплён к смете договора или к дополнительному соглашению. При удалении
              привязка будет снята автоматически, расчёт исчезнет из общего списка. Его нужно будет
              заново создать и прикрепить в пакете документов, если он снова понадобится. Удалить?
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
                marginTop: 4,
              }}
            >
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={saving}
                onClick={() => setDetachDeleteModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={saving}
                onClick={() => void handleConfirmDetachDelete()}
              >
                {saving ? 'Подождите…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Modal
        isOpen={simpleDeleteModal != null}
        onClose={() => {
          if (saving) return;
          setSimpleDeleteModal(null);
        }}
        title="Удалить расчёт?"
        size="sm"
        showCloseButton
      >
        {simpleDeleteModal ? (
          <div className={confirmModalStyles.content}>
            <p className={confirmModalStyles.message}>
              Расчёт «<strong>{simpleDeleteModal.title}</strong>» будет удалён безвозвратно из
              общего списка. Восстановить его будет нельзя. Действие необратимо.
            </p>
            {simpleDeleteModal.inSplitBundle ? (
              <p className={confirmModalStyles.message}>
                Расчёт входит в связку разделения сметы: после удаления остальные экземпляры связки
                останутся; их набор выбранных позиций не пересчитается автоматически.
              </p>
            ) : null}
            <div className={confirmModalStyles.actions}>
              <button
                type="button"
                className={confirmModalStyles.cancelButton}
                disabled={saving}
                onClick={() => setSimpleDeleteModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
                disabled={saving}
                onClick={() => void handleConfirmSimpleDelete()}
              >
                {saving ? 'Подождите…' : 'Удалить'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {isGenerateFromMeasurementOpen ? (
        <div
          className={styles.saveModalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="generate-from-measurement-title"
          onClick={() => setIsGenerateFromMeasurementOpen(false)}
        >
          <div className={styles.saveModalCard} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.saveModalTitle} id="generate-from-measurement-title">
              Создание расчёта из выполненного замера
            </h3>
            {completedMeasurementsBusy ? (
              <p className={styles.hint}>Загрузка выполненных замеров…</p>
            ) : completedMeasurements.length === 0 ? (
              <p className={styles.hint}>
                Нет выполненных замеров с данными раздела «Замеры помещений».
              </p>
            ) : (
              <label className={styles.field}>
                <span>Выберите выполненный замер</span>
                <select
                  value={selectedMeasurementId}
                  onChange={(e) => setSelectedMeasurementId(e.target.value)}
                >
                  {completedMeasurements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.customerName} · {new Date(m.receptionDate).toLocaleDateString('ru-RU')}
                      {m.customerAddress ? ` · ${m.customerAddress}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={styles.saveModalActionsRow}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setIsGenerateFromMeasurementOpen(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={!selectedMeasurementId || completedMeasurementsBusy}
                onClick={() => {
                  if (!selectedMeasurementId) return;
                  router.push(
                    `/admin/contract-documents/estimates/workspace?fromMeasurement=${encodeURIComponent(selectedMeasurementId)}`
                  );
                }}
              >
                Создать расчёт
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
