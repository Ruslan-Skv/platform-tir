import type {
  ContractDocumentPackageStatus,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  buildEstimateWorkScopeTree,
  collectAllLineScopeIds,
  resolveSplitBundleId,
} from '../../../platform/estimates/estimateWorkScopeTree';
import { mergePackageFormData } from '../../../platform/form/packageForm';
import type { EstimatesListSortBy, EstimatesListSortOrder } from './estimatesListSort';

export type EstimatePackageUsage =
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

export const ESTIMATES_LIST_TABLE_COL_SPAN = 7;
export const ESTIMATES_NO_ADDRESS_KEY = '__no_object_address__';

export function isUsageLocked(u: EstimatePackageUsage): boolean {
  if (u.kind === 'contract') {
    return u.packageStatus === 'CONTRACT_CONCLUDED';
  }
  return u.addendumStatus === 'SIGNED';
}

export function formatEstimatePackageUsageLabel(u: EstimatePackageUsage): string {
  if (u.kind === 'contract') {
    return `Договор № ${u.contractNumber} от ${u.contractDate}`;
  }
  const d = u.addendumDate.trim();
  const datePart = d ? `${d} г.` : '—';
  return `Д/с №${u.addendumOrdinal} от ${datePart} к договору № ${u.contractNumber} от ${u.contractDate}`;
}

export function sortEstimateGroupsByTitle(gs: ContractEstimateGroup[]) {
  return [...gs].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
}

export function estimatesListFilterFieldClass(
  base: string,
  active: boolean,
  activeClass: string
): string {
  return active ? `${base} ${activeClass}` : base;
}

export function normalizeEstimatesListSearch(raw: string): string {
  return raw.trim().toLowerCase();
}

export function estimateMatchesSearch(preset: ContractEstimatePreset, searchNorm: string): boolean {
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

export function estimateMatchesDateRange(
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

export function packageManagerCrmUserIdFromForm(formData: Record<string, unknown>): string {
  const form = mergePackageFormData(formData);
  return form.executor.signatoryCrmUserId?.trim() ?? '';
}

export function estimateMatchesManagerFilter(
  presetId: string,
  managerFilter: string,
  managerIdsByPresetId: Map<string, Set<string>>
): boolean {
  if (!managerFilter) return true;
  const ids = managerIdsByPresetId.get(presetId);
  return Boolean(ids?.has(managerFilter));
}

/** Расчёт «мой»: автор пресета или менеджер привязанного договора. */
export function estimateBelongsToUser(
  preset: ContractEstimatePreset,
  userId: string,
  managerIdsByPresetId: Map<string, Set<string>>
): boolean {
  if (!userId) return false;
  if (preset.createdById?.trim() === userId) return true;
  const ids = managerIdsByPresetId.get(preset.id);
  return Boolean(ids?.has(userId));
}

export function parseOptionalPercentInput(raw: string): number | undefined {
  const t = raw.trim().replace(',', '.');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export function formatEstimatePresetTotalRub(total: number): string {
  return `${total.toFixed(2).replace('.', ',')} руб.`;
}

export function formatEstimateListTableCost(total: number): string {
  return total.toFixed(2).replace('.', ',');
}

/** Объединение ключей строк сметы (`wsl:…`) по всем расчётам связки. */
export function mergeSplitBundleWorkScopeLineKeys(
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
      const tree = buildEstimateWorkScopeTree(p, groups);
      for (const id of collectAllLineScopeIds(tree)) union.add(id);
    }
  }
  return union;
}

/** Не менее двух расчётов в связке и вместе они покрывают все строки дерева состава для `cardPreset`. */
export function splitBundleCoversAllWorkScopeLines(
  cardPreset: ContractEstimatePreset,
  bundlePresets: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): boolean {
  if (!resolveSplitBundleId(cardPreset, bundlePresets) || bundlePresets.length < 2) {
    return false;
  }
  const tree = buildEstimateWorkScopeTree(cardPreset, groups);
  const allIds = collectAllLineScopeIds(tree);
  if (allIds.length === 0) return false;
  const union = mergeSplitBundleWorkScopeLineKeys(bundlePresets, groups);
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

export function comparePresetsForListSort(
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

export function estimateObjectAddressKey(p: ContractEstimatePreset): string {
  const addr = (p.objectAddress ?? '').trim();
  return addr || ESTIMATES_NO_ADDRESS_KEY;
}

export function estimateObjectAddressDisplayLabel(addressKey: string): string {
  return addressKey === ESTIMATES_NO_ADDRESS_KEY ? 'Без адреса объекта' : addressKey;
}

export function sortEstimatesForList(
  list: ContractEstimatePreset[],
  sortBy: EstimatesListSortBy,
  sortOrder: EstimatesListSortOrder
): ContractEstimatePreset[] {
  return [...list].sort((a, b) => comparePresetsForListSort(a, b, sortBy, sortOrder));
}

/** Убирает ссылку на несуществующую группу (после удаления объекта и т.п.). */
export function stripOrphanGroupIds(
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
