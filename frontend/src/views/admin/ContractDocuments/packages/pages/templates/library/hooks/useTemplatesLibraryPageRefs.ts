'use client';

import { useRef } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { PackageLibraryTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

export function useTemplatesLibraryPageRefs() {
  const lastSavedSnapshotRef = useRef<string>('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialHydrationRef = useRef(true);
  const templateTabSwitchRef = useRef(false);
  const templateArchiveSwitchRef = useRef(false);
  const titleRenameInputRef = useRef<HTMLInputElement>(null);
  const templateHtmlFileInputRef = useRef<HTMLInputElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const preferredTemplateIdsRef = useRef<Record<string, string>>({});
  const uiPrefsLoadedRef = useRef(false);

  return {
    autosaveTimerRef,
    isInitialHydrationRef,
    lastSavedSnapshotRef,
    preferredTemplateIdsRef,
    previewPaneRef,
    templateArchiveSwitchRef,
    templateHtmlFileInputRef,
    templateTabSwitchRef,
    titleRenameInputRef,
    uiPrefsLoadedRef,
  };
}

export type TemplatesLibraryPageRefs = ReturnType<typeof useTemplatesLibraryPageRefs>;

export type TemplatesScopeKeyFn = (
  kind: ContractDocumentPackageKind,
  tab: PackageLibraryTemplateTabId,
  archived: boolean
) => string;
