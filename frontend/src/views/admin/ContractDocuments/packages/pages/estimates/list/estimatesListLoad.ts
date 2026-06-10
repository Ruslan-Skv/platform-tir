import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractSignatoryProfile,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentEstimatePresets,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';

import { ensureEstimateObjectGroups } from '../../../platform/estimates/estimateObjectGroupSync';
import {
  type EstimatesListWorkspacePackage,
  mapPackagesForEstimatesList,
} from './estimatesListPackageUsage';
import { stripOrphanGroupIds } from './estimatesListUtils';

export type EstimatesListLoadResult = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  workspacePackages: EstimatesListWorkspacePackage[];
  managerOptions: ContractSignatoryProfile[];
};

export async function loadEstimatesListData(): Promise<EstimatesListLoadResult> {
  const [presetsRes, packagesRes, signatoriesRes] = await Promise.all([
    getContractDocumentEstimatePresets('REPAIR'),
    getContractDocumentPackages('REPAIR'),
    getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
      items: [] as ContractSignatoryProfile[],
    })),
  ]);
  const loadedGroups = presetsRes.groups ?? [];
  const stripped = stripOrphanGroupIds(presetsRes.items ?? [], loadedGroups);
  const synced = ensureEstimateObjectGroups(stripped, loadedGroups);
  if (synced.changed) {
    await putContractDocumentEstimatePresets({
      kind: 'REPAIR',
      items: synced.items,
      groups: synced.groups,
    });
  }
  const profiles = (signatoriesRes.items ?? [])
    .filter((p) => Boolean(p.crmUserId?.trim()))
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' }));

  return {
    items: synced.items,
    groups: synced.groups,
    workspacePackages: mapPackagesForEstimatesList(packagesRes),
    managerOptions: profiles,
  };
}
