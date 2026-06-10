import { useCallback, useEffect, useRef } from 'react';

import { type ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { type PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  type PackageLibraryTemplateTabId,
  normalizeLibraryTemplateTabForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import {
  TEMPLATES_ACTIVE_KIND_KEY,
  TEMPLATES_ACTIVE_TAB_KEY,
  TEMPLATES_ARCHIVE_MODE_KEY,
  TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY,
  TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY,
  TEMPLATES_UI_PREFS_KEY,
  type TemplatesUiPrefs,
} from '../templatesLibraryStorage';

export type UseTemplatesLibraryNavigationParams = {
  activeLibraryKind: ContractDocumentPackageKind;
  activeTemplateTab: PackageLibraryTemplateTabId;
  showArchivedTemplates: boolean;
  editingId: string;
  isSuperAdmin: boolean;
  uiPrefsLoadedRef: React.MutableRefObject<boolean>;
  setActiveLibraryKind: React.Dispatch<React.SetStateAction<ContractDocumentPackageKind>>;
  setActiveTemplateTab: React.Dispatch<React.SetStateAction<PackageLibraryTemplateTabId>>;
  setPreviewCustomerKind: React.Dispatch<React.SetStateAction<PackageTemplatePreviewCustomerKind>>;
  setShowArchivedTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  setTitleRenameMode: React.Dispatch<React.SetStateAction<boolean>>;
  setPlaceholdersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

export function useTemplatesLibraryNavigation({
  activeLibraryKind,
  activeTemplateTab,
  showArchivedTemplates,
  editingId,
  isSuperAdmin,
  uiPrefsLoadedRef,
  setActiveLibraryKind,
  setActiveTemplateTab,
  setPreviewCustomerKind,
  setShowArchivedTemplates,
  setTitleRenameMode,
  setPlaceholdersCollapsed,
}: UseTemplatesLibraryNavigationParams) {
  const activeLibraryKindPrevRef = useRef<ContractDocumentPackageKind | null>(null);

  const handleActiveLibraryKindChange = useCallback(
    (nextKind: ContractDocumentPackageKind) => {
      if (nextKind === activeLibraryKind) return;
      setActiveLibraryKind(nextKind);
      setActiveTemplateTab((tab) => normalizeLibraryTemplateTabForPackageKind(tab, nextKind));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ACTIVE_KIND_KEY, nextKind);
        } catch {
          // ignore localStorage write issues
        }
      }
    },
    [activeLibraryKind, setActiveLibraryKind, setActiveTemplateTab]
  );

  useEffect(() => {
    if (activeLibraryKindPrevRef.current === null) {
      activeLibraryKindPrevRef.current = activeLibraryKind;
      return;
    }
    if (activeLibraryKindPrevRef.current === activeLibraryKind) return;
    activeLibraryKindPrevRef.current = activeLibraryKind;
    setActiveTemplateTab((tab) =>
      normalizeLibraryTemplateTabForPackageKind(tab, activeLibraryKind)
    );
  }, [activeLibraryKind, setActiveTemplateTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!uiPrefsLoadedRef.current) return;
    try {
      window.localStorage.setItem(TEMPLATES_ACTIVE_TAB_KEY, activeTemplateTab);
    } catch {
      // ignore localStorage write issues
    }
  }, [activeTemplateTab, uiPrefsLoadedRef]);

  const handlePreviewCustomerKindChange = useCallback(
    (nextKind: PackageTemplatePreviewCustomerKind) => {
      setPreviewCustomerKind(nextKind);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY, nextKind);
        } catch {
          // ignore localStorage write issues
        }
      }
    },
    [setPreviewCustomerKind]
  );

  const toggleArchiveMode = useCallback(() => {
    setShowArchivedTemplates((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ARCHIVE_MODE_KEY, next ? '1' : '0');
        } catch {
          // ignore localStorage write issues
        }
      }
      return next;
    });
  }, [setShowArchivedTemplates]);

  const handleRenameTemplateTitle = useCallback(() => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return;
    setTitleRenameMode(true);
  }, [isSuperAdmin, editingId, showArchivedTemplates, setTitleRenameMode]);

  const togglePlaceholdersCollapsed = useCallback(() => {
    setPlaceholdersCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
        try {
          window.localStorage.setItem(TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY, next ? '1' : '0');
          const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
          const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : {};
          window.localStorage.setItem(
            TEMPLATES_UI_PREFS_KEY,
            JSON.stringify({
              ...parsed,
              placeholdersCollapsed: next,
            })
          );
        } catch {
          // ignore localStorage write issues
        }
      }
      return next;
    });
  }, [setPlaceholdersCollapsed, uiPrefsLoadedRef]);

  return {
    handleActiveLibraryKindChange,
    handlePreviewCustomerKindChange,
    handleRenameTemplateTitle,
    toggleArchiveMode,
    togglePlaceholdersCollapsed,
  };
}
