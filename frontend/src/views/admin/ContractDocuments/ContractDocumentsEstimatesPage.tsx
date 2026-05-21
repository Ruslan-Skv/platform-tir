'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  getContractDocumentEstimatePresetsTrash,
  trashContractEstimatePreset,
} from '@/shared/api/admin-contract-document-estimate-presets-trash';
import {
  type ContractDocumentPackageStatus,
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { getMeasurements } from '@/shared/api/admin-crm';
import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminTablePagination } from '@/shared/ui/admin/AdminTablePagination';
import {
  AdminToolbarTrashButton,
  useAdminTrashCount,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import toolbarBadgeStyles from '@/shared/ui/admin/AdminToolbarIconButton/AdminToolbarTrashButton.module.css';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import styles from './ContractDocuments.module.css';
import { EstimateTrashModal } from './EstimateTrashModal';
import { ESTIMATE_TRASH_RETENTION_NOTICE } from './estimateTrashRetention';
import {
  ESTIMATES_PAGE_LIMIT_OPTIONS,
  type EstimatesListViewMode,
  type EstimatesPageLimit,
  loadEstimatesListFilters,
  persistEstimatesListFilters,
  reloadEstimatesListFiltersFromStorage,
} from './estimatesListFilters';
import { type EstimatesListSortBy, type EstimatesListSortOrder } from './estimatesListSort';
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
import { mergeRepairPackageFormData } from './repair/repairPackageForm';

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

function estimatesListFilterFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
}

function normalizeEstimatesListSearch(raw: string): string {
  return raw.trim().toLowerCase();
}

function estimateMatchesSearch(preset: ContractEstimatePreset, searchNorm: string): boolean {
  if (!searchNorm) return true;
  const haystack = [preset.title, preset.customerName, preset.objectAddress, preset.categoryName]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(searchNorm);
}

function estimateListFilterDay(preset: ContractEstimatePreset): string | null {
  const raw = preset.updatedAt ?? preset.createdAt;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function estimateMatchesDateRange(
  preset: ContractEstimatePreset,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  const day = estimateListFilterDay(preset);
  if (!day) return false;
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

function repairPackageManagerCrmUserId(formData: Record<string, unknown>): string {
  const form = mergeRepairPackageFormData(formData);
  return form.executor.signatoryCrmUserId?.trim() ?? '';
}

function estimateMatchesManagerFilter(
  presetId: string,
  managerFilter: string,
  managerIdsByPresetId: Map<string, Set<string>>
): boolean {
  if (!managerFilter) return true;
  const ids = managerIdsByPresetId.get(presetId);
  return Boolean(ids?.has(managerFilter));
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

function formatEstimateListTableCost(total: number): string {
  return total.toFixed(2).replace('.', ',');
}

const ESTIMATES_LIST_TABLE_COL_SPAN = 7;
const ESTIMATES_NO_ADDRESS_KEY = '__no_object_address__';

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

function parseIsoTs(raw: string | undefined): number {
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function presetSortTs(p: ContractEstimatePreset): number {
  return parseIsoTs(p.updatedAt ?? p.createdAt);
}

function comparePresetsForListSort(
  a: ContractEstimatePreset,
  b: ContractEstimatePreset,
  sortBy: EstimatesListSortBy,
  sortOrder: EstimatesListSortOrder
): number {
  let cmp = 0;
  if (sortBy === 'date') {
    cmp = presetSortTs(a) - presetSortTs(b);
  }
  if (cmp === 0) {
    cmp = a.title.localeCompare(b.title, 'ru');
  }
  return sortOrder === 'asc' ? cmp : -cmp;
}

function estimateObjectAddressKey(p: ContractEstimatePreset): string {
  const addr = (p.objectAddress ?? '').trim();
  return addr || ESTIMATES_NO_ADDRESS_KEY;
}

function estimateObjectAddressDisplayLabel(addressKey: string): string {
  return addressKey === ESTIMATES_NO_ADDRESS_KEY ? 'Без адреса объекта' : addressKey;
}

function sortEstimatesForList(
  list: ContractEstimatePreset[],
  sortBy: EstimatesListSortBy,
  sortOrder: EstimatesListSortOrder
): ContractEstimatePreset[] {
  return [...list].sort((a, b) => comparePresetsForListSort(a, b, sortBy, sortOrder));
}

function EstimatesListSortableTh({
  column,
  title,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: EstimatesListSortBy;
  title: string;
  sortBy: EstimatesListSortBy;
  sortOrder: EstimatesListSortOrder;
  onSort: (column: EstimatesListSortBy) => void;
}) {
  const isActive = sortBy === column;
  return (
    <th
      className={dataTableStyles.sortable}
      onClick={(e) => {
        e.stopPropagation();
        onSort(column);
      }}
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={dataTableStyles.headerContent}>
        {title}
        <span
          className={`${dataTableStyles.sortIcon} ${
            isActive ? dataTableStyles.sortIconActive : dataTableStyles.sortIconIdle
          }`}
          aria-hidden
        >
          {isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

function unifiedGroupIdForEstimates(items: ContractEstimatePreset[]): string | null {
  const ids = new Set(
    items.map((it) => it.groupId?.trim()).filter((id): id is string => Boolean(id))
  );
  if (ids.size !== 1) return null;
  return [...ids][0];
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const archiveView = searchParams.get('archive') === '1';

  const navigateArchiveView = useCallback(
    (nextArchive: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      if (nextArchive) params.set('archive', '1');
      else params.delete('archive');
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );
  const initialListFiltersRef = useRef(loadEstimatesListFilters());
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);
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
  /** В списке раскрыт только один адрес объекта (как на /contracts). */
  const [expandedAddressKey, setExpandedAddressKey] = useState<string | null>(null);
  const [detachEditModal, setDetachEditModal] = useState<{
    estimateId: string;
    usages: EstimatePackageUsage[];
  } | null>(null);
  const [trashConfirmModal, setTrashConfirmModal] = useState<{
    estimateId: string;
    title: string;
    inSplitBundle: boolean;
    detachedUsages: EstimatePackageUsage[];
  } | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const fetchEstimateTrashTotal = useCallback(
    () => getContractDocumentEstimatePresetsTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchEstimateTrashTotal);
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
  const [workScopeModalPresetId, setWorkScopeModalPresetId] = useState<string | null>(null);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [search, setSearch] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilter] = useState(initialListFiltersRef.current.managerFilter);
  const [listViewMode, setListViewMode] = useState<EstimatesListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
  const [dateFrom, setDateFrom] = useState(initialListFiltersRef.current.dateFrom);
  const [dateTo, setDateTo] = useState(initialListFiltersRef.current.dateTo);
  const [listSortBy, setListSortBy] = useState<EstimatesListSortBy>(
    initialListFiltersRef.current.sortBy
  );
  const [listSortOrder, setListSortOrder] = useState<EstimatesListSortOrder>(
    initialListFiltersRef.current.sortOrder
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<EstimatesPageLimit>(initialListFiltersRef.current.pageLimit);
  const searchNorm = useMemo(() => normalizeEstimatesListSearch(search), [search]);

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
    const [presetsRes, packagesRes, signatoriesRes] = await Promise.all([
      getContractDocumentEstimatePresets('REPAIR'),
      getContractDocumentPackages('REPAIR'),
      getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
        items: [] as ContractSignatoryProfile[],
      })),
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
    const profiles = (signatoriesRes.items ?? [])
      .filter((p) => Boolean(p.crmUserId?.trim()))
      .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' }));
    setManagerOptions(profiles);
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
    const saved = reloadEstimatesListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setListViewMode(saved.listViewMode);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    listFiltersHydratedRef.current = true;
  }, []);

  const handleListSortChange = useCallback(
    (column: EstimatesListSortBy) => {
      if (listSortBy === column) {
        setListSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setListSortBy(column);
        setListSortOrder('asc');
      }
    },
    [listSortBy]
  );

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistEstimatesListFilters({
      search,
      managerFilter,
      dateFrom,
      dateTo,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
      pageLimit: limit,
      listViewMode,
    });
  }, [search, managerFilter, dateFrom, dateTo, listSortBy, listSortOrder, limit, listViewMode]);

  useEffect(() => {
    if (listViewMode === 'flat') setExpandedAddressKey(null);
  }, [listViewMode]);

  useEffect(() => {
    setPage(1);
  }, [
    searchNorm,
    managerFilter,
    dateFrom,
    dateTo,
    listViewMode,
    listSortBy,
    listSortOrder,
    archiveView,
  ]);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerOptions]);

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

  const setEstimatesArchivedByAddress = (addressKey: string, archived: boolean) => {
    const ts = new Date().toISOString();
    const nextItems = items.map((it) =>
      estimateObjectAddressKey(it) === addressKey ? { ...it, archived, updatedAt: ts } : it
    );
    void persistEstimates(nextItems, groups);
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

  const handleConfirmTrashMove = async () => {
    if (!trashConfirmModal) return;
    const { estimateId, detachedUsages } = trashConfirmModal;
    const it = items.find((x) => x.id === estimateId);
    if (!it) {
      setTrashConfirmModal(null);
      return;
    }
    if (detachedUsages.length > 0) {
      setSaving(true);
      setError(null);
      let detachOk = false;
      try {
        for (const u of detachedUsages) {
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
    }
    const moved = await moveEstimateToTrashById(estimateId);
    if (moved) {
      setTrashConfirmModal(null);
      setOk('Расчёт перемещён в корзину.');
    }
  };

  const moveEstimateToTrashById = async (estimateId: string): Promise<boolean> => {
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

  const packageManagerById = useMemo(() => {
    const map = new Map<string, string>();
    for (const pkg of repairPackages) {
      map.set(pkg.id, repairPackageManagerCrmUserId(pkg.formData));
    }
    return map;
  }, [repairPackages]);

  const managerIdsByPresetId = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [presetId, usages] of usageByEstimateId) {
      const ids = new Set<string>();
      for (const usage of usages) {
        const managerId = packageManagerById.get(usage.packageId) ?? '';
        if (managerId) ids.add(managerId);
      }
      if (ids.size > 0) map.set(presetId, ids);
    }
    return map;
  }, [usageByEstimateId, packageManagerById]);

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
    return items.filter((it) => {
      const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
      const groupArchived = Boolean(g?.archived);
      const rowArchived = Boolean(it.archived);
      const inArchiveCombined = groupArchived || rowArchived;
      const archiveOk = archiveView ? inArchiveCombined : !inArchiveCombined;
      if (!archiveOk) return false;
      if (!estimateMatchesSearch(it, searchNorm)) return false;
      if (!estimateMatchesDateRange(it, dateFrom, dateTo)) return false;
      return estimateMatchesManagerFilter(it.id, managerFilter, managerIdsByPresetId);
    });
  }, [
    items,
    archiveView,
    groups,
    managerFilter,
    managerIdsByPresetId,
    searchNorm,
    dateFrom,
    dateTo,
  ]);

  const hasActiveListFilters = Boolean(searchNorm || managerFilter || dateFrom || dateTo);

  const archiveCount = useMemo(
    () =>
      items.filter((it) => {
        const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
        return Boolean(it.archived) || Boolean(g?.archived);
      }).length,
    [items, groups]
  );

  const hasAnythingInArchive = archiveCount > 0;

  const addressGroupCount = useMemo(() => {
    if (listViewMode === 'flat') return 0;
    const keys = new Set(visibleItems.map((it) => estimateObjectAddressKey(it)));
    return keys.size;
  }, [visibleItems, listViewMode]);

  type EstimateLayoutBlock =
    | { kind: 'address'; addressKey: string; items: ContractEstimatePreset[] }
    | { kind: 'flatRun'; items: ContractEstimatePreset[] }
    | { kind: 'soloArchived'; items: ContractEstimatePreset[] };

  const estimateLayoutBlocks = useMemo(() => {
    const soloArchivedIds = new Set<string>();
    if (archiveView) {
      for (const it of visibleItems) {
        if (!it.groupId || !it.archived) continue;
        const g = groups.find((x) => x.id === it.groupId);
        if (!g || g.archived) continue;
        soloArchivedIds.add(it.id);
      }
    }

    const blocks: EstimateLayoutBlock[] = [];

    if (listViewMode === 'flat') {
      const flatItems = visibleItems.filter((it) => !soloArchivedIds.has(it.id));
      if (flatItems.length > 0) {
        blocks.push({
          kind: 'flatRun',
          items: sortEstimatesForList(flatItems, listSortBy, listSortOrder),
        });
      }
    } else {
      const byAddress = new Map<string, ContractEstimatePreset[]>();
      for (const it of visibleItems) {
        if (soloArchivedIds.has(it.id)) continue;
        const key = estimateObjectAddressKey(it);
        const arr = byAddress.get(key) ?? [];
        arr.push(it);
        byAddress.set(key, arr);
      }

      const addressKeys = [...byAddress.keys()].sort((a, b) => {
        if (a === ESTIMATES_NO_ADDRESS_KEY) return 1;
        if (b === ESTIMATES_NO_ADDRESS_KEY) return -1;
        return a.localeCompare(b, 'ru');
      });

      for (const addressKey of addressKeys) {
        blocks.push({
          kind: 'address',
          addressKey,
          items: sortEstimatesForList(byAddress.get(addressKey) ?? [], listSortBy, listSortOrder),
        });
      }
    }

    if (soloArchivedIds.size > 0) {
      const soloArchived = visibleItems.filter((it) => soloArchivedIds.has(it.id));
      blocks.push({
        kind: 'soloArchived',
        items: sortEstimatesForList(soloArchived, listSortBy, listSortOrder),
      });
    }

    return blocks;
  }, [visibleItems, archiveView, groups, listViewMode, listSortBy, listSortOrder]);

  type EstimatesTableDisplayItem =
    | { type: 'address'; addressKey: string; items: ContractEstimatePreset[] }
    | { type: 'estimate'; preset: ContractEstimatePreset; childOfAddress?: boolean }
    | { type: 'soloArchivedSection' };

  const tableDisplayItems = useMemo((): EstimatesTableDisplayItem[] => {
    const out: EstimatesTableDisplayItem[] = [];
    for (const block of estimateLayoutBlocks) {
      if (block.kind === 'flatRun') {
        for (const preset of block.items) {
          out.push({ type: 'estimate', preset });
        }
      } else if (block.kind === 'address') {
        out.push({
          type: 'address',
          addressKey: block.addressKey,
          items: block.items,
        });
        if (expandedAddressKey === block.addressKey) {
          for (const preset of block.items) {
            out.push({ type: 'estimate', preset, childOfAddress: true });
          }
        }
      } else if (block.kind === 'soloArchived') {
        out.push({ type: 'soloArchivedSection' });
        for (const preset of block.items) {
          out.push({ type: 'estimate', preset });
        }
      }
    }
    return out;
  }, [estimateLayoutBlocks, expandedAddressKey]);

  const totalTableRows = tableDisplayItems.length;

  const paginatedDisplayItems = useMemo(
    () => tableDisplayItems.slice((page - 1) * limit, page * limit),
    [tableDisplayItems, page, limit]
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalTableRows / limit));
    if (page > totalPages) setPage(totalPages);
  }, [totalTableRows, limit, page]);

  const renderEstimateAddressGroupRow = (
    section: Extract<EstimateLayoutBlock, { kind: 'address' }>
  ) => {
    const expanded = expandedAddressKey === section.addressKey;
    const boundInGroup = section.items.filter(
      (it) => (usageByEstimateId.get(it.id)?.length ?? 0) > 0
    ).length;
    const hasBound = boundInGroup > 0;
    const unifiedGroupId = unifiedGroupIdForEstimates(section.items);
    const unifiedGroup = unifiedGroupId ? groups.find((g) => g.id === unifiedGroupId) : undefined;

    return (
      <tr
        key={section.addressKey}
        className={`${dataTableStyles.row} ${styles.repairContractsListObjectRow} ${
          expanded ? styles.repairContractsListObjectRowExpanded : ''
        }`}
      >
        <td className={styles.repairContractsListSelectCol}>
          <button
            type="button"
            className={styles.repairContractsListExpandBtn}
            aria-expanded={expanded}
            aria-label={expanded ? 'Свернуть расчёты объекта' : 'Развернуть расчёты объекта'}
            title={expanded ? 'Свернуть' : 'Развернуть'}
            disabled={saving}
            onClick={() =>
              setExpandedAddressKey((current) =>
                current === section.addressKey ? null : section.addressKey
              )
            }
          >
            {expanded ? '▼' : '▶'}
          </button>
        </td>
        <td className={styles.estimatesListTitleCell}>
          <span className={styles.estimatesListObjectAddressLabel}>
            {estimateObjectAddressDisplayLabel(section.addressKey)}
          </span>
          <span className={styles.repairContractsListObjectBadge}>
            {section.items.length} расч.
            {boundInGroup > 0 ? ` · привяз. ${boundInGroup}` : ''}
          </span>
        </td>
        <td className={styles.estimatesListDateCell}>—</td>
        <td className={styles.estimatesListCostCell}>—</td>
        <td className={styles.estimatesListBindingCell}>
          {hasBound ? (
            <span className={`${styles.estimatesBadge} ${styles.estimatesBadgeBound}`}>
              Есть привязки
            </span>
          ) : (
            '—'
          )}
        </td>
        <td className={styles.estimatesListMarkupCell}>
          {unifiedGroup ? (
            <label
              className={`${styles.field} ${styles.estimatesListInlineField}`}
              title={
                groupIdsWithLockedEstimate.has(unifiedGroup.id)
                  ? 'Нельзя менять наценку: в группе есть расчёт, прикреплённый к подписанному договору или Д/с.'
                  : 'На все расчёты с этим адресом в одной группе: +% к цене каждой позиции в смете'
              }
            >
              <span className={styles.estimatesListVisuallyHidden}>Наценка, %</span>
              <input
                key={`${unifiedGroup.id}:markup:${unifiedGroup.additionalMarkupPercent ?? 'none'}`}
                type="number"
                min={0}
                max={999}
                step={0.1}
                defaultValue={
                  typeof unifiedGroup.additionalMarkupPercent === 'number'
                    ? String(unifiedGroup.additionalMarkupPercent)
                    : '0'
                }
                disabled={saving || groupIdsWithLockedEstimate.has(unifiedGroup.id)}
                onFocus={(e) => {
                  e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
                }}
                onBlur={(e) => {
                  if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value) return;
                  updateGroupAdditionalMarkupPercent(unifiedGroup.id, e.target.value);
                }}
              />
            </label>
          ) : (
            '—'
          )}
        </td>
        <td className={styles.repairContractsListActionsCol}>
          <div className={`${styles.estimatesCardActions} ${styles.estimatesListActionsRow}`}>
            {!archiveView && section.items.length > 0 ? (
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                disabled={saving}
                aria-label="В архив"
                title="Отправить все расчёты по этому адресу в архив"
                onClick={() => setEstimatesArchivedByAddress(section.addressKey, true)}
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
                title="Вернуть все расчёты по этому адресу в основной список"
                onClick={() => setEstimatesArchivedByAddress(section.addressKey, false)}
              >
                <EstimatesRestoreFromArchiveIcon />
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  const renderEstimateTableRow = (
    it: ContractEstimatePreset,
    options?: { childOfAddress?: boolean }
  ) => {
    const usages = usageByEstimateId.get(it.id) ?? [];
    const isBound = usages.length > 0;
    const hasLockedUsage = usages.some((u) => isUsageLocked(u));
    const groupForIt = it.groupId ? groups.find((g) => g.id === it.groupId) : undefined;
    const groupArchived = Boolean(groupForIt?.archived);
    const canPresetArchive = !isBound && !it.archived && !groupArchived;
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
    const updatedLabel = it.updatedAt
      ? new Date(it.updatedAt).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
    const isChildRow = Boolean(options?.childOfAddress);

    return (
      <tr
        key={it.id}
        className={`${dataTableStyles.row} ${styles.estimatesListEstimateRow}${
          isChildRow ? ` ${styles.repairContractsListChildRow}` : ''
        }`}
      >
        <td className={styles.repairContractsListSelectCol} />
        <td className={styles.estimatesListTitleCell}>
          <div className={styles.estimatesCardTitleRow}>
            <span className={styles.estimatesCardTitle}>{it.title}</span>
            {hasLockedUsage ? (
              <span
                className={styles.estimatesBadge}
                title="Расчёт нельзя редактировать: договор подписан или Д/с подписано"
                aria-label="Расчёт заблокирован для редактирования"
              >
                🔒
              </span>
            ) : null}
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
        </td>
        <td className={styles.estimatesListDateCell}>{updatedLabel}</td>
        <td className={styles.estimatesListCostCell}>
          {hasSnapshotTotal ? (
            <>
              <span>{formatEstimateListTableCost(snapshotTotal)}</span>
              {showFullEstimateTotalInParens ? (
                <span className={styles.estimatesCardCostFull}>
                  {' '}
                  ({formatEstimateListTableCost(fullSnapshotTotal)})
                </span>
              ) : null}
            </>
          ) : (
            '—'
          )}
        </td>
        <td
          className={styles.estimatesListBindingCell}
          title={isBound ? boundBadgeText : undefined}
        >
          <span
            className={`${styles.estimatesBadge} ${isBound ? styles.estimatesBadgeBound : styles.estimatesBadgeFree}`}
          >
            {isBound ? boundBadgeText : 'Не привязан'}
          </span>
        </td>
        <td className={styles.estimatesListMarkupCell}>
          <label
            className={`${styles.field} ${styles.estimatesListInlineField}`}
            title={
              hasLockedUsage
                ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
                : 'Доп. наценка к расчёту, %. Пусто — для расчёта в объекте действует наценка объекта; иначе +% к цене каждой позиции при прикреплении к смете.'
            }
          >
            <span className={styles.estimatesListVisuallyHidden}>Наценка, %</span>
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
        </td>
        <td className={styles.repairContractsListActionsCol}>
          <div className={`${styles.estimatesCardActions} ${styles.estimatesListActionsRow}`}>
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
            <AdminTableIconButton
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
              <EditIcon />
            </AdminTableIconButton>
            <AdminTableIconButton
              aria-label="Копировать расчёт"
              title="Создать обычную копию расчёта (отдельный расчёт без связи при разделении сметы)"
              disabled={saving}
              onClick={() =>
                router.push(
                  `/admin/contract-documents/estimates/workspace?copyFrom=${encodeURIComponent(it.id)}`
                )
              }
            >
              <CopyIcon />
            </AdminTableIconButton>
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
            <AdminTableIconButton
              aria-label={
                hasLockedUsage
                  ? 'В корзину недоступно: договор подписан или Д/с подписано'
                  : 'В корзину'
              }
              title={
                hasLockedUsage
                  ? 'В корзину недоступно: договор подписан или Д/с подписано'
                  : 'В корзину (восстановить можно из корзины)'
              }
              disabled={saving || hasLockedUsage}
              onClick={() => {
                if (hasLockedUsage) return;
                setTrashConfirmModal({
                  estimateId: it.id,
                  title: it.title.trim() || 'Расчёт',
                  inSplitBundle: Boolean(it.splitBundleId),
                  detachedUsages: usages.length > 0 ? [...usages] : [],
                });
              }}
            >
              <DeleteIcon />
            </AdminTableIconButton>
          </div>
        </td>
      </tr>
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
      className={`${styles.page} ${styles.pageWide} ${styles.repairContractsListPage} ${styles.estimatesPage}${archiveView ? ` ${styles.estimatesPageInArchive}` : ''}`}
    >
      <div className={styles.editorHeader}>
        <div>
          {archiveView ? (
            <button
              type="button"
              className={styles.backLink}
              onClick={() => navigateArchiveView(false)}
            >
              ← К основному списку расчётов
            </button>
          ) : null}
          <div className={styles.repairContractsListHeaderLeft}>
            <h1 className={styles.title}>{archiveView ? 'Архив расчётов' : 'Расчёты'}</h1>
            <span className={styles.repairContractsListCount}>
              {visibleItems.length} расч.
              {listViewMode === 'by_object' && addressGroupCount > 0
                ? ` · ${addressGroupCount} объектов`
                : ''}
            </span>
          </div>
        </div>
        <div className={styles.headerButtonsRow}>
          {!archiveView ? (
            <>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesGenerateFromMeasurementBtn}`}
                disabled={saving || refreshing}
                onClick={() => void openGenerateFromMeasurementModal()}
              >
                + Новый расчёт из замера
              </button>
              <Link
                className={`${styles.primaryBtn} ${styles.estimatesCompactPrimaryLink}`}
                href="/admin/contract-documents/estimates/workspace"
                style={{ textDecoration: 'none' }}
              >
                + Новый расчёт
              </Link>
            </>
          ) : null}
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
          <AdminToolbarTrashButton
            trashCount={trashCount}
            onClick={() => setTrashOpen(true)}
            title="Корзина расчётов"
            aria-label="Корзина расчётов"
          />
          <span className={toolbarBadgeStyles.wrap}>
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn} ${styles.estimatesPageArchiveIconBtn}`}
              disabled={saving || refreshing}
              aria-label={
                archiveView
                  ? 'Вернуться к основному списку расчётов'
                  : archiveCount > 0
                    ? `Архив: ${archiveCount > 99 ? 'более 99' : archiveCount} расч. в архиве`
                    : 'Архив: объекты и расчёты, отправленные в архив'
              }
              title={
                archiveView
                  ? 'Вернуться к основному списку расчётов'
                  : archiveCount > 0
                    ? `Архив (${archiveCount > 99 ? '99+' : archiveCount})`
                    : 'Объекты с расчётами, отправленные в архив'
              }
              onClick={() => navigateArchiveView(!archiveView)}
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
            {archiveCount > 0 ? (
              <span className={toolbarBadgeStyles.badge} aria-hidden>
                {archiveCount > 99 ? '99+' : archiveCount}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.success}>{ok}</p> : null}

      <div className={styles.repairContractsListFilters}>
        <input
          type="search"
          placeholder="Поиск по названию, заказчику, адресу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading || saving}
          className={estimatesListFilterFieldClass(
            styles.repairContractsListSearchInput,
            Boolean(search.trim()),
            styles.repairContractsListFilterActive
          )}
          aria-label="Поиск по названию расчёта, заказчику, адресу"
        />
        <select
          value={listViewMode}
          onChange={(e) => setListViewMode(e.target.value as EstimatesListViewMode)}
          disabled={loading || saving}
          className={styles.repairContractsListSelect}
          aria-label="Режим списка"
        >
          <option value="by_object">По объектам</option>
          <option value="flat">Плоский список</option>
        </select>
        <select
          id="estimates_list_manager_filter"
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          disabled={loading || saving}
          className={estimatesListFilterFieldClass(
            styles.repairContractsListSelect,
            Boolean(managerFilter),
            styles.repairContractsListFilterActive
          )}
          aria-label="Менеджер"
        >
          <option value="">Все менеджеры</option>
          {managerOptions.map((p) => (
            <option key={p.crmUserId} value={p.crmUserId}>
              {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
            </option>
          ))}
        </select>
        <label className={styles.repairContractsListDateLabel}>
          <span className={styles.repairContractsListDateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={loading || saving}
            className={estimatesListFilterFieldClass(
              styles.repairContractsListDateInput,
              Boolean(dateFrom),
              styles.repairContractsListFilterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={styles.repairContractsListDateLabel}>
          <span className={styles.repairContractsListDateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={loading || saving}
            className={estimatesListFilterFieldClass(
              styles.repairContractsListDateInput,
              Boolean(dateTo),
              styles.repairContractsListFilterActive
            )}
            aria-label="Дата до"
          />
        </label>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value) as EstimatesPageLimit);
            setPage(1);
          }}
          disabled={loading || saving}
          className={styles.repairContractsListSelect}
          aria-label="Количество строк на странице"
        >
          {ESTIMATES_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>

      <div
        className={`${dataTableStyles.tableContainer} ${styles.repairContractsDirectoryTable} ${styles.estimatesDirectoryTable}${archiveView ? ` ${styles.estimatesDirectoryTableArchive}` : ''}`}
      >
        <div className={dataTableStyles.tableWrapper}>
          <div className={dataTableStyles.scrollContainer}>
            <table
              className={`${dataTableStyles.table} ${styles.repairContractsListTable} ${styles.estimatesListTable}`}
            >
              <thead className={dataTableStyles.stickyHeader}>
                <tr>
                  <th className={styles.repairContractsListSelectCol} aria-label="Группа" />
                  <th>Расчёт</th>
                  <EstimatesListSortableTh
                    column="date"
                    title="Дата"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <th>Стоимость</th>
                  <th>Привязка</th>
                  <th>Наценка, %</th>
                  <th className={styles.repairContractsListActionsCol} aria-label="Действия" />
                </tr>
              </thead>
              <tbody
                className={loading || refreshing ? dataTableStyles.tbodyRefreshing : undefined}
              >
                {visibleItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={ESTIMATES_LIST_TABLE_COL_SPAN}
                      className={dataTableStyles.emptyCell}
                    >
                      {archiveView && !hasAnythingInArchive
                        ? 'В архиве пока нет расчётов и объектов.'
                        : hasActiveListFilters
                          ? 'Нет расчётов по выбранным фильтрам.'
                          : 'Нет расчётов для текущего фильтра.'}
                    </td>
                  </tr>
                ) : totalTableRows === 0 ? (
                  <tr>
                    <td
                      colSpan={ESTIMATES_LIST_TABLE_COL_SPAN}
                      className={dataTableStyles.emptyCell}
                    >
                      Нет строк для отображения. Разверните объект или смените режим списка.
                    </td>
                  </tr>
                ) : (
                  paginatedDisplayItems.map((item) => {
                    if (item.type === 'address') {
                      return (
                        <Fragment key={`addr_${item.addressKey}`}>
                          {renderEstimateAddressGroupRow({
                            kind: 'address',
                            addressKey: item.addressKey,
                            items: item.items,
                          })}
                        </Fragment>
                      );
                    }
                    if (item.type === 'soloArchivedSection') {
                      return (
                        <tr key="_soloArchived" className={styles.estimatesListSectionRow}>
                          <td colSpan={ESTIMATES_LIST_TABLE_COL_SPAN}>
                            В архиве отдельно (объект в основном списке)
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <Fragment key={`est_${item.preset.id}`}>
                        {renderEstimateTableRow(item.preset, {
                          childOfAddress: item.childOfAddress,
                        })}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!loading && !refreshing && totalTableRows > 0 ? (
          <AdminTablePagination
            page={page}
            limit={limit}
            total={totalTableRows}
            onPageChange={setPage}
            className={styles.repairContractsListPagination}
            activePageClassName={styles.repairContractsListPaginationPageActive}
          />
        ) : null}
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

      <Modal
        isOpen={trashConfirmModal != null}
        onClose={() => {
          if (saving) return;
          setTrashConfirmModal(null);
        }}
        title="Переместить в корзину?"
        size="sm"
        showCloseButton
      >
        {trashConfirmModal ? (
          <div className={confirmModalStyles.content}>
            <p className={confirmModalStyles.message}>
              Расчёт «<strong>{trashConfirmModal.title}</strong>» будет скрыт из общего списка.
              Восстановить его можно из корзины на этой странице. {ESTIMATE_TRASH_RETENTION_NOTICE}
            </p>
            {trashConfirmModal.detachedUsages.length > 0 ? (
              <p className={confirmModalStyles.message}>
                Расчёт прикреплён к смете договора или к дополнительному соглашению. При перемещении
                в корзину привязка будет снята автоматически.
              </p>
            ) : null}
            {trashConfirmModal.inSplitBundle ? (
              <p className={confirmModalStyles.message}>
                Расчёт входит в связку разделения сметы: после перемещения в корзину остальные
                экземпляры связки останутся; их набор выбранных позиций не пересчитается
                автоматически.
              </p>
            ) : null}
            <div className={confirmModalStyles.actions}>
              <button
                type="button"
                className={confirmModalStyles.cancelButton}
                disabled={saving}
                onClick={() => setTrashConfirmModal(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
                disabled={saving}
                onClick={() => void handleConfirmTrashMove()}
              >
                {saving ? 'Подождите…' : 'В корзину'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <EstimateTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
        onRestored={() => {
          void refreshEstimates();
          void refreshTrashCount();
        }}
      />

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
                + Новый расчёт
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
