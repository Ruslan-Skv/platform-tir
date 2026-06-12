import { type RefObject, useEffect, useRef } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  type PackageLibraryTemplateTabId,
  normalizeLibraryTemplateTabForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { clampTemplateEditorZoomPct } from '@/views/admin/ContractDocuments/packages/platform/templateEditorHistory';

import { clampInt } from '../templatesLibraryHtmlNormalize';
import { TEMPLATE_LIBRARY_KIND_OPTIONS } from '../templatesLibraryPresetUtils';
import {
  TEMPLATES_ACTIVE_KIND_KEY,
  TEMPLATES_ACTIVE_TAB_KEY,
  TEMPLATES_ARCHIVE_MODE_KEY,
  TEMPLATES_EDITOR_MODE_KEY,
  TEMPLATES_HTML_HEIGHT_KEY,
  TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY,
  TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY,
  TEMPLATES_PREVIEW_HEIGHT_KEY,
  TEMPLATES_PREVIEW_ZOOM_KEY,
  TEMPLATES_UI_PREFS_KEY,
  TEMPLATES_VISUAL_HEIGHT_KEY,
  TEMPLATES_VISUAL_ZOOM_KEY,
  type TemplatesUiPrefs,
} from '../templatesLibraryStorage';

type UseTemplatesLibraryUiPrefsSyncArgs = {
  previewZoomPct: number;
  visualZoomPct: number;
  editorMode: 'html' | 'visual';
  htmlEditorHeightPx: number | null;
  visualEditorHeightPx: number | null;
  previewPaneHeightPx: number | null;
  activeLibraryKind: ContractDocumentPackageKind;
  activeTemplateTab: PackageLibraryTemplateTabId;
  previewCustomerKind: PackageTemplatePreviewCustomerKind;
  showArchivedTemplates: boolean;
  placeholdersCollapsed: boolean;
  setPreviewZoomPct: (value: number) => void;
  setVisualZoomPct: (value: number) => void;
  setEditorMode: (value: 'html' | 'visual') => void;
  setHtmlEditorHeightPx: (value: number | null) => void;
  setVisualEditorHeightPx: (value: number | null) => void;
  setPreviewPaneHeightPx: (value: number | null) => void;
  setActiveLibraryKind: (value: ContractDocumentPackageKind) => void;
  setActiveTemplateTab: (value: PackageLibraryTemplateTabId) => void;
  setPreviewCustomerKind: (value: PackageTemplatePreviewCustomerKind) => void;
  setShowArchivedTemplates: (value: boolean) => void;
  setPlaceholdersCollapsed: (value: boolean) => void;
  preferredTemplateIdsRef: RefObject<Record<string, string>>;
  visualEditorRef: RefObject<HTMLDivElement | null>;
  previewPaneRef: RefObject<HTMLDivElement | null>;
  htmlTextareaRef: RefObject<HTMLTextAreaElement | null>;
  uiPrefsLoadedRef: RefObject<boolean>;
};

export function useTemplatesLibraryUiPrefsSync({
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
}: UseTemplatesLibraryUiPrefsSyncArgs) {
  const skipInitialUiPrefsPersistRef = useRef(true);
  const skipInitialSizingPersistRef = useRef(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
      const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : null;
      if (parsed && typeof parsed.previewZoomPct === 'number') {
        setPreviewZoomPct(clampTemplateEditorZoomPct(parsed.previewZoomPct));
      }
      const previewZoomRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_ZOOM_KEY);
      if (previewZoomRaw != null && Number.isFinite(Number(previewZoomRaw))) {
        setPreviewZoomPct(clampTemplateEditorZoomPct(Number(previewZoomRaw)));
      }
      if (parsed && typeof parsed.visualZoomPct === 'number') {
        setVisualZoomPct(clampTemplateEditorZoomPct(parsed.visualZoomPct));
      }
      const visualZoomRaw = window.localStorage.getItem(TEMPLATES_VISUAL_ZOOM_KEY);
      if (visualZoomRaw != null && Number.isFinite(Number(visualZoomRaw))) {
        setVisualZoomPct(clampTemplateEditorZoomPct(Number(visualZoomRaw)));
      }
      if (parsed && typeof parsed.visualEditorHeightPx === 'number') {
        setVisualEditorHeightPx(clampInt(parsed.visualEditorHeightPx, 220, 2400));
      }
      const visualHeightRaw = window.localStorage.getItem(TEMPLATES_VISUAL_HEIGHT_KEY);
      if (visualHeightRaw != null && Number.isFinite(Number(visualHeightRaw))) {
        setVisualEditorHeightPx(clampInt(Number(visualHeightRaw), 220, 2400));
      }
      if (parsed && typeof parsed.previewPaneHeightPx === 'number') {
        setPreviewPaneHeightPx(clampInt(parsed.previewPaneHeightPx, 220, 2400));
      }
      const previewHeightRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_HEIGHT_KEY);
      if (previewHeightRaw != null && Number.isFinite(Number(previewHeightRaw))) {
        setPreviewPaneHeightPx(clampInt(Number(previewHeightRaw), 220, 2400));
      }
      if (parsed && (parsed.editorMode === 'html' || parsed.editorMode === 'visual')) {
        setEditorMode(parsed.editorMode);
      }
      const editorModeRaw = window.localStorage.getItem(TEMPLATES_EDITOR_MODE_KEY);
      if (editorModeRaw === 'html' || editorModeRaw === 'visual') {
        setEditorMode(editorModeRaw);
      }
      if (parsed && typeof parsed.htmlEditorHeightPx === 'number') {
        setHtmlEditorHeightPx(clampInt(parsed.htmlEditorHeightPx, 220, 2400));
      }
      const htmlHeightRaw = window.localStorage.getItem(TEMPLATES_HTML_HEIGHT_KEY);
      if (htmlHeightRaw != null && Number.isFinite(Number(htmlHeightRaw))) {
        setHtmlEditorHeightPx(clampInt(Number(htmlHeightRaw), 220, 2400));
      }
      let hydratedLibraryKind: ContractDocumentPackageKind = 'REPAIR';
      if (
        parsed &&
        parsed.activeLibraryKind &&
        TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === parsed.activeLibraryKind)
      ) {
        hydratedLibraryKind = parsed.activeLibraryKind;
      }
      const activeKindRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_KIND_KEY);
      if (activeKindRaw && TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === activeKindRaw)) {
        hydratedLibraryKind = activeKindRaw as ContractDocumentPackageKind;
      }
      setActiveLibraryKind(hydratedLibraryKind);
      if (parsed && typeof parsed.activeTemplateTab === 'string') {
        setActiveTemplateTab(
          normalizeLibraryTemplateTabForPackageKind(parsed.activeTemplateTab, hydratedLibraryKind)
        );
      }
      const activeTabRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_TAB_KEY);
      if (typeof activeTabRaw === 'string' && activeTabRaw.trim()) {
        setActiveTemplateTab(
          normalizeLibraryTemplateTabForPackageKind(activeTabRaw, hydratedLibraryKind)
        );
      }
      if (
        (parsed && parsed.previewCustomerKind === 'PERSON') ||
        (parsed && parsed.previewCustomerKind === 'COMPANY') ||
        (parsed && parsed.previewCustomerKind === 'ENTREPRENEUR')
      ) {
        setPreviewCustomerKind(parsed.previewCustomerKind as PackageTemplatePreviewCustomerKind);
      }
      const previewKindRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY);
      if (
        previewKindRaw === 'PERSON' ||
        previewKindRaw === 'COMPANY' ||
        previewKindRaw === 'ENTREPRENEUR'
      ) {
        setPreviewCustomerKind(previewKindRaw);
      }
      if (parsed && typeof parsed.showArchivedTemplates === 'boolean') {
        setShowArchivedTemplates(parsed.showArchivedTemplates);
      }
      const archiveModeRaw = window.localStorage.getItem(TEMPLATES_ARCHIVE_MODE_KEY);
      if (archiveModeRaw === '1') setShowArchivedTemplates(true);
      else if (archiveModeRaw === '0') setShowArchivedTemplates(false);
      const collapsedRaw = window.localStorage.getItem(TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY);
      if (collapsedRaw === '1') setPlaceholdersCollapsed(true);
      else if (collapsedRaw === '0') setPlaceholdersCollapsed(false);
      else if (parsed && typeof parsed.placeholdersCollapsed === 'boolean') {
        setPlaceholdersCollapsed(parsed.placeholdersCollapsed);
      }
      if (parsed?.selectedTemplateByScope && typeof parsed.selectedTemplateByScope === 'object') {
        preferredTemplateIdsRef.current = parsed.selectedTemplateByScope;
      }
    } catch {
      // ignore broken localStorage payload
    } finally {
      uiPrefsLoadedRef.current = true;
    }
  }, [
    preferredTemplateIdsRef,
    setActiveLibraryKind,
    setActiveTemplateTab,
    setEditorMode,
    setHtmlEditorHeightPx,
    setPlaceholdersCollapsed,
    setPreviewCustomerKind,
    setPreviewPaneHeightPx,
    setPreviewZoomPct,
    setShowArchivedTemplates,
    setVisualEditorHeightPx,
    setVisualZoomPct,
    uiPrefsLoadedRef,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!uiPrefsLoadedRef.current) return;
    if (skipInitialUiPrefsPersistRef.current) {
      skipInitialUiPrefsPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(TEMPLATES_PREVIEW_ZOOM_KEY, String(previewZoomPct));
      window.localStorage.setItem(TEMPLATES_VISUAL_ZOOM_KEY, String(visualZoomPct));
      if (visualEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(visualEditorHeightPx));
      }
      if (previewPaneHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(previewPaneHeightPx));
      }
      window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
      if (htmlEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightPx));
      }
      window.localStorage.setItem(
        TEMPLATES_UI_PREFS_KEY,
        JSON.stringify({
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
          selectedTemplateByScope: preferredTemplateIdsRef.current,
        })
      );
    } catch {
      // ignore localStorage write issues
    }
  }, [
    activeLibraryKind,
    activeTemplateTab,
    editorMode,
    htmlEditorHeightPx,
    placeholdersCollapsed,
    preferredTemplateIdsRef,
    previewCustomerKind,
    previewPaneHeightPx,
    previewZoomPct,
    showArchivedTemplates,
    visualEditorHeightPx,
    visualZoomPct,
    uiPrefsLoadedRef,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!uiPrefsLoadedRef.current) return;
    if (skipInitialSizingPersistRef.current) {
      skipInitialSizingPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(TEMPLATES_PREVIEW_ZOOM_KEY, String(previewZoomPct));
      window.localStorage.setItem(TEMPLATES_VISUAL_ZOOM_KEY, String(visualZoomPct));
      if (visualEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(visualEditorHeightPx));
      }
      if (previewPaneHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(previewPaneHeightPx));
      }
      window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
      if (htmlEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightPx));
      }
    } catch {
      // ignore localStorage write issues
    }
  }, [
    editorMode,
    htmlEditorHeightPx,
    previewPaneHeightPx,
    previewZoomPct,
    visualEditorHeightPx,
    visualZoomPct,
    uiPrefsLoadedRef,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistOnUnload = () => {
      if (!uiPrefsLoadedRef.current) return;
      try {
        const visualEditorHeightSnapshot =
          visualEditorRef.current?.offsetHeight && visualEditorRef.current.offsetHeight > 0
            ? clampInt(visualEditorRef.current.offsetHeight, 220, 2400)
            : visualEditorHeightPx;
        const previewPaneHeightSnapshot =
          previewPaneRef.current?.offsetHeight && previewPaneRef.current.offsetHeight > 0
            ? clampInt(previewPaneRef.current.offsetHeight, 220, 2400)
            : previewPaneHeightPx;
        const htmlEditorHeightSnapshot =
          htmlTextareaRef.current?.offsetHeight && htmlTextareaRef.current.offsetHeight > 0
            ? clampInt(htmlTextareaRef.current.offsetHeight, 220, 2400)
            : htmlEditorHeightPx;
        window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
        if (htmlEditorHeightSnapshot != null) {
          window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightSnapshot));
        }
        window.localStorage.setItem(
          TEMPLATES_UI_PREFS_KEY,
          JSON.stringify({
            previewZoomPct,
            visualZoomPct,
            editorMode,
            htmlEditorHeightPx: htmlEditorHeightSnapshot,
            visualEditorHeightPx: visualEditorHeightSnapshot,
            previewPaneHeightPx: previewPaneHeightSnapshot,
            activeLibraryKind,
            activeTemplateTab,
            previewCustomerKind,
            showArchivedTemplates,
            placeholdersCollapsed,
            selectedTemplateByScope: preferredTemplateIdsRef.current,
          })
        );
      } catch {
        // ignore
      }
    };
    window.addEventListener('beforeunload', persistOnUnload);
    return () => window.removeEventListener('beforeunload', persistOnUnload);
  }, [
    activeLibraryKind,
    activeTemplateTab,
    editorMode,
    htmlEditorHeightPx,
    htmlTextareaRef,
    placeholdersCollapsed,
    preferredTemplateIdsRef,
    previewCustomerKind,
    previewPaneHeightPx,
    previewPaneRef,
    previewZoomPct,
    showArchivedTemplates,
    visualEditorHeightPx,
    visualEditorRef,
    visualZoomPct,
    uiPrefsLoadedRef,
  ]);
}
