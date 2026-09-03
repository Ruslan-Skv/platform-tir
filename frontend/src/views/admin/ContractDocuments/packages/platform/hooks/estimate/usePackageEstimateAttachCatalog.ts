'use client';

import { useEffect, useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  getContractEstimateObjectGroupKey,
  isContractEstimatePresetAttachable,
  isEstimatePresetForLinkedContractCustomer,
} from '../../estimates/applyEstimatePresetIds';
import {
  findAttachGroupKeyForPackageObjectAddress,
  normalizeAddressMatchKey,
} from '../../estimates/estimateObjectGroupSync';
import {
  getDisplayContractDate,
  getDisplayContractNumber,
} from '../../form/packageContractDisplay';
import {
  collectAddendumSlotPresetIds,
  collectEstimatePresetIdsFromPackageFormData,
} from '../../form/packageEstimatePresetIds';
import type { PackageFormData } from '../../form/packageForm';

export type PackageEstimateUsageEntry = {
  packageId: string;
  packageTitle: string;
  contractNumber: string;
  contractDate: string;
};

export type UsePackageEstimateAttachCatalogOptions = {
  packageId: string;
  form: PackageFormData;
  isProductDirectionPackage: boolean;
  linkedCrmCustomerId: string | null;
  activeAddendumSlot: number | null;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  workspacePackages: Array<{
    id: string;
    title: string | null;
    formData: Record<string, unknown>;
  }>;
  estimateAttachGroupKey: string;
  setEstimateAttachGroupKey: React.Dispatch<React.SetStateAction<string>>;
  estimatePresetToAttach: string;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  addendumPresetToAttach: string;
  setAddendumPresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  addendumExcludedPresetToAttach: string;
  setAddendumExcludedPresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  setDraggingAddendumEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
  setDraggingAddendumExcludedEstimatePresetId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function usePackageEstimateAttachCatalog({
  packageId,
  form,
  isProductDirectionPackage,
  linkedCrmCustomerId,
  activeAddendumSlot,
  estimatePresets,
  estimateGroups,
  workspacePackages,
  estimateAttachGroupKey,
  setEstimateAttachGroupKey,
  estimatePresetToAttach,
  setEstimatePresetToAttach,
  addendumPresetToAttach,
  setAddendumPresetToAttach,
  addendumExcludedPresetToAttach,
  setAddendumExcludedPresetToAttach,
  setDraggingAddendumEstimatePresetId,
  setDraggingAddendumExcludedEstimatePresetId,
}: UsePackageEstimateAttachCatalogOptions) {
  const estimateUsageById = useMemo(() => {
    const map = new Map<string, PackageEstimateUsageEntry[]>();
    for (const pkg of workspacePackages) {
      const fd = (pkg.formData ?? {}) as Record<string, unknown>;
      const uniqueIds = collectEstimatePresetIdsFromPackageFormData(fd);
      if (uniqueIds.length === 0 || pkg.id === packageId) continue;
      const row: PackageEstimateUsageEntry = {
        packageId: pkg.id,
        packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
        contractNumber: getDisplayContractNumber(pkg),
        contractDate: getDisplayContractDate(pkg),
      };
      for (const presetId of uniqueIds) {
        map.set(presetId, [...(map.get(presetId) ?? []), row]);
      }
    }
    return map;
  }, [workspacePackages, packageId]);

  const packageObjectAddress = form.object?.objectAddress ?? '';

  const estimateCustomerFilter = useMemo(
    () => ({
      filterByLinkedCustomer: isProductDirectionPackage,
      linkedCrmCustomerId,
      packageObjectAddress,
    }),
    [isProductDirectionPackage, linkedCrmCustomerId, packageObjectAddress]
  );

  const attachableEstimatePresets = useMemo(() => {
    const selected = new Set(form.estimate.selectedPresetIds ?? []);
    const usedOnAddenda = new Set<string>();
    for (const sl of form.addendumSlots) {
      for (const id of sl.selectedPresetIds ?? []) {
        if (id.trim()) usedOnAddenda.add(id.trim());
      }
    }
    return estimatePresets.filter((preset) => {
      if (!isContractEstimatePresetAttachable(preset, estimateGroups)) return false;
      if (!isEstimatePresetForLinkedContractCustomer(preset, estimateCustomerFilter)) {
        return false;
      }
      if (selected.has(preset.id)) return false;
      if (usedOnAddenda.has(preset.id)) return false;
      return (estimateUsageById.get(preset.id)?.length ?? 0) === 0;
    });
  }, [
    estimatePresets,
    estimateGroups,
    estimateUsageById,
    form.estimate.selectedPresetIds,
    form.addendumSlots,
    estimateCustomerFilter,
  ]);

  /** Есть свободные расчёты с тем же адресом, но другой карточкой CRM — типичная путаница. */
  const attachBlockedByCrmMismatch = useMemo(() => {
    if (!isProductDirectionPackage || !linkedCrmCustomerId?.trim()) return false;
    if (attachableEstimatePresets.length > 0) return false;
    const addrKey = normalizeAddressMatchKey(packageObjectAddress);
    if (!addrKey) return false;
    const selected = new Set(form.estimate.selectedPresetIds ?? []);
    return estimatePresets.some((preset) => {
      if (!isContractEstimatePresetAttachable(preset, estimateGroups)) return false;
      if (selected.has(preset.id)) return false;
      if ((estimateUsageById.get(preset.id)?.length ?? 0) !== 0) return false;
      if (normalizeAddressMatchKey(preset.objectAddress ?? '') !== addrKey) return false;
      const presetCrm = (preset.crmCustomerId ?? '').trim();
      return Boolean(presetCrm && presetCrm !== linkedCrmCustomerId.trim());
    });
  }, [
    isProductDirectionPackage,
    linkedCrmCustomerId,
    attachableEstimatePresets.length,
    packageObjectAddress,
    form.estimate.selectedPresetIds,
    estimatePresets,
    estimateGroups,
    estimateUsageById,
  ]);

  const contractEstimateObjectKey = useMemo(
    () => getContractEstimateObjectGroupKey(form, estimatePresets),
    [form, estimatePresets]
  );

  const attachEstimatePickMeta = useMemo(() => {
    const hasUngrouped = attachableEstimatePresets.some((p) => !p.groupId);
    const groupIdsWithAttachable = new Set(
      attachableEstimatePresets.map((p) => p.groupId).filter((id): id is string => Boolean(id))
    );
    const lockedKey =
      (form.estimate.selectedPresetIds?.length ?? 0) > 0 ? contractEstimateObjectKey : '';
    if (lockedKey && lockedKey !== '__ungrouped__') {
      groupIdsWithAttachable.add(lockedKey);
    }
    const groupsOrdered = [...estimateGroups]
      .filter((g) => groupIdsWithAttachable.has(g.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return { hasUngrouped, groupsOrdered };
  }, [
    attachableEstimatePresets,
    estimateGroups,
    form.estimate.selectedPresetIds?.length,
    contractEstimateObjectKey,
  ]);

  const attachableForSelectedGroup = useMemo(() => {
    const key =
      (form.estimate.selectedPresetIds?.length ?? 0) > 0
        ? contractEstimateObjectKey
        : estimateAttachGroupKey || contractEstimateObjectKey;
    if (!key) return [];
    if (key === '__ungrouped__') {
      return attachableEstimatePresets.filter((p) => !p.groupId);
    }
    return attachableEstimatePresets.filter((p) => p.groupId === key);
  }, [
    form.estimate.selectedPresetIds?.length,
    contractEstimateObjectKey,
    estimateAttachGroupKey,
    attachableEstimatePresets,
  ]);

  const attachableAddendumEstimatePresets = useMemo(() => {
    if (activeAddendumSlot === null) return [];
    const objectKey = contractEstimateObjectKey;
    if (!objectKey) return [];
    const usedElsewhere = new Set<string>();
    for (const id of form.estimate.selectedPresetIds ?? []) {
      if (id.trim()) usedElsewhere.add(id.trim());
    }
    form.addendumSlots.forEach((sl) => {
      for (const id of collectAddendumSlotPresetIds(sl)) {
        usedElsewhere.add(id);
      }
    });
    return estimatePresets
      .filter((p) => {
        if (!isContractEstimatePresetAttachable(p, estimateGroups)) return false;
        if (!isEstimatePresetForLinkedContractCustomer(p, estimateCustomerFilter)) return false;
        if (usedElsewhere.has(p.id)) return false;
        if ((estimateUsageById.get(p.id)?.length ?? 0) !== 0) return false;
        const g = p.groupId ? p.groupId : '__ungrouped__';
        return g === objectKey;
      })
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [
    activeAddendumSlot,
    contractEstimateObjectKey,
    form.estimate.selectedPresetIds,
    form.addendumSlots,
    estimatePresets,
    estimateGroups,
    estimateUsageById,
    estimateCustomerFilter,
  ]);

  const attachableAddendumExcludedEstimatePresets = attachableAddendumEstimatePresets;

  useEffect(() => {
    if (
      estimatePresetToAttach &&
      !attachableForSelectedGroup.some((p) => p.id === estimatePresetToAttach)
    ) {
      setEstimatePresetToAttach('');
    }
  }, [attachableForSelectedGroup, estimatePresetToAttach, setEstimatePresetToAttach]);

  useEffect(() => {
    if (!estimateAttachGroupKey) return;
    const { hasUngrouped, groupsOrdered } = attachEstimatePickMeta;
    if (estimateAttachGroupKey === '__ungrouped__' && !hasUngrouped) {
      setEstimateAttachGroupKey('');
      setEstimatePresetToAttach('');
    } else if (
      estimateAttachGroupKey !== '__ungrouped__' &&
      !groupsOrdered.some((g) => g.id === estimateAttachGroupKey)
    ) {
      setEstimateAttachGroupKey('');
      setEstimatePresetToAttach('');
    }
  }, [
    attachEstimatePickMeta,
    estimateAttachGroupKey,
    setEstimateAttachGroupKey,
    setEstimatePresetToAttach,
  ]);

  useEffect(() => {
    if (
      addendumPresetToAttach &&
      !attachableAddendumEstimatePresets.some((p) => p.id === addendumPresetToAttach)
    ) {
      setAddendumPresetToAttach('');
    }
  }, [attachableAddendumEstimatePresets, addendumPresetToAttach, setAddendumPresetToAttach]);

  useEffect(() => {
    if (
      addendumExcludedPresetToAttach &&
      !attachableAddendumExcludedEstimatePresets.some(
        (p) => p.id === addendumExcludedPresetToAttach
      )
    ) {
      setAddendumExcludedPresetToAttach('');
    }
  }, [
    attachableAddendumExcludedEstimatePresets,
    addendumExcludedPresetToAttach,
    setAddendumExcludedPresetToAttach,
  ]);

  useEffect(() => {
    setAddendumPresetToAttach('');
    setAddendumExcludedPresetToAttach('');
    setDraggingAddendumEstimatePresetId(null);
    setDraggingAddendumExcludedEstimatePresetId(null);
  }, [
    activeAddendumSlot,
    setAddendumPresetToAttach,
    setAddendumExcludedPresetToAttach,
    setDraggingAddendumEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
  ]);

  useEffect(() => {
    if ((form.estimate.selectedPresetIds?.length ?? 0) > 0) {
      const k = contractEstimateObjectKey;
      if (k && k !== estimateAttachGroupKey) setEstimateAttachGroupKey(k);
      return;
    }
    const fromForm = (form.estimateObjectGroupKey || '').trim();
    if (fromForm) {
      if (fromForm !== estimateAttachGroupKey) setEstimateAttachGroupKey(fromForm);
      return;
    }
    // Подставляем объект по адресу из «Данных», чтобы расчёт сразу появился в списке.
    if (estimateAttachGroupKey) return;
    const fromAddress = findAttachGroupKeyForPackageObjectAddress({
      packageObjectAddress,
      attachablePresets: attachableEstimatePresets,
      groups: estimateGroups,
    });
    if (fromAddress) setEstimateAttachGroupKey(fromAddress);
  }, [
    form.estimate.selectedPresetIds,
    form.estimateObjectGroupKey,
    contractEstimateObjectKey,
    estimateAttachGroupKey,
    setEstimateAttachGroupKey,
    packageObjectAddress,
    attachableEstimatePresets,
    estimateGroups,
  ]);

  useEffect(() => {
    if (estimatePresetToAttach) return;
    if (attachableForSelectedGroup.length !== 1) return;
    setEstimatePresetToAttach(attachableForSelectedGroup[0].id);
  }, [attachableForSelectedGroup, estimatePresetToAttach, setEstimatePresetToAttach]);

  return {
    estimateUsageById,
    attachableEstimatePresets,
    contractEstimateObjectKey,
    attachEstimatePickMeta,
    attachableForSelectedGroup,
    attachableAddendumEstimatePresets,
    attachableAddendumExcludedEstimatePresets,
    attachBlockedByCrmMismatch,
  };
}
