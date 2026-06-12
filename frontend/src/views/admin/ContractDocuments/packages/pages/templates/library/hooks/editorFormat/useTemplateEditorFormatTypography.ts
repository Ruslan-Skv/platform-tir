import {
  applyHtmlParagraphAlign,
  applyVisualParagraphAlign,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateParagraphAlign';

import {
  INLINE_FORMAT_EXEC,
  INLINE_FORMAT_TAGS,
  INLINE_FORMAT_WRAP,
  type InlineFormatKind,
  toggleVisualBoldInEditor,
  toggleVisualItalicInEditor,
  tryUnwrapHtmlFontStyleItalic,
  tryUnwrapHtmlFontWeightBold,
  tryUnwrapHtmlInlineTags,
} from '../../editor/templateEditorFormattingInline';
import {
  applyHtmlParagraphIndentCm,
  applyVisualFontSizePt,
  applyVisualLineSpacing,
  applyVisualParagraphIndent,
} from '../../editor/templateEditorFormattingTypography';
import { normalizeTemplateEditorHtml } from '../../templatesLibraryHtmlNormalize';
import type { TemplateEditorFormatDeps } from './templateEditorFormatDeps';

export type TemplateEditorFormatTypography = ReturnType<typeof useTemplateEditorFormatTypography>;

export function useTemplateEditorFormatTypography(deps: TemplateEditorFormatDeps) {
  const {
    captureVisualSelection,
    editorMode,
    html,
    htmlTextareaRef,
    isSuperAdmin,
    pushTemplateHistory,
    refreshInlineFormatActiveState,
    restoreVisualSelection,
    setEditorMode,
    setHtml,
    setVisualDraftHtml,
    setVisualFontSizeControl,
    syncVisualEditorFromDom,
    syncVisualEditorToHtmlState,
    updateHtmlBySelection,
    visualEditorRef,
  } = deps;

  const handleSyncHtmlWithVisualEditor = () => {
    if (!isSuperAdmin) return;
    if (editorMode === 'visual') {
      const next = syncVisualEditorToHtmlState();
      pushTemplateHistory(next);
    } else {
      const normalized = normalizeTemplateEditorHtml(html);
      setVisualDraftHtml(normalized);
      setHtml(normalized);
      pushTemplateHistory(normalized);
      setEditorMode('visual');
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = normalized || '';
      }
    }
  };

  const insertPlaceholder = (path: string) => {
    updateHtmlBySelection((selected, hasSelection) => ({
      content: hasSelection ? selected + `{{${path}}}` : `{{${path}}}`,
    }));
  };

  const wrapSelection = (before: string, after: string, placeholder = 'текст') => {
    updateHtmlBySelection((selected, hasSelection) => ({
      content: `${before}${hasSelection ? selected : placeholder}${after}`,
      cursorOffset: hasSelection ? before.length + selected.length + after.length : before.length,
      selectLength: hasSelection ? 0 : placeholder.length,
    }));
  };

  const toggleInlineFormat = (kind: InlineFormatKind) => {
    const { before, after, placeholder } = INLINE_FORMAT_WRAP[kind];

    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      if (kind === 'bold') {
        toggleVisualBoldInEditor(el);
      } else if (kind === 'italic') {
        toggleVisualItalicInEditor(el);
      } else {
        document.execCommand(INLINE_FORMAT_EXEC[kind]);
      }
      const next = el.innerHTML;
      setVisualDraftHtml(next);
      setHtml(next);
      pushTemplateHistory(next);
      captureVisualSelection();
      window.requestAnimationFrame(() => refreshInlineFormatActiveState());
      return;
    }

    const el = htmlTextareaRef.current;
    const current = html;
    if (!el) {
      wrapSelection(before, after, placeholder);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const unwrapped =
      tryUnwrapHtmlInlineTags(current, start, end, INLINE_FORMAT_TAGS[kind]) ??
      (kind === 'bold'
        ? tryUnwrapHtmlFontWeightBold(current, start, end)
        : kind === 'italic'
          ? tryUnwrapHtmlFontStyleItalic(current, start, end)
          : null);
    if (unwrapped) {
      setHtml(unwrapped.next);
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(unwrapped.cursor, unwrapped.cursor + unwrapped.selectLength);
        refreshInlineFormatActiveState();
      });
      return;
    }
    wrapSelection(before, after, placeholder);
    window.requestAnimationFrame(() => refreshInlineFormatActiveState());
  };

  const applyVisualFontSizeFromToolbar = (sizePt: number) => {
    if (editorMode !== 'visual' || !Number.isFinite(sizePt) || sizePt <= 0) return;
    const el = visualEditorRef.current;
    if (!el) return;
    el.focus();
    restoreVisualSelection();
    applyVisualFontSizePt(el, sizePt);
    const next = el.innerHTML;
    setVisualDraftHtml(next);
    setHtml(next);
    pushTemplateHistory(next);
    setVisualFontSizeControl({ pt: sizePt, mixed: false });
    captureVisualSelection();
    window.requestAnimationFrame(() => refreshInlineFormatActiveState());
  };

  const wrapParagraphWithAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      applyVisualParagraphAlign(el, align);
      syncVisualEditorFromDom();
      window.requestAnimationFrame(() => refreshInlineFormatActiveState());
      return;
    }

    const textarea = htmlTextareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const next = applyHtmlParagraphAlign(html, start, end, align);
    if (next === html) return;
    setHtml(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
      refreshInlineFormatActiveState();
    });
  };

  const applyParagraphIndentCm = (indentCm: number) => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      applyVisualParagraphIndent(el, indentCm);
      syncVisualEditorFromDom();
      return;
    }

    const el = htmlTextareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const next = applyHtmlParagraphIndentCm(html, start, end, indentCm);
    if (next === html) return;
    setHtml(next);
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  };

  const wrapParagraphWithIndent = () => applyParagraphIndentCm(1.25);

  const wrapAsHeading = (level: 1 | 2 | 3) => {
    const tag = `h${level}`;
    const fontSize = level === 1 ? '14pt' : level === 2 ? '12pt' : '11pt';
    wrapSelection(
      `<${tag} style="text-align: center; font-size: ${fontSize}; margin: 14pt 0 8pt;">`,
      `</${tag}>`,
      level === 1 ? 'Название договора' : level === 2 ? 'Название раздела' : 'Название подпункта'
    );
    window.requestAnimationFrame(() => refreshInlineFormatActiveState());
  };

  const wrapParagraphWithSpacing = (lineHeight: number, marginBottomPt: number) => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      applyVisualLineSpacing(el, lineHeight, marginBottomPt);
      syncVisualEditorFromDom();
      return;
    }
    wrapSelection(
      `<p style="text-align: justify; line-height: ${lineHeight}; margin: 0 0 ${marginBottomPt}pt;">`,
      '</p>',
      'Абзац'
    );
  };

  const wrapParagraphWithIndentCm = (indentCm: number) => applyParagraphIndentCm(indentCm);

  return {
    applyParagraphIndentCm,
    applyVisualFontSizeFromToolbar,
    handleSyncHtmlWithVisualEditor,
    insertPlaceholder,
    toggleInlineFormat,
    wrapAsHeading,
    wrapParagraphWithAlign,
    wrapParagraphWithIndent,
    wrapParagraphWithIndentCm,
    wrapParagraphWithSpacing,
    wrapSelection,
  };
}
