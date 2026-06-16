import { useAuth } from '@/features/auth';

import { useTemplatesLibraryDerivedData } from './useTemplatesLibraryDerivedData';
import { useTemplatesLibraryEditorCore } from './useTemplatesLibraryEditorCore';
import { useTemplatesLibraryEditorFormat } from './useTemplatesLibraryEditorFormat';
import { useTemplatesLibraryLoad } from './useTemplatesLibraryLoad';
import { useTemplatesLibraryModalsState } from './useTemplatesLibraryModalsState';
import { useTemplatesLibraryMutations } from './useTemplatesLibraryMutations';
import { useTemplatesLibraryNavigation } from './useTemplatesLibraryNavigation';
import { useTemplatesLibraryPageRefs } from './useTemplatesLibraryPageRefs';
import { useTemplatesLibraryPageScope } from './useTemplatesLibraryPageScope';
import { useTemplatesLibraryPreviewUi } from './useTemplatesLibraryPreviewUi';
import { useTemplatesLibraryTitleRenameFocus } from './useTemplatesLibraryTitleRenameFocus';
import { useTemplatesLibraryUiPrefsSync } from './useTemplatesLibraryUiPrefsSync';

export function useTemplatesLibraryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const scope = useTemplatesLibraryPageScope();
  const {
    activeLibraryKind,
    activeTemplateTab,
    editingId,
    placeholdersCollapsed,
    previewCustomerKind,
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
  } = scope;

  const refs = useTemplatesLibraryPageRefs();
  const {
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
  } = refs;

  useTemplatesLibraryTitleRenameFocus(titleRenameMode, titleRenameInputRef);

  const {
    trashOpen,
    setTrashOpen,
    templateTrashPending,
    setTemplateTrashPending,
    templateArchivePending,
    setTemplateArchivePending,
  } = useTemplatesLibraryModalsState();

  const {
    items,
    setItems,
    loading,
    firstExecutorProfile,
    firstSignatoryProfile,
    trashCount,
    refreshTrashCount,
    itemsRef,
  } = useTemplatesLibraryLoad({
    activeLibraryKind,
    templatesScopeKey,
    setError,
    lastSavedSnapshotRef,
    isInitialHydrationRef,
  });

  const editorCore = useTemplatesLibraryEditorCore({
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    loading,
    editingId,
    setEditingId,
    setTitle,
    setTitleRenameMode,
    setError,
    setOk,
    preferredTemplateIdsRef,
    templatesScopeKey,
    uiPrefsLoadedRef,
    itemsRef,
    templateTabSwitchRef,
    templateArchiveSwitchRef,
  });

  const {
    applyLibraryTemplateSelection,
    applyTemplateHistorySnapshot,
    commitTemplateHtmlToState,
    editorMode,
    ensureTemplateDraftForEditing,
    html,
    htmlTextareaRef,
    pushTemplateHistory,
    resetTemplateHistory,
    setEditorMode,
    setHtml,
    setVisualDraftHtml,
    switchEditorMode,
    syncVisualEditorToHtmlState,
    tableEditActive,
    setTableEditActive,
    templateHistory,
    templateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
    setTemplateHistoryIndex,
    visualDraftHtml,
    visualEditorRef,
    visualSelectionRangeRef,
  } = editorCore;

  const previewUi = useTemplatesLibraryPreviewUi({
    uiPrefsLoadedRef,
    htmlTextareaRef,
    visualEditorRef,
    previewPaneRef,
  });

  const {
    htmlEditorHeightPx,
    previewPaneHeightPx,
    previewZoomPct,
    setHtmlEditorHeightPx,
    setPreviewPaneHeightPx,
    setPreviewZoomPct,
    setVisualEditorHeightPx,
    setVisualZoomPct,
    visualEditorHeightPx,
    visualZoomPct,
  } = previewUi;

  useTemplatesLibraryUiPrefsSync({
    previewZoomPct,
    visualZoomPct,
    editorMode,
    htmlEditorHeightPx,
    visualEditorHeightPx,
    previewPaneHeightPx,
    activeLibraryKind,
    activeTemplateTab,
    previewCustomerKind,
    showArchivedTemplates,
    placeholdersCollapsed,
    setPreviewZoomPct,
    setVisualZoomPct,
    setEditorMode,
    setHtmlEditorHeightPx,
    setVisualEditorHeightPx,
    setPreviewPaneHeightPx,
    setActiveLibraryKind,
    setActiveTemplateTab,
    setPreviewCustomerKind,
    setShowArchivedTemplates,
    setPlaceholdersCollapsed,
    preferredTemplateIdsRef,
    visualEditorRef,
    previewPaneRef,
    htmlTextareaRef,
    uiPrefsLoadedRef,
  });

  const derived = useTemplatesLibraryDerivedData({
    items,
    activeTemplateTab,
    activeLibraryKind,
    showArchivedTemplates,
    editingId,
    html,
    firstExecutorProfile,
    firstSignatoryProfile,
    previewCustomerKind,
  });
  const { itemsByActiveTab } = derived;

  const mutations = useTemplatesLibraryMutations({
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    loading,
    items,
    setItems,
    itemsByActiveTab,
    itemsRef,
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
  });

  const editorFormat = useTemplatesLibraryEditorFormat({
    isSuperAdmin,
    html,
    setHtml,
    visualDraftHtml,
    setVisualDraftHtml,
    editorMode,
    setEditorMode,
    setOk,
    setError,
    visualEditorRef,
    htmlTextareaRef,
    visualSelectionRangeRef,
    pushTemplateHistory,
    switchEditorMode,
    syncVisualEditorToHtmlState,
    applyTemplateHistorySnapshot,
    templateHistoryIndex,
    templateHistory,
    templateHistoryRef,
    templateHistoryIndexRef,
    setTemplateHistoryIndex,
    tableEditActive,
    setTableEditActive,
    ensureTemplateDraftForEditing,
  });

  const navigation = useTemplatesLibraryNavigation({
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
  });

  return {
    isSuperAdmin,
    ...scope,
    titleRenameInputRef,
    templateHtmlFileInputRef,
    trashOpen,
    setTrashOpen,
    templateTrashPending,
    setTemplateTrashPending,
    templateArchivePending,
    setTemplateArchivePending,
    items,
    setItems,
    loading,
    trashCount,
    refreshTrashCount,
    ...editorCore,
    ...previewUi,
    ...derived,
    ...mutations,
    ...editorFormat,
    ...navigation,
    previewPaneRef,
  };
}

export type TemplatesLibraryPageModel = ReturnType<typeof useTemplatesLibraryPage>;
