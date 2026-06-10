import { useState } from 'react';

import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';
import { useContractTemplateEditor } from './useContractTemplateEditor';

export type UsePackageTemplateEditorStateOptions = {
  activeTab: PackageDocumentTabId;
  isSuperAdmin: boolean;
  contractAndEstimateLocked: boolean;
  contractTemplatePresets: ContractTemplatePreset[];
  setContractTemplatePresets: React.Dispatch<React.SetStateAction<ContractTemplatePreset[]>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
  setSelectedTemplateIds: React.Dispatch<
    React.SetStateAction<Partial<Record<PackageDocumentTemplateTabId, string>>>
  >;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setExcelMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export function usePackageTemplateEditorState({
  activeTab,
  isSuperAdmin,
  contractAndEstimateLocked,
  contractTemplatePresets,
  setContractTemplatePresets,
  selectedTemplateIds,
  setSelectedTemplateIds,
  resolveTemplateHtml,
  setError,
  setExcelMessage,
}: UsePackageTemplateEditorStateOptions) {
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [templateDraftTitle, setTemplateDraftTitle] = useState('');
  const [templateDraftHtml, setTemplateDraftHtml] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);

  const contractTemplateEditor = useContractTemplateEditor({
    activeTab,
    isSuperAdmin,
    contractAndEstimateLocked,
    contractTemplatePresets,
    setContractTemplatePresets,
    selectedTemplateIds,
    setSelectedTemplateIds,
    editingTemplateId,
    setEditingTemplateId,
    templateDraftTitle,
    setTemplateDraftTitle,
    templateDraftHtml,
    setTemplateDraftHtml,
    templateSaving,
    setTemplateSaving,
    resolveTemplateHtml,
    setError,
    setExcelMessage,
  });

  return {
    contractTemplateEditor,
    templateLoadSetters: {
      setEditingTemplateId,
      setTemplateDraftTitle,
      setTemplateDraftHtml,
    },
  };
}
