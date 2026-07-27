import type {
  ContractDocumentPackage,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import {
  getDisplayContractDate,
  getDisplayContractNumber,
} from '../../../platform/form/packageContractDisplay';
import {
  type EstimatePackageUsage,
  isUsageLocked,
  packageManagerCrmUserIdFromForm,
} from './estimatesListUtils';

export type EstimatesListWorkspacePackage = {
  id: string;
  title: string | null;
  status: ContractDocumentPackageStatus;
  formData: Record<string, unknown>;
  createdById: string | null;
  responsibleManagerId: string | null;
  crmContract: { contractNumber: string; contractDate: string } | null;
};

export function mapPackagesForEstimatesList(
  packages: ContractDocumentPackage[] | null | undefined
): EstimatesListWorkspacePackage[] {
  return (packages ?? []).map((p) => ({
    id: p.id,
    title: p.title ?? null,
    status:
      p.status === 'CONTRACT_CONCLUDED'
        ? 'CONTRACT_CONCLUDED'
        : p.status === 'REFUSED'
          ? 'REFUSED'
          : 'IN_PROGRESS',
    formData: (p.formData ?? {}) as Record<string, unknown>,
    createdById: p.createdById?.trim() || null,
    responsibleManagerId: p.responsibleManagerId?.trim() || null,
    crmContract: p.crmContract
      ? {
          contractNumber: p.crmContract.contractNumber,
          contractDate: p.crmContract.contractDate,
        }
      : null,
  }));
}

export function buildUsageByEstimateId(
  workspacePackages: EstimatesListWorkspacePackage[]
): Map<string, EstimatePackageUsage[]> {
  const map = new Map<string, EstimatePackageUsage[]>();
  const pushUsage = (presetId: string, usage: EstimatePackageUsage) => {
    map.set(presetId, [...(map.get(presetId) ?? []), usage]);
  };

  for (const pkg of workspacePackages) {
    const baseMeta = {
      packageId: pkg.id,
      packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
    };
    const contractNumber = getDisplayContractNumber(pkg);
    const contractDate = getDisplayContractDate(pkg);

    const estimateRaw = (pkg.formData?.estimate ?? null) as Record<string, unknown> | null;
    const contractIds: string[] = [];
    if (estimateRaw && typeof estimateRaw.selectedPresetId === 'string') {
      const legacy = estimateRaw.selectedPresetId.trim();
      if (legacy) contractIds.push(legacy);
    }
    if (estimateRaw && Array.isArray(estimateRaw.selectedPresetIds)) {
      for (const id of estimateRaw.selectedPresetIds) {
        if (typeof id === 'string' && id.trim()) contractIds.push(id.trim());
      }
    }
    const contractUnique = [...new Set(contractIds)];
    if (contractUnique.length > 0) {
      const contractRow: EstimatePackageUsage = {
        ...baseMeta,
        kind: 'contract',
        packageStatus: pkg.status,
        contractNumber,
        contractDate,
      };
      for (const presetId of contractUnique) {
        pushUsage(presetId, contractRow);
      }
    }

    const addendumDatesRaw = pkg.formData?.addendumDocumentDates;
    const addendumDates: [string, string, string, string, string] = ['', '', '', '', ''];
    if (Array.isArray(addendumDatesRaw)) {
      for (let i = 0; i < 5; i++) {
        const d = addendumDatesRaw[i];
        addendumDates[i] = typeof d === 'string' ? d.trim() : '';
      }
    }

    const addendumSlotsRaw = pkg.formData?.addendumSlots;
    if (Array.isArray(addendumSlotsRaw)) {
      addendumSlotsRaw.forEach((slot, slotIndex0) => {
        if (slotIndex0 > 4) return;
        if (!slot || typeof slot !== 'object') return;
        const s = slot as Record<string, unknown>;
        const slotIds: string[] = [];
        const collect = (value: unknown) => {
          if (!Array.isArray(value)) return;
          for (const id of value) {
            if (typeof id === 'string' && id.trim()) slotIds.push(id.trim());
          }
        };
        collect(s.selectedPresetIds);
        collect(s.excludedSelectedPresetIds);
        const uniqueSlotIds = [...new Set(slotIds)];
        if (uniqueSlotIds.length === 0) return;
        const addendumRow: EstimatePackageUsage = {
          ...baseMeta,
          kind: 'addendum',
          addendumOrdinal: slotIndex0 + 1,
          addendumStatus: s.status === 'SIGNED' ? 'SIGNED' : 'OPEN',
          addendumDate: addendumDates[slotIndex0] ?? '',
          contractNumber,
          contractDate,
        };
        for (const presetId of uniqueSlotIds) {
          pushUsage(presetId, addendumRow);
        }
      });
    }
  }
  return map;
}

export function buildPackageManagerById(
  workspacePackages: EstimatesListWorkspacePackage[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const pkg of workspacePackages) {
    const fromResponsible = pkg.responsibleManagerId?.trim() ?? '';
    const fromSignatory = packageManagerCrmUserIdFromForm(pkg.formData);
    const fromCreator = pkg.createdById?.trim() ?? '';
    const managerId = fromResponsible || fromSignatory || fromCreator;
    map.set(pkg.id, managerId);
  }
  return map;
}

export function buildManagerIdsByPresetId(
  usageByEstimateId: Map<string, EstimatePackageUsage[]>,
  packageManagerById: Map<string, string>
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [presetId, usages] of usageByEstimateId) {
    const ids = new Set<string>();
    for (const usage of usages) {
      const managerId = packageManagerById.get(usage.packageId) ?? '';
      if (managerId) ids.add(managerId);
    }
    if (ids.size > 0) map.set(presetId, ids);
  }
  return map;
}

export function buildGroupIdsWithLockedEstimate(
  items: Array<{ id: string; groupId?: string }>,
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): Set<string> {
  const ids = new Set<string>();
  for (const it of items) {
    if (!it.groupId) continue;
    const usages = usageByEstimateId.get(it.id) ?? [];
    if (usages.some((u) => isUsageLocked(u))) ids.add(it.groupId);
  }
  return ids;
}
