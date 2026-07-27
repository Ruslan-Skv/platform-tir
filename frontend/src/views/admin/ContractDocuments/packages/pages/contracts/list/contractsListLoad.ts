import {
  type ContractDocumentObject,
  autoSyncContractDocumentObjects,
  getContractDocumentObjects,
} from '@/shared/api/admin-contract-document-objects';
import {
  type ContractDocumentPackage,
  type ContractDocumentPackageKind,
  type ContractDocumentPackagesListCounts,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentPackagesPage,
  getContractDocumentSignatoryProfiles,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
} from '@/shared/api/admin-crm';

import type { ContractsListScope, ContractsListViewMode } from './contractsListFilters';
import { mapPipelineStatusesToPackageDbStatuses } from './contractsListScope';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';

export type ContractsListLoadResult = {
  rows: ContractDocumentPackage[];
  total: number;
  page: number;
  limit: number;
  counts: ContractDocumentPackagesListCounts | null;
  documentObjects: ContractDocumentObject[];
  crmUsers: CrmUser[];
  directions: CrmDirection[];
  managerOptions: ContractSignatoryProfile[];
  estimatePresets: ContractEstimatePreset[];
  measurementsById: Map<string, Measurement>;
};

function mapDirectionIdsToKinds(
  directionIds: string[],
  directions: CrmDirection[]
): ContractDocumentPackageKind[] {
  const kinds = new Set<ContractDocumentPackageKind>();
  for (const directionId of directionIds) {
    const slug = directions.find((d) => d.id === directionId)?.slug;
    if (slug === 'repair') kinds.add('REPAIR');
    if (slug === 'windows') kinds.add('WINDOWS');
    if (slug === 'doors') kinds.add('DOORS');
    if (slug === 'stretch-ceilings') kinds.add('CEILINGS');
    if (slug === 'blinds') kinds.add('BLINDS');
    if (slug === 'furniture') kinds.add('FURNITURE');
  }
  return [...kinds];
}

export async function loadContractsListData(params?: {
  listScope?: ContractsListScope;
  currentUserId?: string | null;
  preloadDirectionIds?: string[];
  selectedDirectionIds?: string[];
  statusFilters?: string[];
  search?: string;
  managerFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: ContractsListSortBy;
  sortOrder?: ContractsListSortOrder;
  page?: number;
  limit?: number;
  listViewMode?: ContractsListViewMode;
}): Promise<ContractsListLoadResult> {
  try {
    await autoSyncContractDocumentObjects();
  } catch {
    /* группировка по адресу не должна блокировать список */
  }
  const [objects, users, dirs, signatories, presetsRes, measurementsRes] = await Promise.all([
    getContractDocumentObjects().catch(() => [] as ContractDocumentObject[]),
    getCrmUsers().catch(() => [] as CrmUser[]),
    getCrmDirections().catch(() => [] as CrmDirection[]),
    getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
      items: [] as ContractSignatoryProfile[],
      updatedAt: null,
    })),
    getContractDocumentEstimatePresets('REPAIR').catch(() => ({
      items: [] as ContractEstimatePreset[],
      groups: [],
      updatedAt: null,
    })),
    getMeasurements({ page: 1, limit: 500 }).catch(() => ({
      data: [] as Measurement[],
      total: 0,
      page: 1,
      limit: 500,
      totalPages: 0,
    })),
  ]);

  const selectedDirectionIds = params?.selectedDirectionIds ?? [];
  const myScopeDirectionIds = params?.preloadDirectionIds ?? [];
  const kindsSourceIds =
    params?.listScope === 'my_directions'
      ? [...myScopeDirectionIds, ...selectedDirectionIds]
      : [...selectedDirectionIds];
  const preloadKinds = mapDirectionIdsToKinds(kindsSourceIds, dirs);
  const dbStatuses = mapPipelineStatusesToPackageDbStatuses(params?.statusFilters ?? []);
  const pipelineStatuses = (params?.statusFilters ?? []).filter(
    (s): s is 'IN_PROJECT' | 'SIGNED' | 'WORK_IN_PROGRESS' | 'CLOSED' | 'REFUSED' =>
      s === 'IN_PROJECT' ||
      s === 'SIGNED' ||
      s === 'WORK_IN_PROGRESS' ||
      s === 'CLOSED' ||
      s === 'REFUSED'
  );

  const page = Math.max(1, params?.page ?? 1);
  const limit = params?.limit ?? 20;
  const sortBy =
    params?.sortBy === 'remaining' ||
    params?.sortBy === 'workStartAct' ||
    params?.sortBy === 'closeAct'
      ? 'date'
      : (params?.sortBy ?? 'date');

  const directionIdsForExact =
    selectedDirectionIds.length > 0
      ? selectedDirectionIds
      : params?.listScope === 'my_directions'
        ? myScopeDirectionIds
        : [];

  const listRes = await getContractDocumentPackagesPage({
    responsibleManagerId: undefined,
    managerId:
      params?.listScope === 'mine' && params.currentUserId
        ? params.currentUserId
        : params?.managerFilter?.trim()
          ? params.managerFilter.trim()
          : undefined,
    kinds: preloadKinds.length > 0 ? preloadKinds : undefined,
    statuses: dbStatuses,
    pipelineStatuses: pipelineStatuses.length > 0 ? pipelineStatuses : undefined,
    directionIds: directionIdsForExact.length > 0 ? directionIdsForExact : undefined,
    search: params?.search?.trim() || undefined,
    dateFrom: params?.dateFrom?.trim() || undefined,
    dateTo: params?.dateTo?.trim() || undefined,
    sortBy,
    sortOrder: params?.sortOrder ?? 'desc',
    page,
    limit,
    includeCounts: true,
    countsUserId: params?.currentUserId ?? undefined,
    countsMyDirectionIds: myScopeDirectionIds.length > 0 ? myScopeDirectionIds : undefined,
    paginated: true,
  });

  const pageResult = Array.isArray(listRes)
    ? {
        data: listRes,
        total: listRes.length,
        page,
        limit,
        totalPages: 1,
        counts: undefined,
      }
    : listRes;

  const profiles = (signatories.items ?? [])
    .filter((p) => Boolean(p.crmUserId?.trim()))
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' }));

  return {
    rows: pageResult.data,
    total: pageResult.total,
    page: pageResult.page,
    limit: pageResult.limit,
    counts: pageResult.counts ?? null,
    documentObjects: objects,
    crmUsers: users,
    directions: dirs,
    managerOptions: profiles,
    estimatePresets: presetsRes.items ?? [],
    measurementsById: new Map(measurementsRes.data.map((m) => [m.id, m])),
  };
}
