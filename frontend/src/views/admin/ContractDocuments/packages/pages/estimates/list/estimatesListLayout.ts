import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatesListViewMode } from './estimatesListFilters';
import type { EstimatesListSortBy, EstimatesListSortOrder } from './estimatesListSort';
import {
  ESTIMATES_NO_ADDRESS_KEY,
  type EstimatePackageUsage,
  estimateGroupSortTs,
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
  /** Привязки расчётов к договорам — для сортировки «по привязке». */
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
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
  usageByEstimateId,
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
        items: sortEstimatesForList(flatItems, listSortBy, listSortOrder, usageByEstimateId),
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

    // Сортировка объектов: по дате — по последнему изменению самого объекта
    // (самый свежий из его расчётов); иначе (и как tie-break) — по адресу.
    const compareAddressKeys = (a: string, b: string): number => {
      if (a === ESTIMATES_NO_ADDRESS_KEY) return 1;
      if (b === ESTIMATES_NO_ADDRESS_KEY) return -1;
      if (listSortBy === 'date') {
        const cmp =
          estimateGroupSortTs(byAddress.get(a) ?? []) - estimateGroupSortTs(byAddress.get(b) ?? []);
        if (cmp !== 0) return listSortOrder === 'asc' ? cmp : -cmp;
      }
      return a.localeCompare(b, 'ru');
    };
    const addressKeys = [...byAddress.keys()].sort(compareAddressKeys);

    for (const addressKey of addressKeys) {
      blocks.push({
        kind: 'address',
        addressKey,
        items: sortEstimatesForList(
          byAddress.get(addressKey) ?? [],
          listSortBy,
          listSortOrder,
          usageByEstimateId
        ),
      });
    }
  }

  if (soloArchivedIds.size > 0) {
    const soloArchived = visibleItems.filter((it) => soloArchivedIds.has(it.id));
    blocks.push({
      kind: 'soloArchived',
      items: sortEstimatesForList(soloArchived, listSortBy, listSortOrder, usageByEstimateId),
    });
  }

  return blocks;
}

export function buildEstimatesTableDisplayItems(
  blocks: EstimateLayoutBlock[],
  effectiveExpandedAddressKeys: string[]
): EstimatesTableDisplayItem[] {
  const expandedKeys = new Set(effectiveExpandedAddressKeys);
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
      if (expandedKeys.has(block.addressKey)) {
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

/**
 * Страница списка с сохранением gap-разделителей между карточками: лимит страницы
 * считается по строкам без gap (счётчик «Всего» и пагинация не меняются), gap попадает
 * в выдачу, только если следом на этой же странице есть строка — визуальный отступ
 * перед карточкой. Хвостовые gap страницы отбрасываются.
 */
export function paginateEstimatesTableDisplayItems<T extends { type: string }>(
  items: T[],
  page: number,
  limit: number
): T[] {
  const from = (page - 1) * limit;
  const to = page * limit;
  const out: T[] = [];
  let pendingGaps: T[] = [];
  let rowIndex = 0;
  for (const item of items) {
    if (item.type === 'gap') {
      if (out.length > 0) pendingGaps.push(item);
      continue;
    }
    if (rowIndex >= to) break;
    if (rowIndex >= from) {
      out.push(...pendingGaps, item);
    }
    pendingGaps = [];
    rowIndex++;
  }
  return out;
}
