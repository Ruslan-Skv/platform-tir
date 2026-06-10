import { useCallback, useEffect, useMemo } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractTemplatePreset,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { trashContractTemplatePreset } from '@/shared/api/admin-contract-document-template-presets-trash';
import { canAutosaveLibraryTemplatePreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateSelection';
import {
  type PackageLibraryTemplateTabId,
  isPackageLibraryTemplateTabId,
  packageLibraryTemplateTabIdFromPreset,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { isPackageLibraryTemplatePreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageTemplatePresetTab';
import { libraryTemplateFallbackHtml } from '@/views/admin/ContractDocuments/packages/templates';

import { normalizeTemplateEditorHtml } from '../templatesLibraryHtmlNormalize';
import {
  filterTemplatesByActiveKind,
  normalizeContractTemplatePreset,
  templateLibraryKindLabel,
} from '../templatesLibraryPresetUtils';
import { TEMPLATES_ACTIVE_TAB_KEY } from '../templatesLibraryStorage';

export type UseTemplatesLibraryMutationsParams = {
  isSuperAdmin: boolean;
  activeLibraryKind: ContractDocumentPackageKind;
  activeTemplateTab: PackageLibraryTemplateTabId;
  showArchivedTemplates: boolean;
  loading: boolean;
  items: ContractTemplatePreset[];
  setItems: React.Dispatch<React.SetStateAction<ContractTemplatePreset[]>>;
  itemsByActiveTab: ContractTemplatePreset[];
  itemsRef: React.RefObject<ContractTemplatePreset[]>;
  editingId: string;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  html: string;
  setHtml: React.Dispatch<React.SetStateAction<string>>;
  visualDraftHtml: string;
  setVisualDraftHtml: React.Dispatch<React.SetStateAction<string>>;
  editorMode: 'html' | 'visual';
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setOk: React.Dispatch<React.SetStateAction<string | null>>;
  setTitleRenameMode: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTemplateTab: React.Dispatch<React.SetStateAction<PackageLibraryTemplateTabId>>;
  setAutosaveSavedVisible: React.Dispatch<React.SetStateAction<boolean>>;
  ensureTemplateDraftForEditing: () => string;
  commitTemplateHtmlToState: (raw: string) => string;
  resetTemplateHistory: (htmlSnapshot: string) => void;
  applyLibraryTemplateSelection: (
    list: ContractTemplatePreset[],
    tab: PackageLibraryTemplateTabId
  ) => void;
  refreshTrashCount: () => void;
  visualEditorRef: React.RefObject<HTMLDivElement | null>;
  autosaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastSavedSnapshotRef: React.MutableRefObject<string>;
  isInitialHydrationRef: React.MutableRefObject<boolean>;
  templateTabSwitchRef: React.MutableRefObject<boolean>;
  templateArchiveSwitchRef: React.MutableRefObject<boolean>;
  preferredTemplateIdsRef: React.MutableRefObject<Record<string, string>>;
  templatesScopeKey: (
    kind: ContractDocumentPackageKind,
    tab: PackageLibraryTemplateTabId,
    archived: boolean
  ) => string;
  templateTrashPending: { presetId: string; name: string } | null;
  setTemplateTrashPending: React.Dispatch<
    React.SetStateAction<{ presetId: string; name: string } | null>
  >;
  templateArchivePending: { presetId: string; name: string } | null;
  setTemplateArchivePending: React.Dispatch<
    React.SetStateAction<{ presetId: string; name: string } | null>
  >;
};

export function useTemplatesLibraryMutations({
  isSuperAdmin,
  activeLibraryKind,
  activeTemplateTab,
  showArchivedTemplates,
  loading,
  items,
  setItems,
  itemsByActiveTab,
  editingId,
  setEditingId,
  title,
  setTitle,
  html,
  setHtml,
  visualDraftHtml,
  setVisualDraftHtml,
  editorMode,
  setSaving,
  setError,
  setOk,
  setTitleRenameMode,
  setActiveTemplateTab,
  setAutosaveSavedVisible,
  ensureTemplateDraftForEditing,
  commitTemplateHtmlToState,
  resetTemplateHistory,
  applyLibraryTemplateSelection,
  refreshTrashCount,
  visualEditorRef,
  autosaveTimerRef,
  lastSavedSnapshotRef,
  isInitialHydrationRef,
  templateTabSwitchRef,
  templateArchiveSwitchRef,
  preferredTemplateIdsRef,
  templatesScopeKey,
  templateTrashPending,
  setTemplateTrashPending,
  templateArchivePending,
  setTemplateArchivePending,
}: UseTemplatesLibraryMutationsParams) {
  const persist = useCallback(
    async (next: ContractTemplatePreset[], successText: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setOk(null);
      try {
        const normalized = next.map((it) => normalizeContractTemplatePreset(it));
        await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
        setItems(normalized);
        lastSavedSnapshotRef.current = JSON.stringify(normalized);
        setOk(successText);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [activeLibraryKind, lastSavedSnapshotRef, setError, setItems, setOk, setSaving]
  );

  const buildItemsForAutosave = useCallback((): ContractTemplatePreset[] | null => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return null;
    const t = title.trim();
    const rawContentHtml = (
      editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? visualDraftHtml) : html
    ).trim();
    const contentHtml = normalizeTemplateEditorHtml(rawContentHtml);
    if (!t || !contentHtml) return null;
    if (!canAutosaveLibraryTemplatePreset(items, editingId, activeTemplateTab)) return null;
    const exists = items.some((it) => it.id === editingId);
    if (exists) {
      return items.map((it) =>
        it.id === editingId ? { ...it, title: t, html: contentHtml, tabId: activeTemplateTab } : it
      );
    }
    return [
      ...items,
      {
        id: editingId,
        title: t,
        html: contentHtml,
        tabId: activeTemplateTab,
        isDefault: itemsByActiveTab.length === 0,
        archived: false,
      },
    ];
  }, [
    isSuperAdmin,
    editingId,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    items,
    activeTemplateTab,
    itemsByActiveTab.length,
    visualEditorRef,
  ]);

  const persistItemsSnapshot = useCallback(
    async (next: ContractTemplatePreset[]) => {
      const snapshot = JSON.stringify(next.map((it) => normalizeContractTemplatePreset(it)));
      if (snapshot === lastSavedSnapshotRef.current) return;
      setSaving(true);
      setError(null);
      try {
        const normalized = next.map((it) => normalizeContractTemplatePreset(it));
        await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
        setItems(normalized);
        lastSavedSnapshotRef.current = JSON.stringify(normalized);
        const savedCurrent = editingId ? normalized.find((it) => it.id === editingId) : undefined;
        if (savedCurrent?.html) {
          setHtml(savedCurrent.html);
          setVisualDraftHtml(savedCurrent.html);
          if (visualEditorRef.current) {
            visualEditorRef.current.innerHTML = savedCurrent.html;
          }
        }
        setAutosaveSavedVisible(true);
        window.setTimeout(() => setAutosaveSavedVisible(false), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблон');
      } finally {
        setSaving(false);
      }
    },
    [
      activeLibraryKind,
      editingId,
      lastSavedSnapshotRef,
      setAutosaveSavedVisible,
      setError,
      setHtml,
      setItems,
      setSaving,
      setVisualDraftHtml,
      visualEditorRef,
    ]
  );

  const persistAutosave = useCallback(async () => {
    const next = buildItemsForAutosave();
    if (!next) return;
    await persistItemsSnapshot(next);
  }, [buildItemsForAutosave, persistItemsSnapshot]);

  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistAutosave();
  }, [autosaveTimerRef, persistAutosave]);

  const handleSaveNow = useCallback(async () => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    if (!editingId) ensureTemplateDraftForEditing();
    const hasHtml =
      (editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? html) : html).trim()
        .length > 0;
    if (!hasHtml) {
      setError('Шаблон пустой. Добавьте текст и сохраните снова.');
      return;
    }
    if (!title.trim()) {
      setError('Укажите название шаблона перед сохранением.');
      return;
    }
    await persistAutosave();
    setOk(`Шаблон сохранён для направления «${templateLibraryKindLabel(activeLibraryKind)}».`);
  }, [
    isSuperAdmin,
    showArchivedTemplates,
    editingId,
    ensureTemplateDraftForEditing,
    editorMode,
    html,
    title,
    persistAutosave,
    activeLibraryKind,
    setError,
    setOk,
    visualEditorRef,
  ]);

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

  useEffect(() => {
    if (loading || !isSuperAdmin) return;
    if (templateTabSwitchRef.current || templateArchiveSwitchRef.current) return;
    if (isInitialHydrationRef.current) {
      isInitialHydrationRef.current = false;
      const initial = buildItemsForAutosave();
      lastSavedSnapshotRef.current = JSON.stringify(
        initial?.map((it) => normalizeContractTemplatePreset(it)) ?? items
      );
      return;
    }
    if (showArchivedTemplates) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistAutosave();
    }, 700);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    loading,
    isSuperAdmin,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    editingId,
    activeTemplateTab,
    items,
    buildItemsForAutosave,
    persistAutosave,
    autosaveTimerRef,
    isInitialHydrationRef,
    lastSavedSnapshotRef,
    templateArchiveSwitchRef,
    templateTabSwitchRef,
  ]);

  const requestMoveTemplateToTrash = useCallback(() => {
    if (!isSuperAdmin || !editingId) return;
    void (async () => {
      await flushAutosave();
      const current = items.find((it) => it.id === editingId);
      if (!current) return;
      const name = (current.title ?? title).trim() || 'без названия';
      setTemplateTrashPending({ presetId: editingId, name });
    })();
  }, [isSuperAdmin, editingId, flushAutosave, items, title, setTemplateTrashPending]);

  const confirmMoveTemplateToTrash = useCallback(() => {
    const pending = templateTrashPending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        await trashContractTemplatePreset(presetId);
        const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
        const nextRaw = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
        setItems(next);
        void refreshTrashCount();
        setOk('Шаблон перемещён в корзину.');
        const tabItems = next.filter((it) => {
          if (packageLibraryTemplateTabIdFromPreset(it.tabId) !== activeTemplateTab) return false;
          return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
        });
        const fallback = tabItems.find((it) => it.isDefault)?.id ?? tabItems[0]?.id ?? '';
        if (fallback) selectTemplate(fallback);
        else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetTemplateHistory('');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить шаблон в корзину');
      } finally {
        setSaving(false);
      }
    })();
  }, [
    templateTrashPending,
    isSuperAdmin,
    setSaving,
    setError,
    activeLibraryKind,
    setItems,
    refreshTrashCount,
    setOk,
    activeTemplateTab,
    showArchivedTemplates,
    selectTemplate,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
  ]);

  const templateTrashConfirmMessage = useMemo(
    () =>
      templateTrashPending != null
        ? `Шаблон «${templateTrashPending.name}» будет перемещён в корзину и скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}». Через 30 дней он удалится безвозвратно. Восстановить можно из корзины.`
        : '',
    [templateTrashPending, activeLibraryKind]
  );

  const requestArchiveTemplate = useCallback(() => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current) return;
    if (current.archived) {
      setError('Этот шаблон уже в архиве.');
      return;
    }
    void (async () => {
      await flushAutosave();
      const fresh = items.find((it) => it.id === editingId);
      if (!fresh || fresh.archived) return;
      const name = (fresh.title ?? title).trim() || 'без названия';
      setTemplateArchivePending({ presetId: editingId, name });
    })();
  }, [isSuperAdmin, editingId, items, setError, flushAutosave, title, setTemplateArchivePending]);

  const confirmArchiveTemplate = useCallback(() => {
    const pending = templateArchivePending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      templateArchiveSwitchRef.current = true;
      try {
        await flushAutosave();
        const tab = activeTemplateTab;
        let next = items.map((it) =>
          it.id === presetId ? { ...it, archived: true, isDefault: false } : it
        );
        let activeOnTab = next.filter(
          (it) => packageLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
        );
        if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
          const pickId = activeOnTab[0].id;
          next = next.map((it) =>
            packageLibraryTemplateTabIdFromPreset(it.tabId) !== tab
              ? it
              : { ...it, isDefault: !it.archived && it.id === pickId }
          );
          activeOnTab = next.filter(
            (it) => packageLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
          );
        }
        const saved = await persist(next, 'Шаблон перенесён в архив.');
        if (!saved) return;
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        const fallback = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
        if (fallback) {
          applyEditingTemplateFromList(next, fallback);
        } else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetTemplateHistory('');
        }
      } finally {
        templateArchiveSwitchRef.current = false;
      }
    })();
  }, [
    templateArchivePending,
    isSuperAdmin,
    templateArchiveSwitchRef,
    flushAutosave,
    activeTemplateTab,
    items,
    persist,
    autosaveTimerRef,
    applyEditingTemplateFromList,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
  ]);

  const templateArchiveConfirmMessage = useMemo(
    () =>
      templateArchivePending != null
        ? `Шаблон «${templateArchivePending.name}» будет скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}» (останется в архиве). Восстановление: «Показать архивные» → «Восстановить».`
        : '',
    [templateArchivePending, activeLibraryKind]
  );

  const restoreArchivedTemplate = useCallback(async () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current?.archived) return;
    const next = items.map((it) => (it.id === editingId ? { ...it, archived: false } : it));
    await persist(next, 'Шаблон восстановлен из архива.');
  }, [isSuperAdmin, editingId, items, persist]);

  const handleExportSeedJson = useCallback(() => {
    if (!isSuperAdmin) return;
    const libraryItems = items
      .filter((it) => isPackageLibraryTemplatePreset(it) && !it.archived)
      .map((it) => normalizeContractTemplatePreset(it));
    const blob = new Blob([JSON.stringify({ version: 1, items: libraryItems }, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const kindSlug = activeLibraryKind.toLowerCase();
    a.download = `${kindSlug}-library-templates.seed.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOk(
      `Скачан ${kindSlug}-library-templates.seed.json — положите в backend/prisma/seed-data/ в репозиторий и выполните сидирование соответствующего направления.`
    );
  }, [isSuperAdmin, items, activeLibraryKind, setOk]);

  const handleTrashRestored = useCallback(() => {
    void refreshTrashCount();
    void (async () => {
      try {
        const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
        const nextRaw = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
        setItems(next);
      } catch {
        /* ignore */
      }
    })();
  }, [activeLibraryKind, refreshTrashCount, setItems]);

  return {
    confirmArchiveTemplate,
    confirmMoveTemplateToTrash,
    createNewTemplate,
    handleActiveTemplateTabChange,
    handleExportSeedJson,
    handleSaveNow,
    handleTrashRestored,
    requestArchiveTemplate,
    requestMoveTemplateToTrash,
    restoreArchivedTemplate,
    selectTemplate,
    templateArchiveConfirmMessage,
    templateTrashConfirmMessage,
  };
}
