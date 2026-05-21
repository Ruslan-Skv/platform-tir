import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

import { listPresetsInSplitBundle, resolveSplitBundleId } from './estimateWorkScopeTree';

export function generateSplitBundleId(): string {
  return `split_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type LinkedCopySplitTarget =
  | { mode: 'same' }
  | { mode: 'new' }
  | { mode: 'join'; bundleId: string };

export type SplitBundleSummary = {
  bundleId: string;
  presets: ContractEstimatePreset[];
  label: string;
};

function presetObjectAddressKey(p: ContractEstimatePreset): string {
  return (p.objectAddress ?? '').trim();
}

function isPresetVisibleInList(p: ContractEstimatePreset): boolean {
  if (p.deletedAt) return false;
  if (p.archived) return false;
  return true;
}

/** Все связки разделения сметы по тому же адресу объекта, что у `focus`. */
export function listSplitBundlesAtObjectAddress(
  focus: ContractEstimatePreset,
  presets: ContractEstimatePreset[]
): SplitBundleSummary[] {
  const addr = presetObjectAddressKey(focus);
  if (!addr) return [];

  const bundleMap = new Map<string, ContractEstimatePreset[]>();
  for (const p of presets) {
    if (!isPresetVisibleInList(p)) continue;
    if (presetObjectAddressKey(p) !== addr) continue;
    const bundleId = resolveSplitBundleId(p, presets);
    if (!bundleId) continue;
    const arr = bundleMap.get(bundleId) ?? [];
    arr.push(p);
    bundleMap.set(bundleId, arr);
  }

  const sorted = [...bundleMap.entries()].sort((a, b) => {
    const ta = Math.max(...a[1].map((p) => Date.parse(p.updatedAt ?? p.createdAt ?? '') || 0));
    const tb = Math.max(...b[1].map((p) => Date.parse(p.updatedAt ?? p.createdAt ?? '') || 0));
    return tb - ta;
  });

  return sorted.map(([bundleId, members], index) => ({
    bundleId,
    presets: members,
    label: formatSplitBundleSummaryLabel(members, index + 1),
  }));
}

export function formatSplitBundleSummaryLabel(
  members: ContractEstimatePreset[],
  ordinal: number
): string {
  const titles = members.map((p) => p.title.trim() || 'Расчёт').slice(0, 3);
  const tail = members.length > 3 ? ` +${members.length - 3}` : '';
  return `Связка ${ordinal} (${members.length} расч.): ${titles.join(', ')}${tail}`;
}

function sortPresetsInSplitBundle(a: ContractEstimatePreset, b: ContractEstimatePreset): number {
  const ai = a.inGroupListOrder;
  const bi = b.inGroupListOrder;
  if (
    typeof ai === 'number' &&
    typeof bi === 'number' &&
    Number.isFinite(ai) &&
    Number.isFinite(bi)
  ) {
    return ai - bi;
  }
  if (typeof ai === 'number' && Number.isFinite(ai)) return -1;
  if (typeof bi === 'number' && Number.isFinite(bi)) return 1;
  const ta = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
  const tb = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
  if (ta !== tb) return ta - tb;
  return (a.title || '').localeCompare(b.title || '', 'ru');
}

/**
 * Подпись для бейджа: номер связки на объекте / порядковый номер расчёта в связке (1/1, 1/2, 2/1…).
 */
export function getSplitBundleBadgeFraction(
  preset: ContractEstimatePreset,
  presets: ContractEstimatePreset[]
): { bundleOrdinal: number; memberOrdinal: number } | null {
  const bundleId = resolveSplitBundleId(preset, presets);
  if (!bundleId) return null;
  const members = [...listPresetsInSplitBundle(preset, presets)].sort(sortPresetsInSplitBundle);
  if (members.length < 2) return null;

  const bundles = listSplitBundlesAtObjectAddress(preset, presets);
  const bundleIdx = bundles.findIndex((b) => b.bundleId === bundleId);
  const bundleOrdinal = bundleIdx >= 0 ? bundleIdx + 1 : 1;

  const memberIdx = members.findIndex((p) => p.id === preset.id);
  if (memberIdx < 0) return null;

  return { bundleOrdinal, memberOrdinal: memberIdx + 1 };
}

export function resolveLinkedCopySplitBundleId(
  source: ContractEstimatePreset,
  target: LinkedCopySplitTarget,
  presets: ContractEstimatePreset[]
): string {
  if (target.mode === 'join') {
    return target.bundleId.trim();
  }
  if (target.mode === 'new') {
    return generateSplitBundleId();
  }
  return resolveSplitBundleId(source, presets) ?? source.id;
}

/** При «новой связке» с якорного расчёта без связки — проставить ему тот же `splitBundleId`. */
export function shouldAnchorSourceOnNewLinkedBundle(
  source: ContractEstimatePreset,
  target: LinkedCopySplitTarget,
  presets: ContractEstimatePreset[]
): boolean {
  return target.mode === 'new' && !resolveSplitBundleId(source, presets);
}

export function listJoinableSplitBundlesAtObject(
  focus: ContractEstimatePreset,
  presets: ContractEstimatePreset[]
): SplitBundleSummary[] {
  const ownBundle = resolveSplitBundleId(focus, presets);
  return listSplitBundlesAtObjectAddress(focus, presets).filter((b) => b.bundleId !== ownBundle);
}

function hasSplittableEstimateSnapshot(p: ContractEstimatePreset): boolean {
  const rooms = p.snapshot?.rooms;
  if (!rooms?.length) return false;
  return rooms.some((r) => (r.lines?.length ?? 0) > 0);
}

function isPresetEligibleForSameBundleLinkedCopy(
  p: ContractEstimatePreset,
  allPresets: ContractEstimatePreset[]
): boolean {
  if (!hasSplittableEstimateSnapshot(p)) return false;
  const peers = listPresetsInSplitBundle(p, allPresets).filter((x) => x.id !== p.id);
  if (peers.length === 0) return true;
  return (
    Boolean(p.splitBundleId) ||
    (Array.isArray(p.estimateWorkScopeKeys) && p.estimateWorkScopeKeys.length > 0)
  );
}

export function getLinkedCopyDisabledReason(
  preset: ContractEstimatePreset,
  allPresets: ContractEstimatePreset[],
  target: LinkedCopySplitTarget,
  options: { archiveView: boolean; hasLockedUsage: boolean }
): string | null {
  if (options.archiveView) return 'Недоступно в режиме архива.';
  if (options.hasLockedUsage) {
    return 'Расчёт заблокирован: договор подписан или Д/с подписано.';
  }
  if (!presetObjectAddressKey(preset)) {
    return 'Укажите адрес объекта в карточке расчёта.';
  }

  if (target.mode === 'same') {
    if (!isPresetEligibleForSameBundleLinkedCopy(preset, allPresets)) {
      const peers = listPresetsInSplitBundle(preset, allPresets).filter((x) => x.id !== preset.id);
      if (peers.length > 0) {
        return 'Сначала сохраните состав позиций в модалке «Разделение сметы».';
      }
      return 'Сначала сохраните расчёт со сметой (нужны позиции для разделения).';
    }
    return null;
  }

  if (target.mode === 'join') {
    if (!hasSplittableEstimateSnapshot(preset)) {
      return 'Сначала сохраните расчёт со сметой (нужны позиции для разделения).';
    }
    const bundleId = target.bundleId.trim();
    if (!bundleId) return 'Выберите связку на этом объекте.';
    const found = listSplitBundlesAtObjectAddress(preset, allPresets).some(
      (b) => b.bundleId === bundleId
    );
    if (!found) return 'Выбранная связка недоступна на этом объекте.';
    return null;
  }

  if (!hasSplittableEstimateSnapshot(preset)) {
    return 'Сначала сохраните расчёт со сметой (нужны позиции для разделения).';
  }
  return null;
}
