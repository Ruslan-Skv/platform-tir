import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import type { ContractsListScope } from './contractsListFilters';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';
import {
  compareContractListRows,
  compareContractsListStrings,
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
  documentObjects: ContractDocumentObject[];
  objectsById: Map<string, ContractDocumentObject>;
  expandedObjectId: string | null;
  listSortOrder: ContractsListSortOrder;
};

export function buildContractsListTableDisplayItems({
  listViewMode,
  visibleRows,
  documentObjects,
  objectsById,
  expandedObjectId,
  listSortOrder,
}: BuildContractsListTableDisplayItemsParams): ContractsListDisplayItem[] {
  if (listViewMode === 'flat') {
    return visibleRows.map((pkg) => ({ type: 'package', package: pkg }));
  }

  const byObject = new Map<string, ContractDocumentPackage[]>();
  const ungrouped: ContractDocumentPackage[] = [];
  for (const pkg of visibleRows) {
    const oid = pkg.documentObjectId?.trim();
    if (oid) {
      const arr = byObject.get(oid) ?? [];
      arr.push(pkg);
      byObject.set(oid, arr);
    } else {
      ungrouped.push(pkg);
    }
  }

  const objectIds = [...new Set([...documentObjects.map((o) => o.id), ...byObject.keys()])].filter(
    (id) => (byObject.get(id)?.length ?? 0) > 0
  );

  objectIds.sort((a, b) => {
    const na = objectsById.get(a)?.name ?? byObject.get(a)?.[0]?.documentObject?.name ?? a;
    const nb = objectsById.get(b)?.name ?? byObject.get(b)?.[0]?.documentObject?.name ?? b;
    return compareContractsListStrings(String(na), String(nb), listSortOrder);
  });

  const items: ContractsListDisplayItem[] = [];
  for (const oid of objectIds) {
    if (items.length > 0) {
      items.push({ type: 'gap', id: `gap-before-${oid}` });
    }
    const pkgs = byObject.get(oid) ?? [];
    items.push({ type: 'object', objectId: oid, packages: pkgs });
    if (expandedObjectId === oid) {
      for (const pkg of pkgs) {
        items.push({ type: 'package', package: pkg, childOfObject: true });
      }
    }
  }
  if (ungrouped.length > 0 && items.length > 0) {
    items.push({ type: 'gap', id: 'gap-before-ungrouped' });
  }
  for (let i = 0; i < ungrouped.length; i++) {
    const pkg = ungrouped[i]!;
    if (i > 0) {
      items.push({ type: 'gap', id: `gap-before-pkg-${pkg.id}` });
    }
    items.push({ type: 'package', package: pkg, standaloneCard: true });
  }
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
