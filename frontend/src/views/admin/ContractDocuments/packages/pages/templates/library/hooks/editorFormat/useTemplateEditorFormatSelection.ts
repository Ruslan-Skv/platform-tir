'use client';

import { useCallback, useEffect, useState } from 'react';

import { pruneEmptyNoteBlockquotesInEditor } from '@/views/admin/ContractDocuments/core/typography/contractTemplateNoteBlock';
import {
  findTableCellInEditor,
  isCursorInsideHtmlTable,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateTableEditor';

import { type ParagraphTextAlign } from '../../editor/templateEditorFormatToolbar';
import {
  EMPTY_INLINE_FORMAT_ACTIVE,
  type InlineFormatKind,
  isHtmlInlineFormatActive,
} from '../../editor/templateEditorFormattingInline';
import {
  DEFAULT_VISUAL_FONT_SIZE_PT,
  type HeadingLevel,
  getHtmlSelectionHeadingLevel,
  getHtmlSelectionTextAlign,
  getVisualSelectionFontSizePt,
  getVisualSelectionHeadingLevel,
  getVisualSelectionTextAlign,
} from '../../editor/templateEditorFormattingTypography';
import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';

export type TemplateEditorFormatSelection = ReturnType<typeof useTemplateEditorFormatSelection>;

export function useTemplateEditorFormatSelection({
  html,
  setHtml,
  visualDraftHtml: _visualDraftHtml,
  setVisualDraftHtml,
  editorMode,
  visualEditorRef,
  htmlTextareaRef,
  visualSelectionRangeRef,
  pushTemplateHistory,
  cancelPendingTemplateHistoryDebounce,
  setTableEditActive,
}: UseTemplatesLibraryEditorFormatParams) {
  const [inlineFormatActive, setInlineFormatActive] = useState<Record<InlineFormatKind, boolean>>(
    EMPTY_INLINE_FORMAT_ACTIVE
  );
  const [paragraphAlignActive, setParagraphAlignActive] = useState<ParagraphTextAlign | null>(null);
  const [headingLevelActive, setHeadingLevelActive] = useState<HeadingLevel | null>(null);
  const [visualFontSizeControl, setVisualFontSizeControl] = useState<{
    pt: number;
    mixed: boolean;
  }>({ pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false });

  const refreshInlineFormatActiveState = useCallback(() => {
    if (editorMode === 'visual') {
      const editor = visualEditorRef.current;
      if (!editor) {
        setInlineFormatActive(EMPTY_INLINE_FORMAT_ACTIVE);
        setParagraphAlignActive(null);
        setHeadingLevelActive(null);
        setVisualFontSizeControl({ pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false });
        setTableEditActive(false);
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setInlineFormatActive(EMPTY_INLINE_FORMAT_ACTIVE);
        setParagraphAlignActive(null);
        setHeadingLevelActive(null);
        setVisualFontSizeControl({ pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false });
        setTableEditActive(false);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!editor.contains(range.commonAncestorContainer)) {
        setInlineFormatActive(EMPTY_INLINE_FORMAT_ACTIVE);
        setParagraphAlignActive(null);
        setHeadingLevelActive(null);
        setVisualFontSizeControl({ pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false });
        setTableEditActive(false);
        return;
      }
      setInlineFormatActive({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      });
      setParagraphAlignActive(getVisualSelectionTextAlign(editor, range));
      setHeadingLevelActive(getVisualSelectionHeadingLevel(editor, range));
      setVisualFontSizeControl(getVisualSelectionFontSizePt(editor, range));
      setTableEditActive(!!findTableCellInEditor(editor, sel));
      return;
    }
    setVisualFontSizeControl({ pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false });
    const el = htmlTextareaRef.current;
    if (!el) {
      setInlineFormatActive(EMPTY_INLINE_FORMAT_ACTIVE);
      setParagraphAlignActive(null);
      setHeadingLevelActive(null);
      setTableEditActive(false);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    setInlineFormatActive({
      bold: isHtmlInlineFormatActive(html, start, end, 'bold'),
      italic: isHtmlInlineFormatActive(html, start, end, 'italic'),
      underline: isHtmlInlineFormatActive(html, start, end, 'underline'),
    });
    setParagraphAlignActive(getHtmlSelectionTextAlign(html, start, end));
    setHeadingLevelActive(getHtmlSelectionHeadingLevel(html, start, end));
    setTableEditActive(isCursorInsideHtmlTable(html, start));
  }, [editorMode, html, htmlTextareaRef, setTableEditActive, visualEditorRef]);

  const captureVisualSelection = useCallback(() => {
    const editor = visualEditorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    visualSelectionRangeRef.current = range.cloneRange();
  }, [visualEditorRef, visualSelectionRangeRef]);

  const restoreVisualSelection = useCallback((): Range | null => {
    const editor = visualEditorRef.current;
    if (!editor) return null;
    const sel = window.getSelection();
    if (!sel) return null;

    if (sel.rangeCount > 0) {
      const live = sel.getRangeAt(0);
      if (editor.contains(live.commonAncestorContainer)) {
        visualSelectionRangeRef.current = live.cloneRange();
        return live;
      }
    }

    const saved = visualSelectionRangeRef.current;
    if (saved && editor.contains(saved.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(saved);
      return saved;
    }

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    visualSelectionRangeRef.current = range.cloneRange();
    return range;
  }, [visualEditorRef, visualSelectionRangeRef]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (editorMode === 'visual') {
        captureVisualSelection();
      }
      refreshInlineFormatActiveState();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [captureVisualSelection, editorMode, refreshInlineFormatActiveState]);

  useEffect(() => {
    refreshInlineFormatActiveState();
  }, [editorMode, refreshInlineFormatActiveState]);

  const updateHtmlBySelection = (
    transform: (
      selected: string,
      hasSelection: boolean
    ) => { content: string; cursorOffset?: number; selectLength?: number }
  ) => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel) return;

      let range: Range;
      let selected = '';
      let hasSelection = false;

      if (sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        range = sel.getRangeAt(0);
        hasSelection = !range.collapsed;
        selected = range.toString();
      } else {
        el.focus({ preventScroll: true });
        range = restoreVisualSelection() ?? document.createRange();
        hasSelection = !range.collapsed;
        selected = range.toString();
      }

      const result = transform(selected, hasSelection);
      range.deleteContents();
      const fragment = range.createContextualFragment(result.content);
      const lastNode = fragment.lastChild;
      range.insertNode(fragment);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        visualSelectionRangeRef.current = range.cloneRange();
      }

      const next = el.innerHTML;
      setVisualDraftHtml(next);
      setHtml(next);
      pushTemplateHistory(next);
      return;
    }

    const el = htmlTextareaRef.current;
    const current = html;
    if (!el) {
      setHtml((prev) => prev + transform('', false).content);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selected = current.slice(start, end);
    const hasSelection = start !== end;
    const result = transform(selected, hasSelection);
    const next = current.slice(0, start) + result.content + current.slice(end);
    setHtml(next);
    const cursor = start + (result.cursorOffset ?? result.content.length);
    const selectLength = result.selectLength ?? 0;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor + selectLength);
    });
  };

  const syncVisualEditorFromDom = () => {
    cancelPendingTemplateHistoryDebounce();
    const el = visualEditorRef.current;
    if (!el) return;
    pruneEmptyNoteBlockquotesInEditor(el);
    const next = el.innerHTML;
    setVisualDraftHtml(next);
    setHtml(next);
    pushTemplateHistory(next);
    captureVisualSelection();
  };

  return {
    captureVisualSelection,
    headingLevelActive,
    inlineFormatActive,
    paragraphAlignActive,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    syncVisualEditorFromDom,
    updateHtmlBySelection,
    visualFontSizeControl,
    setVisualFontSizeControl,
  };
}
