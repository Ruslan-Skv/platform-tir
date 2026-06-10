import type { ContractDocumentObject } from '@/shared/api/admin-contract-document-objects';
import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import { mergePackageFormData } from '../../../platform/form/packageForm';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';
import {
  compareContractListRows,
  compareContractsListStrings,
  contractsListManagerCrmUserId,
  contractsListMatchesDateRange,
  contractsListMatchesSearch,
  contractsListPackageDirectionIds,
  contractsListPipelineStatus,
} from './contractsListUtils';

export type ContractsListDisplayItem =
  | { type: 'object'; objectId: string; packages: ContractDocumentPackage[] }
  | { type: 'package'; package: ContractDocumentPackage; childOfObject?: boolean };

export type FilterContractsListVisibleRowsParams = {
  rows: ContractDocumentPackage[];
  searchNorm: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
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
  statusFilter,
  directionFilter,
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

  if (managerFilter) {
    list = list.filter((r) => {
      const form = mergePackageFormData(r.formData ?? {});
      return contractsListManagerCrmUserId(form) === managerFilter;
    });
  }

  if (statusFilter) {
    list = list.filter((r) => contractsListPipelineStatus(r) === statusFilter);
  }

  if (directionFilter) {
    list = list.filter((r) =>
      contractsListPackageDirectionIds(r, directions, presetById, measurementsById).includes(
        directionFilter
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
    const pkgs = byObject.get(oid) ?? [];
    items.push({ type: 'object', objectId: oid, packages: pkgs });
    if (expandedObjectId === oid) {
      for (const pkg of pkgs) {
        items.push({ type: 'package', package: pkg, childOfObject: true });
      }
    }
  }
  for (const pkg of ungrouped) {
    items.push({ type: 'package', package: pkg });
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
