import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

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
  | { kind: 'flatRun'; items: ContractEstimatePreset[] };

export type EstimatesTableDisplayItem =
  | { type: 'address'; addressKey: string; items: ContractEstimatePreset[] }
  | {
      type: 'estimate';
      preset: ContractEstimatePreset;
      childOfAddress?: boolean;
      /** Расчёт вне объекта — отдельная карточка. */
      standaloneCard?: boolean;
      /** Единственный расчёт объекта: карточка заменила строку объекта — показываем адрес объекта. */
      showObjectAddress?: boolean;
    }
  | { type: 'gap'; id: string };

export type BuildEstimateLayoutBlocksParams = {
  visibleItems: ContractEstimatePreset[];
  listViewMode: EstimatesListViewMode;
  listSortBy: EstimatesListSortBy;
  listSortOrder: EstimatesListSortOrder;
  /** Привязки расчётов к договорам — для сортировки «по привязке». */
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
};

/** Объект из одного расчёта не группируем — он не показывается карточкой объекта,
 *  поэтому в счётчике «объектов» учитываются только адреса с двумя и более расчётами. */
export function countEstimatesAddressGroups(
  visibleItems: ContractEstimatePreset[],
  listViewMode: EstimatesListViewMode
): number {
  if (listViewMode === 'flat') return 0;
  const countsByKey = new Map<string, number>();
  for (const it of visibleItems) {
    const key = estimateObjectAddressKey(it);
    countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);
  }
  let grouped = 0;
  for (const count of countsByKey.values()) {
    if (count > 1) grouped += 1;
  }
  return grouped;
}

export function buildEstimateLayoutBlocks({
  visibleItems,
  listViewMode,
  listSortBy,
  listSortOrder,
  usageByEstimateId,
}: BuildEstimateLayoutBlocksParams): EstimateLayoutBlock[] {
  const blocks: EstimateLayoutBlock[] = [];

  if (listViewMode === 'flat') {
    if (visibleItems.length > 0) {
      blocks.push({
        kind: 'flatRun',
        items: sortEstimatesForList(visibleItems, listSortBy, listSortOrder, usageByEstimateId),
      });
    }
    return blocks;
  }

  const byAddress = new Map<string, ContractEstimatePreset[]>();
  for (const it of visibleItems) {
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
      // Объект из одного расчёта — без карточки объекта: сразу карточка расчёта
      // (как одиночный договор в списке договоров), с адресом объекта в карточке.
      if (block.items.length === 1) {
        out.push({
          type: 'estimate',
          preset: block.items[0],
          standaloneCard: true,
          showObjectAddress: block.addressKey !== ESTIMATES_NO_ADDRESS_KEY,
        });
        needsGapBeforeNextCard = true;
        continue;
      }
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
    }
  }
  return out;
}

export function isExpandedAddressKeyVisibleInLayout(
  blocks: EstimateLayoutBlock[],
  expandedAddressKey: string
): boolean {
  // Объект из одного расчёта не разворачивается — ключ расширения считаем «невидимым»,
  // чтобы синхронизация состояния вычистила его.
  return blocks.some(
    (b) => b.kind === 'address' && b.addressKey === expandedAddressKey && b.items.length > 1
  );
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
