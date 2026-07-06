'use client';

import { useCallback, useEffect } from 'react';

import {
  normalizeContractTemplateTypography,
  sanitizePastedContractHtml,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';

import { normalizeTemplateHtmlWhitespace } from '../../templatesLibraryHtmlNormalize';
import { type NormalizeMode } from '../../templatesLibraryStorage';
import type { TemplateEditorFormatDeps } from './templateEditorFormatDeps';

export type TemplateEditorFormatHistory = ReturnType<typeof useTemplateEditorFormatHistory>;

export function useTemplateEditorFormatHistory(deps: TemplateEditorFormatDeps) {
  const {
    applyTemplateHistorySnapshot,
    captureVisualSelection,
    editorMode,
    html,
    isSuperAdmin,
    pushTemplateHistory,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    setHtml,
    setOk,
    setTemplateHistoryIndex,
    setVisualDraftHtml,
    templateHistory,
    templateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
    visualDraftHtml,
    visualEditorRef,
  } = deps;

  const templateHistoryCanUndo = templateHistoryIndex > 0;
  const templateHistoryCanRedo =
    templateHistoryIndex >= 0 && templateHistoryIndex < templateHistory.length - 1;

  const handleTemplateUndo = useCallback(() => {
    if (!isSuperAdmin) return;
    if (templateHistoryIndexRef.current <= 0) return;
    const nextIndex = templateHistoryIndexRef.current - 1;
    const snapshot = templateHistoryRef.current[nextIndex] ?? '';
    templateHistoryIndexRef.current = nextIndex;
    setTemplateHistoryIndex(nextIndex);
    applyTemplateHistorySnapshot(snapshot);
  }, [
    applyTemplateHistorySnapshot,
    isSuperAdmin,
    setTemplateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
  ]);

  const handleTemplateRedo = useCallback(() => {
    if (!isSuperAdmin) return;
    if (
      templateHistoryIndexRef.current < 0 ||
      templateHistoryIndexRef.current >= templateHistoryRef.current.length - 1
    ) {
      return;
    }
    const nextIndex = templateHistoryIndexRef.current + 1;
    const snapshot = templateHistoryRef.current[nextIndex] ?? '';
    templateHistoryIndexRef.current = nextIndex;
    setTemplateHistoryIndex(nextIndex);
    applyTemplateHistorySnapshot(snapshot);
  }, [
    applyTemplateHistorySnapshot,
    isSuperAdmin,
    setTemplateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
  ]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      if (e.key === 'z' && !e.shiftKey) {
        if (templateHistoryIndexRef.current <= 0) return;
        e.preventDefault();
        handleTemplateUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        if (templateHistoryIndexRef.current >= templateHistoryRef.current.length - 1) return;
        e.preventDefault();
        handleTemplateRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleTemplateRedo,
    handleTemplateUndo,
    isSuperAdmin,
    templateHistoryIndexRef,
    templateHistoryRef,
  ]);

  const normalizeContractTypographyInEditor = () => {
    const source =
      editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? visualDraftHtml) : html;
    const next = normalizeContractTemplateTypography(source);
    if (!next || next === source) {
      setOk('Типографика уже соответствует стандарту договора (10pt, Times New Roman).');
      return;
    }
    setVisualDraftHtml(next);
    setHtml(next);
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = next;
    }
    pushTemplateHistory(next);
    setOk(
      'Шрифты приведены к стандарту договора: убраны стили Word, единый кегль в предпросмотре и печати.'
    );
  };

  const handleVisualEditorPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isSuperAdmin || editorMode !== 'visual') return;
    e.preventDefault();
    const el = visualEditorRef.current;
    if (!el) return;

    const pastedHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain');
    const sanitized = pastedHtml.trim()
      ? sanitizePastedContractHtml(pastedHtml)
      : pastedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (!sanitized) return;

    const sel = window.getSelection();
    if (!sel) return;
    let range: Range | null = null;
    if (sel.rangeCount > 0) {
      const live = sel.getRangeAt(0);
      if (el.contains(live.commonAncestorContainer)) {
        range = live;
      }
    }
    if (!range) {
      range = restoreVisualSelection();
    }
    if (!range) return;

    range.deleteContents();
    const fragment = range.createContextualFragment(sanitized);
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    const next = el.innerHTML;
    setVisualDraftHtml(next);
    setHtml(next);
    pushTemplateHistory(next);
    captureVisualSelection();
    window.requestAnimationFrame(() => refreshInlineFormatActiveState());
  };

  const normalizeTemplateText = (mode: NormalizeMode) => {
    const source = editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? html) : html;
    const next = normalizeTemplateHtmlWhitespace(source, mode);
    if (!next || next === source) {
      setOk('Лишние пробелы и пустые строки не обнаружены.');
      return;
    }
    setVisualDraftHtml(next);
    setHtml(next);
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = next;
    }
    pushTemplateHistory(next);
    setOk(
      mode === 'strict'
        ? 'Выполнена строгая нормализация: очищены пробелы, пустые строки и выровнены абзацы.'
        : 'Выполнена мягкая нормализация: убраны лишние пробелы и пустые строки.'
    );
  };

  return {
    handleTemplateRedo,
    handleTemplateUndo,
    handleVisualEditorPaste,
    normalizeContractTypographyInEditor,
    normalizeTemplateText,
    templateHistoryCanRedo,
    templateHistoryCanUndo,
  };
}
