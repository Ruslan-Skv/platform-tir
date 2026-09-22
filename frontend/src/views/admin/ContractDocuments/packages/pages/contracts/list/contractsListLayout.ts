import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import type { ContractsListScope } from './contractsListFilters';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';
import {
  compareContractListRows,
  contractsListEffectiveManagerUserId,
  contractsListMatchesDateRange,
  contractsListMatchesSearch,
  contractsListPackageBelongsToUser,
  contractsListPackageDirectionIds,
  contractsListPipelineStatus,
} from './contractsListUtils';

export type ContractsListDisplayItem =
  | { type: 'object'; objectId: string; packages: ContractDocumentPackage[] }
  | {
      type: 'package';
      package: ContractDocumentPackage;
      childOfObject?: boolean;
      /** Договор без объекта в режиме by_object — отдельная карточка. */
      standaloneCard?: boolean;
    }
  /** Визуальный зазор между карточками объектов (by_object). */
  | { type: 'gap'; id: string; size?: 'default' | 'section' };

export type FilterContractsListVisibleRowsParams = {
  rows: ContractDocumentPackage[];
  searchNorm: string;
  managerFilter: string;
  statusFilters: string[];
  directionFilters: string[];
  listScope: ContractsListScope;
  currentUserId: string | null;
  myDirectionIds: string[];
  dateFrom: string;
  dateTo: string;
  directions: CrmDirection[];
  presetById: Map<string, ContractEstimatePreset>;
  measurementsById: Map<string, Measurement>;
  listSortBy: ContractsListSortBy;
  listSortOrder: ContractsListSortOrder;
  crmUsers: CrmUser[];
  addendumColumnCount: number;
};

export function filterContractsListVisibleRows({
  rows,
  searchNorm,
  managerFilter,
  statusFilters,
  directionFilters,
  listScope,
  currentUserId,
  myDirectionIds,
  dateFrom,
  dateTo,
  directions,
  presetById,
  measurementsById,
  listSortBy,
  listSortOrder,
  crmUsers,
  addendumColumnCount,
}: FilterContractsListVisibleRowsParams): ContractDocumentPackage[] {
  let list = [...rows];

  if (searchNorm) {
    list = list.filter((r) => contractsListMatchesSearch(r, searchNorm));
  }

  if (listScope === 'mine' && currentUserId) {
    list = list.filter((r) => contractsListPackageBelongsToUser(r, currentUserId));
  } else if (managerFilter) {
    list = list.filter((r) => contractsListEffectiveManagerUserId(r) === managerFilter);
  }

  if (listScope === 'my_directions') {
    if (myDirectionIds.length === 0) {
      list = [];
    } else {
      list = list.filter((r) => {
        const ids = contractsListPackageDirectionIds(r, directions, presetById, measurementsById);
        return ids.some((id) => myDirectionIds.includes(id));
      });
    }
  }

  if (statusFilters.length > 0) {
    const statusSet = new Set(statusFilters);
    list = list.filter((r) => statusSet.has(contractsListPipelineStatus(r)));
  }

  if (directionFilters.length > 0) {
    const dirSet = new Set(directionFilters);
    list = list.filter((r) =>
      contractsListPackageDirectionIds(r, directions, presetById, measurementsById).some((id) =>
        dirSet.has(id)
      )
    );
  }

  if (dateFrom || dateTo) {
    list = list.filter((r) => contractsListMatchesDateRange(r, dateFrom, dateTo));
  }

  list.sort((a, b) => {
    const cmp = compareContractListRows(
      a,
      b,
      listSortBy,
      listSortOrder,
      crmUsers,
      addendumColumnCount
    );
    if (cmp !== 0) return cmp;
    return listSortOrder === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  return list;
}

export type BuildContractsListTableDisplayItemsParams = {
  listViewMode: 'flat' | 'by_object';
  visibleRows: ContractDocumentPackage[];
  expandedObjectIds: string[];
  listSortOrder: ContractsListSortOrder;
};

export function buildContractsListTableDisplayItems({
  listViewMode,
  visibleRows,
  expandedObjectIds,
  listSortOrder,
}: BuildContractsListTableDisplayItemsParams): ContractsListDisplayItem[] {
  if (listViewMode === 'flat') {
    return visibleRows.map((pkg) => ({ type: 'package', package: pkg }));
  }

  const byObject = new Map<string, ContractDocumentPackage[]>();
  for (const pkg of visibleRows) {
    const oid = pkg.documentObjectId?.trim();
    if (!oid) continue;
    const arr = byObject.get(oid) ?? [];
    arr.push(pkg);
    byObject.set(oid, arr);
  }

  // Объекты и одиночные договоры идут одним списком в порядке серверной
  // сортировки строк: объект встаёт на месте самого нового своего договора,
  // а не отдельным блоком по имени. Строки приходят отсортированными,
  // поэтому «самый новый» — первое вхождение группы при desc и последнее при asc.
  const anchorIndex = new Map<string, number>();
  visibleRows.forEach((pkg, index) => {
    const oid = pkg.documentObjectId?.trim();
    if (!oid) return;
    if (listSortOrder === 'asc') {
      anchorIndex.set(oid, index);
    } else {
      anchorIndex.set(oid, anchorIndex.get(oid) ?? index);
    }
  });

  const items: ContractsListDisplayItem[] = [];
  const expandedSet = new Set(expandedObjectIds);
  visibleRows.forEach((pkg, index) => {
    const oid = pkg.documentObjectId?.trim();
    if (!oid) {
      if (items.length > 0) {
        items.push({ type: 'gap', id: `gap-before-pkg-${pkg.id}` });
      }
      items.push({ type: 'package', package: pkg, standaloneCard: true });
      return;
    }
    if (anchorIndex.get(oid) !== index) return;
    const pkgs = byObject.get(oid) ?? [pkg];
    if (items.length > 0) {
      items.push({ type: 'gap', id: `gap-before-${oid}` });
    }
    items.push({ type: 'object', objectId: oid, packages: pkgs });
    if (expandedSet.has(oid)) {
      for (const child of pkgs) {
        items.push({ type: 'package', package: child, childOfObject: true });
      }
    }
  });
  return items;
}

export function countContractsListObjectGroups(
  tableDisplayItems: ContractsListDisplayItem[],
  listViewMode: 'flat' | 'by_object'
): number {
  if (listViewMode === 'flat') return 0;
  return tableDisplayItems.filter((i) => i.type === 'object').length;
}

export function paginateContractsListDisplayItems<T>(items: T[], page: number, limit: number): T[] {
  return items.slice((page - 1) * limit, page * limit);
}
