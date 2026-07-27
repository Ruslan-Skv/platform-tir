import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatesListViewMode } from './estimatesListFilters';
import type { EstimatesListSortBy, EstimatesListSortOrder } from './estimatesListSort';
import {
  ESTIMATES_NO_ADDRESS_KEY,
  estimateObjectAddressKey,
  sortEstimatesForList,
} from './estimatesListUtils';

export type EstimateLayoutBlock =
  | { kind: 'address'; addressKey: string; items: ContractEstimatePreset[] }
  | { kind: 'flatRun'; items: ContractEstimatePreset[] }
  | { kind: 'soloArchived'; items: ContractEstimatePreset[] };

export type EstimatesTableDisplayItem =
  | { type: 'address'; addressKey: string; items: ContractEstimatePreset[] }
  | {
      type: 'estimate';
      preset: ContractEstimatePreset;
      childOfAddress?: boolean;
      /** Расчёт вне объекта — отдельная карточка. */
      standaloneCard?: boolean;
    }
  | { type: 'soloArchivedSection' }
  | { type: 'gap'; id: string };

export type BuildEstimateLayoutBlocksParams = {
  visibleItems: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  archiveView: boolean;
  listViewMode: EstimatesListViewMode;
  listSortBy: EstimatesListSortBy;
  listSortOrder: EstimatesListSortOrder;
};

export function countEstimatesAddressGroups(
  visibleItems: ContractEstimatePreset[],
  listViewMode: EstimatesListViewMode
): number {
  if (listViewMode === 'flat') return 0;
  const keys = new Set(visibleItems.map((it) => estimateObjectAddressKey(it)));
  return keys.size;
}

export function buildEstimateLayoutBlocks({
  visibleItems,
  groups,
  archiveView,
  listViewMode,
  listSortBy,
  listSortOrder,
}: BuildEstimateLayoutBlocksParams): EstimateLayoutBlock[] {
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
}

export function buildEstimatesTableDisplayItems(
  blocks: EstimateLayoutBlock[],
  effectiveExpandedAddressKey: string | null
): EstimatesTableDisplayItem[] {
  const out: EstimatesTableDisplayItem[] = [];
  let needsGapBeforeNextCard = false;

  const pushGap = (id: string) => {
    out.push({ type: 'gap', id });
  };

  for (const block of blocks) {
    if (block.kind === 'flatRun') {
      for (const preset of block.items) {
        if (needsGapBeforeNextCard) pushGap(`gap-before-${preset.id}`);
        out.push({ type: 'estimate', preset, standaloneCard: true });
        needsGapBeforeNextCard = true;
      }
    } else if (block.kind === 'address') {
      if (needsGapBeforeNextCard) pushGap(`gap-before-addr-${block.addressKey}`);
      out.push({
        type: 'address',
        addressKey: block.addressKey,
        items: block.items,
      });
      needsGapBeforeNextCard = true;
      if (effectiveExpandedAddressKey === block.addressKey) {
        for (const preset of block.items) {
          out.push({ type: 'estimate', preset, childOfAddress: true });
        }
      }
    } else if (block.kind === 'soloArchived') {
      if (needsGapBeforeNextCard) pushGap('gap-before-solo-archived');
      out.push({ type: 'soloArchivedSection' });
      needsGapBeforeNextCard = false;
      for (const preset of block.items) {
        if (needsGapBeforeNextCard) pushGap(`gap-before-${preset.id}`);
        out.push({ type: 'estimate', preset, standaloneCard: true });
        needsGapBeforeNextCard = true;
      }
    }
  }
  return out;
}

export function isExpandedAddressKeyVisibleInLayout(
  blocks: EstimateLayoutBlock[],
  expandedAddressKey: string
): boolean {
  return blocks.some((b) => b.kind === 'address' && b.addressKey === expandedAddressKey);
}

export function paginateEstimatesTableDisplayItems<T>(
  items: T[],
  page: number,
  limit: number
): T[] {
  return items.slice((page - 1) * limit, page * limit);
}
