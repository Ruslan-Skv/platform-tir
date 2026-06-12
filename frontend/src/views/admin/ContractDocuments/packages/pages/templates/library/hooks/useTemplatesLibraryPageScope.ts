'use client';

import { useCallback, useMemo, useState } from 'react';

import { type ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { type PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  type PackageLibraryTemplateTabId,
  libraryTemplateTabIdsForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import {
  readStoredTemplatesLibraryKind,
  readStoredTemplatesLibraryTab,
} from '../templatesLibraryPresetUtils';
import type { TemplatesScopeKeyFn } from './useTemplatesLibraryPageRefs';

export function useTemplatesLibraryPageScope() {
  const [activeLibraryKind, setActiveLibraryKind] = useState<ContractDocumentPackageKind>(
    readStoredTemplatesLibraryKind
  );
  const [activeTemplateTab, setActiveTemplateTab] = useState<PackageLibraryTemplateTabId>(() =>
    readStoredTemplatesLibraryTab(readStoredTemplatesLibraryKind())
  );
  const libraryTemplateTabIds = useMemo(
    () => libraryTemplateTabIdsForPackageKind(activeLibraryKind),
    [activeLibraryKind]
  );
  const [previewCustomerKind, setPreviewCustomerKind] =
    useState<PackageTemplatePreviewCustomerKind>('PERSON');
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autosaveSavedVisible, setAutosaveSavedVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [titleRenameMode, setTitleRenameMode] = useState(false);
  const [placeholdersCollapsed, setPlaceholdersCollapsed] = useState(false);

  const templatesScopeKey = useCallback<TemplatesScopeKeyFn>(
    (kind, tab, archived) => `${kind}:${tab}:${archived ? 'arch' : 'active'}`,
    []
  );

  return {
    activeLibraryKind,
    activeTemplateTab,
    autosaveSavedVisible,
    editingId,
    error,
    libraryTemplateTabIds,
    ok,
    placeholdersCollapsed,
    previewCustomerKind,
    saving,
    setActiveLibraryKind,
    setActiveTemplateTab,
    setAutosaveSavedVisible,
    setEditingId,
    setError,
    setOk,
    setPlaceholdersCollapsed,
    setPreviewCustomerKind,
    setSaving,
    setShowArchivedTemplates,
    setTitle,
    setTitleRenameMode,
    showArchivedTemplates,
    templatesScopeKey,
    title,
    titleRenameMode,
  };
}

export type TemplatesLibraryPageScope = ReturnType<typeof useTemplatesLibraryPageScope>;
