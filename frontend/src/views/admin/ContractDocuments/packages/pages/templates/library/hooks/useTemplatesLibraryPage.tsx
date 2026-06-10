'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
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
import { useTemplatesLibraryCreateTemplateHelp } from './useTemplatesLibraryCreateTemplateHelp';
import { useTemplatesLibraryDerivedData } from './useTemplatesLibraryDerivedData';
import { useTemplatesLibraryEditorCore } from './useTemplatesLibraryEditorCore';
import { useTemplatesLibraryEditorFormat } from './useTemplatesLibraryEditorFormat';
import { useTemplatesLibraryLoad } from './useTemplatesLibraryLoad';
import { useTemplatesLibraryModalsState } from './useTemplatesLibraryModalsState';
import { useTemplatesLibraryMutations } from './useTemplatesLibraryMutations';
import { useTemplatesLibraryNavigation } from './useTemplatesLibraryNavigation';
import { useTemplatesLibraryPreviewUi } from './useTemplatesLibraryPreviewUi';
import { useTemplatesLibraryUiPrefsSync } from './useTemplatesLibraryUiPrefsSync';

export function useTemplatesLibraryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
  const {
    trashOpen,
    setTrashOpen,
    templateTrashPending,
    setTemplateTrashPending,
    templateArchivePending,
    setTemplateArchivePending,
  } = useTemplatesLibraryModalsState();
  const [autosaveSavedVisible, setAutosaveSavedVisible] = useState(false);
  const lastSavedSnapshotRef = useRef<string>('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialHydrationRef = useRef(true);
  const templateTabSwitchRef = useRef(false);
  const templateArchiveSwitchRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [titleRenameMode, setTitleRenameMode] = useState(false);
  const [placeholdersCollapsed, setPlaceholdersCollapsed] = useState(false);
  const createTemplateHelpWrapRef = useRef<HTMLDivElement>(null);
  const titleRenameInputRef = useRef<HTMLInputElement>(null);
  const templateHtmlFileInputRef = useRef<HTMLInputElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const preferredTemplateIdsRef = useRef<Record<string, string>>({});
  const uiPrefsLoadedRef = useRef(false);

  const templatesScopeKey = useCallback(
    (kind: ContractDocumentPackageKind, tab: PackageLibraryTemplateTabId, archived: boolean) =>
      `${kind}:${tab}:${archived ? 'arch' : 'active'}`,
    []
  );

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
    handleTemplateHtmlFileImport,
    html,
    htmlTextareaRef,
    pushTemplateHistory,
    resetTemplateHistory,
    schedulePushTemplateHistoryFromHtml,
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
    captureHtmlEditorHeight,
    capturePreviewPaneHeight,
    captureVisualEditorHeight,
    commitPreviewZoomDraft,
    commitVisualZoomDraft,
    htmlEditorHeightPx,
    previewPaneHeightPx,
    previewZoomDraft,
    previewZoomPct,
    setHtmlEditorHeightPx,
    setPreviewPaneHeightPx,
    setPreviewZoomDraft,
    setPreviewZoomPct,
    setVisualEditorHeightPx,
    setVisualZoomDraft,
    setVisualZoomPct,
    stepPreviewZoom,
    stepVisualZoom,
    visualEditorHeightPx,
    visualZoomDraft,
    visualZoomPct,
  } = previewUi;

  useEffect(() => {
    if (!titleRenameMode) return;
    const id = window.setTimeout(() => {
      titleRenameInputRef.current?.focus();
      titleRenameInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [titleRenameMode]);

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

  const {
    createTemplateHelpOpen,
    createTemplateHelpPortalReady,
    createTemplateTooltipPos,
    hideCreateTemplateHelpWithDelay,
    showCreateTemplateHelp,
  } = useTemplatesLibraryCreateTemplateHelp({ createTemplateHelpWrapRef });

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
  const {
    renderedPreviewDisplay,
    itemsByActiveTab,
    templatesCountByTab,
    archivedCountOnTab,
    archivedTemplatesCount,
  } = derived;

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

  const {
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
  } = mutations;

  const {
    applyVisualFontSizeFromToolbar,
    captureVisualSelection,
    editorModeToggle,
    formatTools,
    handleSyncHtmlWithVisualEditor,
    handleTemplateRedo,
    handleTemplateUndo,
    handleVisualEditorKeyDown,
    handleVisualEditorPaste,
    headingLevelActive,
    inlineFormatActive,
    insertPlaceholder,
    paragraphAlignActive,
    refreshInlineFormatActiveState,
    renderCleanupToolbar,
    renderListToolbar,
    renderTableStructureToolbar,
    templateHistoryCanRedo,
    templateHistoryCanUndo,
    visualFontSizeControl,
  } = editorFormat;

  const {
    handleActiveLibraryKindChange,
    handlePreviewCustomerKindChange,
    handleRenameTemplateTitle,
    toggleArchiveMode,
    togglePlaceholdersCollapsed,
  } = navigation;

  return {
    activeLibraryKind,
    activeTemplateTab,
    applyVisualFontSizeFromToolbar,
    archivedCountOnTab,
    archivedTemplatesCount,
    autosaveSavedVisible,
    captureHtmlEditorHeight,
    capturePreviewPaneHeight,
    captureVisualEditorHeight,
    captureVisualSelection,
    commitPreviewZoomDraft,
    commitVisualZoomDraft,
    confirmArchiveTemplate,
    confirmMoveTemplateToTrash,
    createNewTemplate,
    createTemplateHelpOpen,
    createTemplateHelpPortalReady,
    createTemplateHelpWrapRef,
    createTemplateTooltipPos,
    editingId,
    editorMode,
    editorModeToggle,
    ensureTemplateDraftForEditing,
    error,
    formatTools,
    handleActiveLibraryKindChange,
    handleActiveTemplateTabChange,
    handleExportSeedJson,
    handlePreviewCustomerKindChange,
    handleRenameTemplateTitle,
    handleSaveNow,
    handleSyncHtmlWithVisualEditor,
    handleTemplateHtmlFileImport,
    handleTemplateRedo,
    handleTemplateUndo,
    handleTrashRestored,
    handleVisualEditorKeyDown,
    handleVisualEditorPaste,
    headingLevelActive,
    hideCreateTemplateHelpWithDelay,
    html,
    htmlEditorHeightPx,
    htmlTextareaRef,
    inlineFormatActive,
    insertPlaceholder,
    isSuperAdmin,
    items,
    itemsByActiveTab,
    libraryTemplateTabIds,
    loading,
    ok,
    paragraphAlignActive,
    placeholdersCollapsed,
    previewCustomerKind,
    previewPaneHeightPx,
    previewPaneRef,
    previewZoomDraft,
    previewZoomPct,
    refreshInlineFormatActiveState,
    refreshTrashCount,
    renderCleanupToolbar,
    renderListToolbar,
    renderTableStructureToolbar,
    renderedPreviewDisplay,
    requestArchiveTemplate,
    requestMoveTemplateToTrash,
    restoreArchivedTemplate,
    saving,
    schedulePushTemplateHistoryFromHtml,
    selectTemplate,
    setHtml,
    setItems,
    setPreviewZoomDraft,
    setTemplateArchivePending,
    setTemplateTrashPending,
    setTitle,
    setTitleRenameMode,
    setTrashOpen,
    setVisualDraftHtml,
    setVisualZoomDraft,
    showArchivedTemplates,
    showCreateTemplateHelp,
    stepPreviewZoom,
    stepVisualZoom,
    syncVisualEditorToHtmlState,
    templateArchiveConfirmMessage,
    templateArchivePending,
    templateHistoryCanRedo,
    templateHistoryCanUndo,
    templateHtmlFileInputRef,
    templateTrashConfirmMessage,
    templateTrashPending,
    templatesCountByTab,
    title,
    titleRenameInputRef,
    titleRenameMode,
    toggleArchiveMode,
    togglePlaceholdersCollapsed,
    trashCount,
    trashOpen,
    visualEditorHeightPx,
    visualEditorRef,
    visualFontSizeControl,
    visualZoomDraft,
    visualZoomPct,
  };
}

export type TemplatesLibraryPageModel = ReturnType<typeof useTemplatesLibraryPage>;
