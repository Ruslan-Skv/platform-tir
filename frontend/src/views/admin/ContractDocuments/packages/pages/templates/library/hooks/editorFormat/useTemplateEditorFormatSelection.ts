'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  findTableCellInEditor,
  isCursorInsideHtmlTable,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateTableEditor';

import { type ParagraphTextAlign } from '../../editor/templateEditorFormatToolbar';
import {
  DEFAULT_VISUAL_FONT_SIZE_PT,
  EMPTY_INLINE_FORMAT_ACTIVE,
  type HeadingLevel,
  type InlineFormatKind,
  getHtmlSelectionHeadingLevel,
  getHtmlSelectionTextAlign,
  getVisualSelectionFontSizePt,
  getVisualSelectionHeadingLevel,
  getVisualSelectionTextAlign,
  isHtmlInlineFormatActive,
} from '../../editor/templateEditorFormatting';
import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';

export type TemplateEditorFormatSelection = ReturnType<typeof useTemplateEditorFormatSelection>;

export function useTemplateEditorFormatSelection({
  html,
  setHtml,
  visualDraftHtml,
  setVisualDraftHtml,
  editorMode,
  visualEditorRef,
  htmlTextareaRef,
  visualSelectionRangeRef,
  pushTemplateHistory,
  setTableEditActive,
}: UseTemplatesLibraryEditorFormatParams) {
  const readVisualEditorHtml = (): string => visualEditorRef.current?.innerHTML ?? visualDraftHtml;

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
  }, [editorMode, html]);

  useEffect(() => {
    const onSelectionChange = () => {
      refreshInlineFormatActiveState();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [refreshInlineFormatActiveState]);

  useEffect(() => {
    refreshInlineFormatActiveState();
  }, [editorMode, refreshInlineFormatActiveState]);

  const captureVisualSelection = () => {
    const editor = visualEditorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    visualSelectionRangeRef.current = range.cloneRange();
    refreshInlineFormatActiveState();
  };

  const restoreVisualSelection = (): Range | null => {
    const editor = visualEditorRef.current;
    if (!editor) return null;
    const sel = window.getSelection();
    if (!sel) return null;
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
    return range;
  };

  const updateHtmlBySelection = (
    transform: (
      selected: string,
      hasSelection: boolean
    ) => { content: string; cursorOffset?: number; selectLength?: number }
  ) => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
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
    const el = visualEditorRef.current;
    if (!el) return;
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
