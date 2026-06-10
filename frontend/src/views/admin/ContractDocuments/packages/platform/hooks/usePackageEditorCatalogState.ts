import { useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
  ContractSignatoryProfile,
  ContractTemplatePreset,
  ExecutorRequisiteProfile,
} from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';

export function usePackageEditorCatalogState() {
  const [executorProfiles, setExecutorProfiles] = useState<ExecutorRequisiteProfile[]>([]);
  const [signatoryProfiles, setSignatoryProfiles] = useState<ContractSignatoryProfile[]>([]);
  const [contractTemplatePresets, setContractTemplatePresets] = useState<ContractTemplatePreset[]>(
    []
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [estimatePresets, setEstimatePresets] = useState<ContractEstimatePreset[]>([]);
  const [contractInstallers, setContractInstallers] = useState<InstallerMaster[]>([]);
  const [activeInstallerId, setActiveInstallerId] = useState('');
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  const [estimateAttachGroupKey, setEstimateAttachGroupKey] = useState('');
  const [estimatePresetToAttach, setEstimatePresetToAttach] = useState('');
  const [draggingEstimatePresetId, setDraggingEstimatePresetId] = useState<string | null>(null);
  const [addendumPresetToAttach, setAddendumPresetToAttach] = useState('');
  const [addendumExcludedPresetToAttach, setAddendumExcludedPresetToAttach] = useState('');
  const [draggingAddendumEstimatePresetId, setDraggingAddendumEstimatePresetId] = useState<
    string | null
  >(null);
  const [draggingAddendumExcludedEstimatePresetId, setDraggingAddendumExcludedEstimatePresetId] =
    useState<string | null>(null);
  const [workspacePackages, setWorkspacePackages] = useState<
    Array<{
      id: string;
      title: string | null;
      formData: Record<string, unknown>;
    }>
  >([]);

  return {
    executorProfiles,
    setExecutorProfiles,
    signatoryProfiles,
    setSignatoryProfiles,
    contractTemplatePresets,
    setContractTemplatePresets,
    selectedTemplateIds,
    setSelectedTemplateIds,
    estimatePresets,
    setEstimatePresets,
    contractInstallers,
    setContractInstallers,
    activeInstallerId,
    setActiveInstallerId,
    estimateGroups,
    setEstimateGroups,
    estimateAttachGroupKey,
    setEstimateAttachGroupKey,
    estimatePresetToAttach,
    setEstimatePresetToAttach,
    draggingEstimatePresetId,
    setDraggingEstimatePresetId,
    addendumPresetToAttach,
    setAddendumPresetToAttach,
    addendumExcludedPresetToAttach,
    setAddendumExcludedPresetToAttach,
    draggingAddendumEstimatePresetId,
    setDraggingAddendumEstimatePresetId,
    draggingAddendumExcludedEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
    workspacePackages,
    setWorkspacePackages,
  };
}

export type PackageEditorCatalogState = ReturnType<typeof usePackageEditorCatalogState>;
