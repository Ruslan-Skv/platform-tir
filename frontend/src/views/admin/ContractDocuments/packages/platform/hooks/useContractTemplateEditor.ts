'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { putContractDocumentTemplatePresets } from '@/shared/api/admin-contract-document-packages';

import { buildPackageContractRequisitesInsertHtmlForToolbar } from '../../../core/typography/packageContractRequisitesLayout';
import {
  normalizePackageContractTemplatePreset,
  normalizePackageTemplateTabId,
} from '../editor/packageTemplateTabUtils';
import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';

type ToolButton = {
  label: string;
  onClick: () => void;
  secondary?: boolean;
};

export type UseContractTemplateEditorOptions = {
  activeTab: PackageDocumentTabId;
  isSuperAdmin: boolean;
  contractAndEstimateLocked: boolean;
  contractTemplatePresets: ContractTemplatePreset[];
  setContractTemplatePresets: React.Dispatch<React.SetStateAction<ContractTemplatePreset[]>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
  setSelectedTemplateIds: React.Dispatch<
    React.SetStateAction<Partial<Record<PackageDocumentTemplateTabId, string>>>
  >;
  editingTemplateId: string;
  setEditingTemplateId: React.Dispatch<React.SetStateAction<string>>;
  templateDraftTitle: string;
  setTemplateDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  templateDraftHtml: string;
  setTemplateDraftHtml: React.Dispatch<React.SetStateAction<string>>;
  templateSaving: boolean;
  setTemplateSaving: React.Dispatch<React.SetStateAction<boolean>>;
  resolveTemplateHtml: (tab: PackageDocumentTemplateTabId) => string;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setExcelMessage: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useContractTemplateEditor({
  activeTab,
  isSuperAdmin,
  contractAndEstimateLocked,
  contractTemplatePresets,
  setContractTemplatePresets,
  selectedTemplateIds,
  setSelectedTemplateIds,
  editingTemplateId,
  setEditingTemplateId,
  templateDraftTitle,
  setTemplateDraftTitle,
  templateDraftHtml,
  setTemplateDraftHtml,
  templateSaving,
  setTemplateSaving,
  resolveTemplateHtml,
  setError,
  setExcelMessage,
}: UseContractTemplateEditorOptions) {
  const contractHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [contractDocView, setContractDocView] = useState<'preview' | 'edit'>('preview');
  const [formatToolbarLevel, setFormatToolbarLevel] = useState<'basic' | 'advanced'>('basic');
  const [formatToolbarQuery, setFormatToolbarQuery] = useState('');
  const [showAllFormatTools, setShowAllFormatTools] = useState(false);

  const canEdit = isSuperAdmin && !contractAndEstimateLocked;

  const contractTabTemplates = useMemo(
    () =>
      contractTemplatePresets.filter(
        (it) => !it.archived && normalizePackageTemplateTabId(it.tabId) === 'contract'
      ),
    [contractTemplatePresets]
  );

  const contractTemplateSource = useMemo(() => {
    if (activeTab !== 'contract') return '';
    return templateDraftHtml || resolveTemplateHtml('contract');
  }, [activeTab, templateDraftHtml, resolveTemplateHtml]);

  const persistContractTemplatePresets = useCallback(
    async (items: ContractTemplatePreset[]) => {
      if (contractAndEstimateLocked) return;
      setTemplateSaving(true);
      setError(null);
      try {
        await putContractDocumentTemplatePresets({ kind: 'REPAIR', items });
        setContractTemplatePresets(items.map((it) => normalizePackageContractTemplatePreset(it)));
        setExcelMessage('Шаблоны договора сохранены.');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны договора');
      } finally {
        setTemplateSaving(false);
      }
    },
    [
      contractAndEstimateLocked,
      setContractTemplatePresets,
      setError,
      setExcelMessage,
      setTemplateSaving,
    ]
  );

  const handleContractTemplateChange = useCallback(
    (value: string) => {
      if (contractAndEstimateLocked) return;
      setTemplateDraftHtml(value);
    },
    [contractAndEstimateLocked, setTemplateDraftHtml]
  );

  const handleEditTemplateSelect = useCallback(
    (templateId: string) => {
      if (contractAndEstimateLocked) return;
      setEditingTemplateId(templateId);
      const t = contractTemplatePresets.find((it) => it.id === templateId);
      setTemplateDraftTitle(t?.title ?? '');
      setTemplateDraftHtml(t?.html ?? '');
    },
    [
      contractAndEstimateLocked,
      contractTemplatePresets,
      setEditingTemplateId,
      setTemplateDraftHtml,
      setTemplateDraftTitle,
    ]
  );

  const handleSaveTemplateDraft = useCallback(async () => {
    if (!isSuperAdmin) return;
    if (contractAndEstimateLocked) return;
    const title = templateDraftTitle.trim();
    if (!title) {
      setError('Укажите имя шаблона.');
      return;
    }
    const html = templateDraftHtml.trim();
    if (!html) {
      setError('HTML шаблона не может быть пустым.');
      return;
    }
    const id = editingTemplateId || `tpl_${Date.now()}`;
    const currentTab: PackageDocumentTemplateTabId = 'contract';
    const next = contractTemplatePresets.map((it) =>
      it.id === id ? { ...it, title, html, tabId: currentTab } : it
    );
    const exists = next.some((it) => it.id === id);
    const finalItems = exists
      ? next
      : [
          ...contractTemplatePresets,
          {
            id,
            title,
            html,
            tabId: currentTab,
            isDefault:
              contractTemplatePresets.filter(
                (it) => normalizePackageTemplateTabId(it.tabId) === currentTab && !it.archived
              ).length === 0,
            archived: false,
          },
        ];
    await persistContractTemplatePresets(finalItems);
    setEditingTemplateId(id);
    setSelectedTemplateIds((p) => ({ ...p, [currentTab]: p[currentTab] || id }));
  }, [
    contractAndEstimateLocked,
    contractTemplatePresets,
    editingTemplateId,
    isSuperAdmin,
    persistContractTemplatePresets,
    setEditingTemplateId,
    setError,
    setSelectedTemplateIds,
    templateDraftHtml,
    templateDraftTitle,
  ]);

  const handleCreateTemplate = useCallback(
    (mode: 'blank' | 'copy') => {
      if (!isSuperAdmin) return;
      if (contractAndEstimateLocked) return;
      const sourceHtml = mode === 'copy' ? contractTemplateSource : '<div class="docPrint"></div>';
      const id = `tpl_${Date.now()}`;
      setEditingTemplateId(id);
      setTemplateDraftTitle(mode === 'copy' ? 'Копия шаблона' : 'Новый шаблон');
      setTemplateDraftHtml(sourceHtml);
    },
    [
      contractAndEstimateLocked,
      contractTemplateSource,
      isSuperAdmin,
      setEditingTemplateId,
      setTemplateDraftHtml,
      setTemplateDraftTitle,
    ]
  );

  const handleDeleteTemplate = useCallback(async () => {
    if (!isSuperAdmin || !editingTemplateId) return;
    if (contractAndEstimateLocked) return;
    const current = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    if (!current) return;
    if (current.archived) return;
    const name = (current.title ?? '').trim() || 'без названия';
    if (
      !window.confirm(
        `Шаблон «${name}» будет перенесён в архив глобальной библиотеки (не пропадёт, но скроется из выбора). Продолжить?`
      )
    ) {
      return;
    }
    const tab = normalizePackageTemplateTabId(current.tabId);
    let next = contractTemplatePresets.map((it) =>
      it.id === editingTemplateId ? { ...it, archived: true, isDefault: false } : it
    );
    let activeOnTab = next.filter(
      (it) => normalizePackageTemplateTabId(it.tabId) === tab && !it.archived
    );
    if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
      const pickId = activeOnTab[0].id;
      next = next.map((it) =>
        normalizePackageTemplateTabId(it.tabId) !== tab
          ? it
          : { ...it, isDefault: !it.archived && it.id === pickId }
      );
      activeOnTab = next.filter(
        (it) => normalizePackageTemplateTabId(it.tabId) === tab && !it.archived
      );
    }
    await persistContractTemplatePresets(next);
    const fallbackId = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
    setEditingTemplateId(fallbackId);
    setSelectedTemplateIds((prev) => ({
      ...prev,
      contract: prev.contract === editingTemplateId ? fallbackId : prev.contract,
    }));
    const fallback = next.find((it) => it.id === fallbackId);
    setTemplateDraftTitle(fallback?.title ?? '');
    setTemplateDraftHtml(fallback?.html ?? '');
  }, [
    contractAndEstimateLocked,
    contractTemplatePresets,
    editingTemplateId,
    isSuperAdmin,
    persistContractTemplatePresets,
    setEditingTemplateId,
    setSelectedTemplateIds,
    setTemplateDraftHtml,
    setTemplateDraftTitle,
  ]);

  const handleSetDefaultTemplate = useCallback(async () => {
    if (!isSuperAdmin || !editingTemplateId) return;
    if (contractAndEstimateLocked) return;
    const cur = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    if (cur?.archived) {
      setError('Нельзя сделать архивный шаблон по умолчанию.');
      return;
    }
    const next = contractTemplatePresets.map((it) => ({
      ...it,
      isDefault: it.id === editingTemplateId,
    }));
    await persistContractTemplatePresets(next);
  }, [
    contractAndEstimateLocked,
    contractTemplatePresets,
    editingTemplateId,
    isSuperAdmin,
    persistContractTemplatePresets,
    setError,
  ]);

  const updateContractHtmlBySelection = useCallback(
    (
      transform: (
        selected: string,
        hasSelection: boolean
      ) => {
        content: string;
        cursorOffset?: number;
        selectLength?: number;
      }
    ) => {
      if (contractAndEstimateLocked) return;
      const el = contractHtmlTextareaRef.current;
      const current = contractTemplateSource;
      if (!el) {
        const next = transform('', false).content;
        handleContractTemplateChange(current + next);
        return;
      }
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      const selected = current.slice(start, end);
      const hasSelection = start !== end;
      const result = transform(selected, hasSelection);
      const next = current.slice(0, start) + result.content + current.slice(end);
      handleContractTemplateChange(next);
      const cursor = start + (result.cursorOffset ?? result.content.length);
      const selectLength = result.selectLength ?? 0;
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor + selectLength);
      });
    },
    [contractAndEstimateLocked, contractTemplateSource, handleContractTemplateChange]
  );

  const wrapSelection = useCallback(
    (before: string, after: string, placeholder = 'текст') => {
      updateContractHtmlBySelection((selected, hasSelection) => ({
        content: `${before}${hasSelection ? selected : placeholder}${after}`,
        cursorOffset: hasSelection ? before.length + selected.length + after.length : before.length,
        selectLength: hasSelection ? 0 : placeholder.length,
      }));
    },
    [updateContractHtmlBySelection]
  );

  const wrapParagraphWithAlign = useCallback(
    (align: 'left' | 'center' | 'right' | 'justify') => {
      wrapSelection(`<p style="text-align: ${align}; margin: 0 0 8pt;">`, '</p>', 'Новый абзац');
    },
    [wrapSelection]
  );

  const wrapParagraphWithIndent = useCallback(() => {
    wrapSelection(
      '<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">',
      '</p>',
      'Абзац с красной строкой'
    );
  }, [wrapSelection]);

  const wrapAsHeading = useCallback(
    (level: 1 | 2 | 3) => {
      const tag = `h${level}`;
      const fontSize = level === 1 ? '14pt' : level === 2 ? '12pt' : '11pt';
      wrapSelection(
        `<${tag} style="text-align: center; font-size: ${fontSize}; margin: 14pt 0 8pt;">`,
        `</${tag}>`,
        level === 1 ? 'Название договора' : level === 2 ? 'Название раздела' : 'Название подпункта'
      );
    },
    [wrapSelection]
  );

  const wrapAsList = useCallback(
    (ordered: boolean) => {
      updateContractHtmlBySelection((selected, hasSelection) => {
        const lines = (hasSelection ? selected : 'Пункт 1\nПункт 2')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        const items = lines.map((line) => `  <li>${line}</li>`).join('\n');
        const tag = ordered ? 'ol' : 'ul';
        return {
          content: `<${tag} style="margin: 0 0 8pt 22px; padding: 0;">\n${items}\n</${tag}>`,
        };
      });
    },
    [updateContractHtmlBySelection]
  );

  const insertSectionTemplate = useCallback(() => {
    const block = `
<h2 style="text-align: center; margin: 14pt 0 8pt;">N. НАЗВАНИЕ РАЗДЕЛА</h2>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.1. Первый пункт раздела.
</p>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.2. Второй пункт раздела.
</p>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  }, [updateContractHtmlBySelection]);

  const insertSignatureLines = useCallback(() => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 10px;">
      <p style="margin: 0 0 22pt;">Подрядчик _____________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding-left: 10px;">
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.signatureName|plain}}</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  }, [updateContractHtmlBySelection]);

  const clearFormattingInSelection = useCallback(() => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = hasSelection ? selected : contractTemplateSource;
      const cleaned = source.replace(/<[^>]+>/g, '').trim();
      return { content: cleaned || 'текст' };
    });
  }, [contractTemplateSource, updateContractHtmlBySelection]);

  const uppercaseSelection = useCallback(() => {
    updateContractHtmlBySelection((selected, hasSelection) => ({
      content: (hasSelection ? selected : 'ТЕКСТ').toUpperCase(),
    }));
  }, [updateContractHtmlBySelection]);

  const insertHorizontalRule = useCallback(() => {
    updateContractHtmlBySelection(() => ({
      content:
        '<hr style="border: 0; border-top: 1px solid var(--admin-border-strong); margin: 12pt 0;" />',
    }));
  }, [updateContractHtmlBySelection]);

  const insertPageBreak = useCallback(() => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="page-break-after: always;"></div>',
    }));
  }, [updateContractHtmlBySelection]);

  const insertRequisitesTemplate = useCallback(() => {
    updateContractHtmlBySelection(() => ({
      content: buildPackageContractRequisitesInsertHtmlForToolbar(),
    }));
  }, [updateContractHtmlBySelection]);

  const wrapParagraphWithSpacing = useCallback(
    (lineHeight: number, marginBottomPt: number) => {
      wrapSelection(
        `<p style="text-align: justify; line-height: ${lineHeight}; margin: 0 0 ${marginBottomPt}pt;">`,
        '</p>',
        'Абзац'
      );
    },
    [wrapSelection]
  );

  const wrapParagraphWithIndentCm = useCallback(
    (indentCm: number) => {
      wrapSelection(
        `<p style="text-align: justify; text-indent: ${indentCm}cm; margin: 0 0 8pt;">`,
        '</p>',
        'Абзац'
      );
    },
    [wrapSelection]
  );

  const insertQuoteBlock = useCallback(() => {
    const block = `
<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid var(--admin-border-strong); background: var(--admin-surface-muted);">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  }, [updateContractHtmlBySelection]);

  const insertSimpleTable = useCallback(() => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;">
  <tr>
    <th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Пункт</th>
    <th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Содержание</th>
  </tr>
  <tr>
    <td style="border: 1px solid var(--admin-border); padding: 6px;">1</td>
    <td style="border: 1px solid var(--admin-border); padding: 6px;">Описание</td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  }, [updateContractHtmlBySelection]);

  const insertEmptySpacer = useCallback(() => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="height: 10pt;"></div>',
    }));
  }, [updateContractHtmlBySelection]);

  const convertTextToParagraphs = useCallback(() => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = (hasSelection ? selected : contractTemplateSource).trim();
      const parts = source
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin: 0 0 8pt;">${line}</p>`)
        .join('\n');
      return {
        content: parts || '<p style="margin: 0 0 8pt;">Новый абзац</p>',
      };
    });
  }, [contractTemplateSource, updateContractHtmlBySelection]);

  const insertTwoColumnsBlock = useCallback(() => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong);">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЛЕВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{customer.fullName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ПРАВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{executor.companyName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  }, [updateContractHtmlBySelection]);

  const insertContractPlaceholder = useCallback(
    (path: string) => {
      if (contractAndEstimateLocked) return;
      const el = contractHtmlTextareaRef.current;
      const cur = templateDraftHtml || resolveTemplateHtml('contract');
      const token = `{{${path}}}`;
      if (el) {
        const start = el.selectionStart ?? cur.length;
        const end = el.selectionEnd ?? start;
        const next = cur.slice(0, start) + token + cur.slice(end);
        handleContractTemplateChange(next);
        const pos = start + token.length;
        window.requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(pos, pos);
        });
      } else {
        handleContractTemplateChange(cur + token);
      }
    },
    [
      contractAndEstimateLocked,
      handleContractTemplateChange,
      resolveTemplateHtml,
      templateDraftHtml,
    ]
  );

  const handleResetContractTemplate = useCallback(() => {
    if (contractAndEstimateLocked) return;
    const t = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    setTemplateDraftTitle(t?.title ?? '');
    setTemplateDraftHtml(t?.html ?? '');
    setExcelMessage(null);
  }, [
    contractAndEstimateLocked,
    contractTemplatePresets,
    editingTemplateId,
    setExcelMessage,
    setTemplateDraftHtml,
    setTemplateDraftTitle,
  ]);

  useEffect(() => {
    if (activeTab !== 'contract') {
      setContractDocView('preview');
    }
  }, [activeTab]);

  useEffect(() => {
    if (contractAndEstimateLocked) {
      setContractDocView('preview');
    }
  }, [contractAndEstimateLocked]);

  useEffect(() => {
    if (contractDocView !== 'edit') {
      setFormatToolbarLevel('basic');
    }
  }, [contractDocView]);

  useEffect(() => {
    setShowAllFormatTools(false);
    setFormatToolbarQuery('');
  }, [formatToolbarLevel]);

  const basicTools: ToolButton[] = useMemo(
    () => [
      { label: 'H1', onClick: () => wrapAsHeading(1) },
      { label: 'H2', onClick: () => wrapAsHeading(2) },
      { label: 'Слева', onClick: () => wrapParagraphWithAlign('left') },
      { label: 'Центр', onClick: () => wrapParagraphWithAlign('center') },
      { label: 'По ширине', onClick: () => wrapParagraphWithAlign('justify') },
      { label: 'Абзац+отступ', onClick: wrapParagraphWithIndent },
      { label: 'Жирный', onClick: () => wrapSelection('<strong>', '</strong>', 'жирный текст') },
      { label: 'Курсив', onClick: () => wrapSelection('<em>', '</em>', 'курсив') },
      { label: 'Марк. список', onClick: () => wrapAsList(false) },
      { label: 'Нум. список', onClick: () => wrapAsList(true) },
      { label: 'Текст → абзацы', onClick: convertTextToParagraphs },
      { label: '2 колонки', onClick: insertTwoColumnsBlock },
      { label: 'Подписи сторон', onClick: insertSignatureLines },
      { label: 'Реквизиты (готово)', onClick: insertRequisitesTemplate, secondary: true },
    ],
    [
      convertTextToParagraphs,
      insertRequisitesTemplate,
      insertSignatureLines,
      insertTwoColumnsBlock,
      wrapAsHeading,
      wrapAsList,
      wrapParagraphWithAlign,
      wrapParagraphWithIndent,
      wrapSelection,
    ]
  );

  const advancedTools: ToolButton[] = useMemo(
    () => [
      { label: 'H3', onClick: () => wrapAsHeading(3) },
      { label: 'Справа', onClick: () => wrapParagraphWithAlign('right') },
      { label: 'Без отступа', onClick: () => wrapParagraphWithIndentCm(0) },
      { label: 'Отступ 1.25см', onClick: () => wrapParagraphWithIndentCm(1.25) },
      { label: 'Интервал узкий', onClick: () => wrapParagraphWithSpacing(1.3, 6) },
      { label: 'Интервал широкий', onClick: () => wrapParagraphWithSpacing(1.6, 10) },
      { label: 'Подчерк.', onClick: () => wrapSelection('<u>', '</u>', 'подчёркнуто') },
      { label: 'ВЕРХНИЙ РЕГИСТР', onClick: uppercaseSelection },
      { label: 'Очистить формат', onClick: clearFormattingInSelection },
      { label: 'Шаблон раздела', onClick: insertSectionTemplate },
      { label: 'Цитата / примеч.', onClick: insertQuoteBlock },
      { label: 'Таблица 2×2', onClick: insertSimpleTable },
      { label: 'Пустая строка', onClick: insertEmptySpacer, secondary: true },
      { label: 'Разделитель', onClick: insertHorizontalRule, secondary: true },
      { label: 'Разрыв страницы', onClick: insertPageBreak, secondary: true },
    ],
    [
      clearFormattingInSelection,
      insertEmptySpacer,
      insertHorizontalRule,
      insertPageBreak,
      insertQuoteBlock,
      insertSectionTemplate,
      insertSimpleTable,
      uppercaseSelection,
      wrapAsHeading,
      wrapParagraphWithAlign,
      wrapParagraphWithIndentCm,
      wrapParagraphWithSpacing,
      wrapSelection,
    ]
  );

  const visibleTools = useMemo(() => {
    const sourceTools = formatToolbarLevel === 'basic' ? basicTools : advancedTools;
    const q = formatToolbarQuery.trim().toLowerCase();
    return sourceTools.filter((tool) => {
      if (!showAllFormatTools && tool.secondary) return false;
      if (!q) return true;
      return tool.label.toLowerCase().includes(q);
    });
  }, [basicTools, advancedTools, formatToolbarLevel, formatToolbarQuery, showAllFormatTools]);

  return {
    canEdit,
    contractDocView,
    setContractDocView,
    contractHtmlTextareaRef,
    contractTemplateSource,
    contractTabTemplates,
    selectedContractTemplateId: selectedTemplateIds.contract ?? '',
    formatToolbarLevel,
    setFormatToolbarLevel,
    formatToolbarQuery,
    setFormatToolbarQuery,
    showAllFormatTools,
    setShowAllFormatTools,
    visibleTools,
    templateDraftTitle,
    setTemplateDraftTitle,
    editingTemplateId,
    templateSaving,
    handleContractTemplateChange,
    handleEditTemplateSelect,
    handleSaveTemplateDraft,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleSetDefaultTemplate,
    handleResetContractTemplate,
    insertContractPlaceholder,
  };
}
