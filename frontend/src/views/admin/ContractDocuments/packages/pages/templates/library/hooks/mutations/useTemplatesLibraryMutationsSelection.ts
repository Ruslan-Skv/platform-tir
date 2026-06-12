import { useCallback } from 'react';

import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type PackageLibraryTemplateTabId,
  isPackageLibraryTemplateTabId,
  packageLibraryTemplateTabIdFromPreset,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { libraryTemplateFallbackHtml } from '@/views/admin/ContractDocuments/packages/templates';

import { TEMPLATES_ACTIVE_TAB_KEY } from '../../templatesLibraryStorage';
import type {
  TemplatesLibraryMutationsPersistApi,
  UseTemplatesLibraryMutationsParams,
} from './templatesLibraryMutationsTypes';

export function useTemplatesLibraryMutationsSelection(
  params: UseTemplatesLibraryMutationsParams,
  persistApi: TemplatesLibraryMutationsPersistApi
) {
  const {
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    items,
    itemsByActiveTab,
    setEditingId,
    setTitle,
    setTitleRenameMode,
    setActiveTemplateTab,
    commitTemplateHtmlToState,
    applyLibraryTemplateSelection,
    preferredTemplateIdsRef,
    templatesScopeKey,
    autosaveTimerRef,
    templateTabSwitchRef,
  } = params;

  const { flushAutosave, buildItemsForAutosave, persistItemsSnapshot } = persistApi;

  const selectTemplate = useCallback(
    (id: string) => {
      void (async () => {
        await flushAutosave();
        const t = items.find((it) => it.id === id) ?? itemsByActiveTab.find((it) => it.id === id);
        const tab = packageLibraryTemplateTabIdFromPreset(t?.tabId) ?? activeTemplateTab;
        preferredTemplateIdsRef.current[
          templatesScopeKey(activeLibraryKind, tab, showArchivedTemplates)
        ] = id;
        setTitleRenameMode(false);
        setEditingId(id);
        setTitle(t?.title ?? '');
        commitTemplateHtmlToState(t?.html ?? '');
      })();
    },
    [
      flushAutosave,
      items,
      itemsByActiveTab,
      activeTemplateTab,
      preferredTemplateIdsRef,
      templatesScopeKey,
      activeLibraryKind,
      showArchivedTemplates,
      setTitleRenameMode,
      setEditingId,
      setTitle,
      commitTemplateHtmlToState,
    ]
  );

  const createNewTemplate = useCallback(() => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    void (async () => {
      await flushAutosave();
      setTitleRenameMode(true);
      setEditingId(`tpl_${Date.now()}`);
      setTitle('Новый шаблон');
      const next = isPackageLibraryTemplateTabId(activeTemplateTab)
        ? libraryTemplateFallbackHtml(activeLibraryKind, activeTemplateTab)
        : '<div class="docPrint"></div>';
      commitTemplateHtmlToState(next);
    })();
  }, [
    isSuperAdmin,
    showArchivedTemplates,
    flushAutosave,
    setTitleRenameMode,
    setEditingId,
    setTitle,
    activeTemplateTab,
    activeLibraryKind,
    commitTemplateHtmlToState,
  ]);

  const applyEditingTemplateFromList = useCallback(
    (list: ContractTemplatePreset[], id: string) => {
      const t = list.find((it) => it.id === id);
      const tab = packageLibraryTemplateTabIdFromPreset(t?.tabId) ?? activeTemplateTab;
      preferredTemplateIdsRef.current[
        templatesScopeKey(activeLibraryKind, tab, showArchivedTemplates)
      ] = id;
      if (t) {
        setEditingId(id);
        setTitle(t.title ?? '');
        commitTemplateHtmlToState(t.html ?? '');
        return;
      }
      applyLibraryTemplateSelection(list, tab);
    },
    [
      activeTemplateTab,
      preferredTemplateIdsRef,
      templatesScopeKey,
      activeLibraryKind,
      showArchivedTemplates,
      setEditingId,
      setTitle,
      commitTemplateHtmlToState,
      applyLibraryTemplateSelection,
    ]
  );

  const handleActiveTemplateTabChange = useCallback(
    (nextTab: PackageLibraryTemplateTabId) => {
      if (nextTab === activeTemplateTab) return;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ACTIVE_TAB_KEY, nextTab);
        } catch {
          // ignore localStorage write issues
        }
      }
      const pendingSave = buildItemsForAutosave();
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      templateTabSwitchRef.current = true;
      setActiveTemplateTab(nextTab);
      void (async () => {
        let listAfterSave = items;
        try {
          if (pendingSave) {
            await persistItemsSnapshot(pendingSave);
            listAfterSave = pendingSave;
          }
        } finally {
          applyLibraryTemplateSelection(listAfterSave, nextTab);
          templateTabSwitchRef.current = false;
        }
      })();
    },
    [
      activeTemplateTab,
      applyLibraryTemplateSelection,
      buildItemsForAutosave,
      items,
      persistItemsSnapshot,
      autosaveTimerRef,
      templateTabSwitchRef,
      setActiveTemplateTab,
    ]
  );

  return {
    selectTemplate,
    createNewTemplate,
    applyEditingTemplateFromList,
    handleActiveTemplateTabChange,
  };
}
