import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';

export function pickTemplateEditorFormatDeps(
  params: UseTemplatesLibraryEditorFormatParams,
  selection: TemplateEditorFormatSelection
) {
  const {
    isSuperAdmin,
    html,
    setHtml,
    visualDraftHtml,
    setVisualDraftHtml,
    editorMode,
    setOk,
    setError,
    visualEditorRef,
    htmlTextareaRef,
    visualSelectionRangeRef,
    pushTemplateHistory,
    cancelPendingTemplateHistoryDebounce,
    applyTemplateHistorySnapshot,
    templateHistoryIndex,
    templateHistory,
    templateHistoryRef,
    templateHistoryIndexRef,
    setTemplateHistoryIndex,
    ensureTemplateDraftForEditing,
    syncVisualEditorToHtmlState,
  } = params;

  const {
    captureVisualSelection,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    syncVisualEditorFromDom,
    updateHtmlBySelection,
    setVisualFontSizeControl,
  } = selection;

  return {
    applyTemplateHistorySnapshot,
    captureVisualSelection,
    editorMode,
    ensureTemplateDraftForEditing,
    html,
    htmlTextareaRef,
    isSuperAdmin,
    pushTemplateHistory,
    cancelPendingTemplateHistoryDebounce,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    setEditorMode: params.setEditorMode,
    setError,
    setHtml,
    setOk,
    setTemplateHistoryIndex,
    setVisualDraftHtml,
    setVisualFontSizeControl,
    syncVisualEditorFromDom,
    syncVisualEditorToHtmlState,
    templateHistory,
    templateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
    updateHtmlBySelection,
    visualDraftHtml,
    visualEditorRef,
    visualSelectionRangeRef,
  };
}

export type TemplateEditorFormatDeps = ReturnType<typeof pickTemplateEditorFormatDeps>;
