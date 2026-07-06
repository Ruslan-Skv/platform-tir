'use client';

import { normalizeContractActHandwrittenSignaturesInHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplateActSignatures';
import {
  toggleContractParagraphSpacingInHtmlRange,
  toggleContractParagraphSpacingInHtmlWhole,
  toggleContractParagraphSpacingInVisualDocument,
  toggleContractSpacingOnBlockElements,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateCompactSpacing';
import {
  buildContractActHandwrittenCustomerSignaturesHtml,
  buildContractPartySignaturesHtml,
  buildSimpleContractTableHtml,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateInsertBlocks';
import { buildContractTemplatePageBreakHtml } from '@/views/admin/ContractDocuments/core/typography/contractTemplatePageBreak';
import { collectVisualBlocksInRange } from '@/views/admin/ContractDocuments/core/typography/contractTemplateParagraphAlign';
import {
  addTableColumnAfterCell,
  addTableColumnInHtml,
  addTableRowInHtml,
  focusEditorCaret,
  focusTableCell,
  insertTableRowOrListItemBelowCell,
  resolveTableCellForEditorAction,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateTableEditor';
import { buildPackageContractRequisitesInsertHtmlForToolbar } from '@/views/admin/ContractDocuments/core/typography/packageContractRequisitesLayout';

import {
  applyCaseToHtmlFragment,
  applyCaseToPlainText,
  isSelectionAllUppercaseLetters,
  selectionHasLetters,
  selectionPlainTextForCaseCheck,
} from '../../editor/templateEditorFormattingCase';
import type { TemplateEditorFormatDeps } from './templateEditorFormatDeps';

export type TemplateEditorFormatBlocks = ReturnType<typeof useTemplateEditorFormatBlocks>;

export function useTemplateEditorFormatBlocks(deps: TemplateEditorFormatDeps) {
  const {
    captureVisualSelection,
    editorMode,
    ensureTemplateDraftForEditing,
    html,
    htmlTextareaRef,
    isSuperAdmin,
    pushTemplateHistory,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    setError,
    setHtml,
    setOk,
    setVisualDraftHtml,
    syncVisualEditorFromDom,
    cancelPendingTemplateHistoryDebounce,
    updateHtmlBySelection,
    visualEditorRef,
    visualSelectionRangeRef,
  } = deps;

  const insertHorizontalRule = () =>
    updateHtmlBySelection(() => ({
      content:
        '<hr style="border: 0; border-top: 1px solid var(--admin-border-strong); margin: 12pt 0;" />',
    }));

  const insertPageBreak = () =>
    updateHtmlBySelection(() => ({ content: buildContractTemplatePageBreakHtml() }));

  const clearFormattingInSelection = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed || !el.contains(range.commonAncestorContainer)) {
        setError('Выделите фрагмент текста, с которого нужно снять форматирование.');
        return;
      }
      document.execCommand('removeFormat');
      document.execCommand('unlink');
      const next = el.innerHTML;
      setVisualDraftHtml(next);
      setHtml(next);
      pushTemplateHistory(next);
      captureVisualSelection();
      setError(null);
      setOk('Форматирование снято с выделенного фрагмента.');
      return;
    }

    const el = htmlTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    if (start === end) {
      setError('Выделите фрагмент в HTML, с которого нужно снять форматирование.');
      return;
    }
    const selected = html.slice(start, end);
    const cleaned = selected.replace(/<[^>]+>/g, '').trim();
    const next = html.slice(0, start) + (cleaned || 'текст') + html.slice(end);
    setHtml(next);
    setError(null);
    setOk('Форматирование снято с выделенного фрагмента.');
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + (cleaned || 'текст').length);
    });
  };

  const toggleUppercaseSelection = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (range.collapsed || !el.contains(range.commonAncestorContainer)) return;
      const text = range.toString();
      if (!selectionHasLetters(text)) return;
      const mode = isSelectionAllUppercaseLetters(text) ? 'lower' : 'upper';
      const nextText = applyCaseToPlainText(text, mode);
      range.deleteContents();
      const textNode = document.createTextNode(nextText);
      range.insertNode(textNode);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(textNode);
      sel.removeAllRanges();
      sel.addRange(nextRange);
      visualSelectionRangeRef.current = nextRange.cloneRange();
      const next = el.innerHTML;
      setVisualDraftHtml(next);
      setHtml(next);
      pushTemplateHistory(next);
      return;
    }

    const el = htmlTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    if (start === end) return;
    const selected = html.slice(start, end);
    const plainForCheck = selectionPlainTextForCaseCheck(selected);
    if (!selectionHasLetters(plainForCheck)) return;
    const mode = isSelectionAllUppercaseLetters(plainForCheck) ? 'lower' : 'upper';
    const next = applyCaseToHtmlFragment(selected, mode);
    const updated = html.slice(0, start) + next + html.slice(end);
    setHtml(updated);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, start + next.length);
    });
  };

  const contractSpacingToggleMessage = (result: {
    dense: boolean;
    blockCount: number;
    scope: 'document' | 'selection';
  }): string => {
    const action = result.dense ? 'Уплотнены' : 'Увеличены';
    if (result.scope === 'selection' && result.blockCount > 0) {
      return `${action} интервалы в ${result.blockCount} абзац(ах) выделения. Повторный клик — обратно.`;
    }
    return `${action} интервалы во всём договоре. Повторный клик — обратно.`;
  };

  const applyCompactContractSpacing = () => {
    if (!isSuperAdmin) return;
    ensureTemplateDraftForEditing();

    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      const sel = window.getSelection();
      const range =
        sel && sel.rangeCount > 0 && el.contains(sel.getRangeAt(0).commonAncestorContainer)
          ? sel.getRangeAt(0)
          : null;
      const hasTextSelection = Boolean(range && !range.collapsed);

      syncVisualEditorFromDom();
      const result = hasTextSelection
        ? toggleContractSpacingOnBlockElements(collectVisualBlocksInRange(el, range!), el.innerHTML)
        : toggleContractParagraphSpacingInVisualDocument(el);

      pushTemplateHistory(el.innerHTML);
      setOk(contractSpacingToggleMessage(result));
      return;
    }

    const textarea = htmlTextareaRef.current;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? start;
    const hasTextSelection = start !== end;

    if (hasTextSelection) {
      const toggled = toggleContractParagraphSpacingInHtmlRange(html, start, end);
      setHtml(toggled.html);
      setVisualDraftHtml(toggled.html);
      pushTemplateHistory(toggled.html);
      window.requestAnimationFrame(() => {
        textarea?.focus();
        textarea?.setSelectionRange(start, end);
      });
      setOk(contractSpacingToggleMessage(toggled));
      return;
    }

    const whole = toggleContractParagraphSpacingInHtmlWhole(html);
    setHtml(whole.html);
    setVisualDraftHtml(whole.html);
    pushTemplateHistory(whole.html);
    setOk(contractSpacingToggleMessage(whole));
  };

  const insertSignatureLines = () =>
    updateHtmlBySelection(() => ({
      content: buildContractPartySignaturesHtml(),
    }));

  const insertActHandwrittenCustomerSignatures = () => {
    updateHtmlBySelection(() => ({
      content: buildContractActHandwrittenCustomerSignaturesHtml(),
    }));
    if (editorMode !== 'visual') return;
    window.requestAnimationFrame(() => {
      const el = visualEditorRef.current;
      if (!el) return;
      const fixed = normalizeContractActHandwrittenSignaturesInHtml(el.innerHTML);
      if (fixed === el.innerHTML) return;
      el.innerHTML = fixed;
      setVisualDraftHtml(fixed);
      setHtml(fixed);
      pushTemplateHistory(fixed);
    });
  };

  const insertRequisitesTemplate = () =>
    updateHtmlBySelection(() => ({
      content: buildPackageContractRequisitesInsertHtmlForToolbar(),
    }));

  const insertQuoteBlock = () =>
    updateHtmlBySelection(() => ({
      content: `<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid var(--admin-border-strong); background: var(--admin-surface-muted);">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`,
    }));

  const insertSimpleTable = () => {
    updateHtmlBySelection(() => ({
      content: buildSimpleContractTableHtml(),
    }));
    if (editorMode === 'visual') {
      window.requestAnimationFrame(() => {
        const editor = visualEditorRef.current;
        if (!editor) return;
        const cell = editor.querySelector('table td, table th');
        if (cell instanceof HTMLTableCellElement) {
          focusTableCell(editor, cell);
          captureVisualSelection();
        }
      });
    }
  };

  const handleAddTableRow = () => {
    if (!isSuperAdmin) return;
    if (editorMode === 'visual') {
      const editor = visualEditorRef.current;
      if (!editor) return;
      const cell = resolveTableCellForEditorAction(
        editor,
        window.getSelection(),
        visualSelectionRangeRef.current
      );
      if (!cell) {
        setError('Поставьте курсор в ячейку таблицы, затем нажмите «+стр» или Ctrl+Enter.');
        return;
      }
      cancelPendingTemplateHistoryDebounce();
      pushTemplateHistory(editor.innerHTML);
      const next = insertTableRowOrListItemBelowCell(cell, window.getSelection());
      focusEditorCaret(editor, next);
      syncVisualEditorFromDom();
      setError(null);
      return;
    }
    const textarea = htmlTextareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? 0;
    cancelPendingTemplateHistoryDebounce();
    pushTemplateHistory(html);
    const next = addTableRowInHtml(html, cursor);
    if (!next) {
      setError('Поставьте курсор внутрь таблицы (<table>…</table>), затем нажмите «+стр».');
      return;
    }
    setHtml(next);
    setVisualDraftHtml(next);
    pushTemplateHistory(next);
    setError(null);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
      refreshInlineFormatActiveState();
    });
  };

  const handleAddTableColumn = () => {
    if (!isSuperAdmin) return;
    if (editorMode === 'visual') {
      const editor = visualEditorRef.current;
      if (!editor) return;
      const cell = resolveTableCellForEditorAction(
        editor,
        window.getSelection(),
        visualSelectionRangeRef.current
      );
      if (!cell) {
        setError('Поставьте курсор в ячейку таблицы, затем нажмите «+стб».');
        return;
      }
      const nextCell = addTableColumnAfterCell(cell);
      focusTableCell(editor, nextCell);
      syncVisualEditorFromDom();
      setError(null);
      return;
    }
    const textarea = htmlTextareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? 0;
    const next = addTableColumnInHtml(html, cursor);
    if (!next) {
      setError('Поставьте курсор внутрь таблицы (<table>…</table>), затем нажмите «+стб».');
      return;
    }
    setHtml(next);
    setError(null);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
      refreshInlineFormatActiveState();
    });
  };

  return {
    applyCompactContractSpacing,
    clearFormattingInSelection,
    handleAddTableColumn,
    handleAddTableRow,
    insertActHandwrittenCustomerSignatures,
    insertHorizontalRule,
    insertPageBreak,
    insertQuoteBlock,
    insertRequisitesTemplate,
    insertSignatureLines,
    insertSimpleTable,
    toggleUppercaseSelection,
  };
}
