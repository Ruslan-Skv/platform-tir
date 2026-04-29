'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type ContractTemplatePreset,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { applyTemplate } from '@/views/admin/ContractDocuments/repair/applyTemplate';
import { printDocumentHtml } from '@/views/admin/ContractDocuments/repair/printDocument';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from '@/views/admin/ContractDocuments/repair/repairContractPlaceholders';
import {
  defaultRepairPackageFormData,
  repairPackageFormForTemplate,
} from '@/views/admin/ContractDocuments/repair/repairPackageForm';

import styles from './ContractDocuments.module.css';

type ToolButton = { label: string; onClick: () => void; secondary?: boolean };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plainTextToParagraphHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) return '';
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 8pt;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`);
  return paragraphs.join('\n');
}

export function ContractDocumentsTemplatesLibraryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [items, setItems] = useState<ContractTemplatePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [formatToolbarLevel, setFormatToolbarLevel] = useState<'basic' | 'advanced'>('basic');
  const [formatToolbarQuery, setFormatToolbarQuery] = useState('');
  const [showAllFormatTools, setShowAllFormatTools] = useState(false);
  const [editorMode, setEditorMode] = useState<'html' | 'visual'>('html');
  const [visualDraftHtml, setVisualDraftHtml] = useState('');
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);

  const templateData = useMemo(
    () =>
      repairPackageFormForTemplate({
        ...defaultRepairPackageFormData(),
        customer: {
          ...defaultRepairPackageFormData().customer,
          fullName: 'Иванов Иван Иванович',
          address: 'г. Краснодар, ул. Примерная, д. 1',
          phone: '+7 900 000-00-00',
        },
        executor: {
          ...defaultRepairPackageFormData().executor,
          companyName: 'ООО Территория ИР',
          inn: '2312345678',
          kpp: '231201001',
          ogrn: '1232300000000',
          email: 'info@example.com',
          directorName: 'Петров Петр Петрович',
          basis: 'Устава',
        },
        object: {
          ...defaultRepairPackageFormData().object,
          objectAddress: 'г. Краснодар, ул. Строителей, д. 10',
          objectFloor: '5',
          objectDescription: 'Косметический ремонт квартиры',
        },
        contract: {
          ...defaultRepairPackageFormData().contract,
          number: 'R-001/26',
          date: '2026-04-29',
          totalAmount: '250000',
          totalAmountWords: 'двести пятьдесят тысяч рублей',
        },
      }),
    []
  );

  const renderedPreview = useMemo(
    () => applyTemplate(html || '', templateData),
    [html, templateData]
  );

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getContractDocumentTemplatePresets('REPAIR');
        const next = res.items ?? [];
        setItems(next);
        const firstId = next.find((it) => it.isDefault)?.id ?? next[0]?.id ?? '';
        setEditingId(firstId);
        const t = next.find((it) => it.id === firstId);
        setTitle(t?.title ?? '');
        setHtml(t?.html ?? '');
        setVisualDraftHtml(t?.html ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку шаблонов');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next: ContractTemplatePreset[], successText: string) => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await putContractDocumentTemplatePresets({ kind: 'REPAIR', items: next });
      setItems(next);
      setOk(successText);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны');
    } finally {
      setSaving(false);
    }
  };

  const selectTemplate = (id: string) => {
    setEditingId(id);
    const t = items.find((it) => it.id === id);
    setTitle(t?.title ?? '');
    setHtml(t?.html ?? '');
    setVisualDraftHtml(t?.html ?? '');
  };

  const saveTemplate = async () => {
    if (!isSuperAdmin) return;
    const t = title.trim();
    const h = html.trim();
    if (!t || !h) {
      setError('Укажите имя и HTML шаблона.');
      return;
    }
    const id = editingId || `tpl_${Date.now()}`;
    const exists = items.some((it) => it.id === id);
    const next = exists
      ? items.map((it) => (it.id === id ? { ...it, title: t, html: h } : it))
      : [...items, { id, title: t, html: h, isDefault: items.length === 0 }];
    await persist(next, 'Шаблон сохранен.');
    setEditingId(id);
  };

  const createTemplate = (mode: 'copy' | 'blank') => {
    if (!isSuperAdmin) return;
    setEditingId(`tpl_${Date.now()}`);
    setTitle(mode === 'copy' ? 'Копия шаблона' : 'Новый шаблон');
    const next = mode === 'copy' ? html : '<div class="docPrint"></div>';
    setHtml(next);
    setVisualDraftHtml(next);
  };

  useEffect(() => {
    if (editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = visualDraftHtml || '';
    }
  }, [editorMode, visualDraftHtml, editingId]);

  const deleteTemplate = async () => {
    if (!isSuperAdmin || !editingId) return;
    const next = items.filter((it) => it.id !== editingId);
    await persist(next, 'Шаблон удален.');
    const fallback = next.find((it) => it.isDefault)?.id ?? next[0]?.id ?? '';
    selectTemplate(fallback);
  };

  const setDefault = async () => {
    if (!isSuperAdmin || !editingId) return;
    const next = items.map((it) => ({ ...it, isDefault: it.id === editingId }));
    await persist(next, 'Шаблон по умолчанию обновлен.');
  };

  const updateHtmlBySelection = (
    transform: (
      selected: string,
      hasSelection: boolean
    ) => { content: string; cursorOffset?: number; selectLength?: number }
  ) => {
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

  const wrapParagraphWithAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    wrapSelection(`<p style="text-align: ${align}; margin: 0 0 8pt;">`, '</p>', 'Новый абзац');
  };
  const wrapParagraphWithIndent = () => {
    wrapSelection(
      '<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">',
      '</p>',
      'Абзац с красной строкой'
    );
  };
  const wrapAsHeading = (level: 1 | 2 | 3) => {
    const tag = `h${level}`;
    const fontSize = level === 1 ? '14pt' : level === 2 ? '12pt' : '11pt';
    wrapSelection(
      `<${tag} style="text-align: center; font-size: ${fontSize}; margin: 14pt 0 8pt;">`,
      `</${tag}>`,
      level === 1 ? 'Название договора' : level === 2 ? 'Название раздела' : 'Название подпункта'
    );
  };
  const wrapAsList = (ordered: boolean) => {
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = (hasSelection ? selected : 'Пункт 1\nПункт 2')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const itemsHtml = lines.map((line) => `  <li>${line}</li>`).join('\n');
      const tag = ordered ? 'ol' : 'ul';
      return {
        content: `<${tag} style="margin: 0 0 8pt 22px; padding: 0;">\n${itemsHtml}\n</${tag}>`,
      };
    });
  };
  const insertHorizontalRule = () =>
    updateHtmlBySelection(() => ({
      content: '<hr style="border: 0; border-top: 1px solid #999; margin: 12pt 0;" />',
    }));
  const insertPageBreak = () =>
    updateHtmlBySelection(() => ({ content: '<div style="page-break-after: always;"></div>' }));
  const clearFormattingInSelection = () => {
    updateHtmlBySelection((selected, hasSelection) => {
      const source = (hasSelection ? selected : html).trim();
      const cleaned = source.replace(/<[^>]+>/g, '').trim();
      return { content: cleaned || 'текст' };
    });
  };
  const uppercaseSelection = () =>
    updateHtmlBySelection((selected, hasSelection) => ({
      content: (hasSelection ? selected : 'ТЕКСТ').toUpperCase(),
    }));
  const wrapParagraphWithSpacing = (lineHeight: number, marginBottomPt: number) => {
    wrapSelection(
      `<p style="text-align: justify; line-height: ${lineHeight}; margin: 0 0 ${marginBottomPt}pt;">`,
      '</p>',
      'Абзац'
    );
  };
  const wrapParagraphWithIndentCm = (indentCm: number) => {
    wrapSelection(
      `<p style="text-align: justify; text-indent: ${indentCm}cm; margin: 0 0 8pt;">`,
      '</p>',
      'Абзац'
    );
  };
  const insertSectionTemplate = () =>
    updateHtmlBySelection(() => ({
      content: `<h2 style="text-align: center; margin: 14pt 0 8pt;">N. НАЗВАНИЕ РАЗДЕЛА</h2>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">N.1. Первый пункт раздела.</p>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">N.2. Второй пункт раздела.</p>`,
    }));
  const insertSignatureLines = () =>
    updateHtmlBySelection(() => ({
      content: `<table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 10px;">
      <p style="margin: 0 0 22pt;">Подрядчик _____________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding-left: 10px;">
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.fullName}}</p>
    </td>
  </tr>
</table>`,
    }));
  const insertRequisitesTemplate = () =>
    updateHtmlBySelection(() => ({
      content: `<h2 style="text-align: center; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ПОДРЯДЧИК</p>
      <p style="margin: 0 0 4pt;">{{executor.companyName}}</p>
      <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
      <p style="margin: 0 0 4pt;">Юр. адрес: {{executor.legalAddress}}</p>
      <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
      <p style="margin: 0 0 8pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЗАКАЗЧИК</p>
      <p style="margin: 0 0 4pt;">{{customer.fullName}}</p>
      <p style="margin: 0 0 4pt;">Адрес: {{customer.address}}</p>
      <p style="margin: 0 0 4pt;">Тел.: {{customer.phone}}</p>
    </td>
  </tr>
</table>`,
    }));
  const insertQuoteBlock = () =>
    updateHtmlBySelection(() => ({
      content: `<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid #94a3b8; background: #f8fafc;">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`,
    }));
  const insertEmptySpacer = () =>
    updateHtmlBySelection(() => ({ content: '<div style="height: 10pt;"></div>' }));
  const convertTextToParagraphs = () =>
    updateHtmlBySelection((selected, hasSelection) => {
      const source = (hasSelection ? selected : html).trim();
      const parts = source
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin: 0 0 8pt;">${line}</p>`)
        .join('\n');
      return { content: parts || '<p style="margin: 0 0 8pt;">Новый абзац</p>' };
    });
  const insertTwoColumnsBlock = () =>
    updateHtmlBySelection(() => ({
      content: `<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
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
</table>`,
    }));
  const insertSimpleTable = () =>
    updateHtmlBySelection(() => ({
      content:
        '<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;"><tr><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Пункт</th><th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Содержание</th></tr><tr><td style="border: 1px solid #cbd5e1; padding: 6px;">1</td><td style="border: 1px solid #cbd5e1; padding: 6px;">Описание</td></tr></table>',
    }));
  const handlePasteContractTextFromClipboard = async () => {
    if (!isSuperAdmin) return;
    try {
      const fromClipboard = await navigator.clipboard.readText();
      const next = plainTextToParagraphHtml(fromClipboard);
      if (!next) {
        setError('Буфер обмена пустой.');
        return;
      }
      setVisualDraftHtml(next);
      setHtml(next);
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = next;
      setOk('Текст из буфера вставлен и разбит на абзацы.');
    } catch {
      const manual = window.prompt('Вставьте текст договора:');
      if (!manual) return;
      const next = plainTextToParagraphHtml(manual);
      if (!next) return;
      setVisualDraftHtml(next);
      setHtml(next);
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = next;
      setOk('Текст вставлен и разбит на абзацы.');
    }
  };
  const handleAppendContractTextFromClipboard = async () => {
    if (!isSuperAdmin) return;
    try {
      const fromClipboard = await navigator.clipboard.readText();
      const chunk = plainTextToParagraphHtml(fromClipboard);
      if (!chunk) {
        setError('Буфер обмена пустой.');
        return;
      }
      const base = (visualEditorRef.current?.innerHTML ?? visualDraftHtml ?? '').trim();
      const next = base ? `${base}\n${chunk}` : chunk;
      setVisualDraftHtml(next);
      setHtml(next);
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = next;
      setOk('Текст из буфера добавлен в конец шаблона.');
    } catch {
      const manual = window.prompt('Вставьте текст договора для добавления в конец:');
      if (!manual) return;
      const chunk = plainTextToParagraphHtml(manual);
      if (!chunk) return;
      const base = (visualEditorRef.current?.innerHTML ?? visualDraftHtml ?? '').trim();
      const next = base ? `${base}\n${chunk}` : chunk;
      setVisualDraftHtml(next);
      setHtml(next);
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = next;
      setOk('Текст добавлен в конец шаблона.');
    }
  };

  const basicTools: ToolButton[] = [
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
  ];
  const advancedTools: ToolButton[] = [
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
  ];
  const sourceTools = formatToolbarLevel === 'basic' ? basicTools : advancedTools;
  const q = formatToolbarQuery.trim().toLowerCase();
  const visibleTools = sourceTools.filter((tool) => {
    if (!showAllFormatTools && tool.secondary) return false;
    if (!q) return true;
    return tool.label.toLowerCase().includes(q);
  });

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={styles.editorHeader}>
        <div>
          <h1 className={styles.title}>Библиотека шаблонов договоров</h1>
          <p className={styles.subtitle}>
            Управление шаблонами договоров направления «Ремонт». Менеджеры в карточке пакета
            выбирают только готовый шаблон.
          </p>
        </div>
        <Link className={styles.secondaryBtn} href="/admin/contract-documents/repair">
          К разделу «Ремонт»
        </Link>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
      {ok ? <p className={styles.hint}>{ok}</p> : null}
      {!isSuperAdmin ? (
        <p className={styles.hint}>Изменение библиотеки шаблонов доступно только супер-админу.</p>
      ) : null}

      <div className={styles.sectionCard}>
        <div className={styles.sectionFields}>
          <div className={styles.field}>
            <label>Шаблон</label>
            <select
              value={editingId}
              disabled={loading || items.length === 0}
              onChange={(e) => selectTemplate(e.target.value)}
            >
              {items.length === 0 ? <option value="">— нет шаблонов —</option> : null}
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.title}
                  {it.isDefault ? ' (по умолчанию)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Имя шаблона</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isSuperAdmin}
            />
          </div>
        </div>
        {isSuperAdmin ? (
          <div className={styles.toolbar} style={{ marginTop: 10, marginBottom: 0 }}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={() => void saveTemplate()}
            >
              {saving ? 'Сохранение…' : 'Сохранить шаблон'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => createTemplate('copy')}
            >
              Создать копию
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => createTemplate('blank')}
            >
              Новый пустой
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!editingId}
              onClick={() => void setDefault()}
            >
              Сделать по умолчанию
            </button>
            <button
              type="button"
              className={styles.dangerBtn}
              disabled={!editingId}
              onClick={() => void deleteTemplate()}
            >
              Удалить
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() =>
                printDocumentHtml(renderedPreview, `Шаблон договора: ${title || 'без названия'}`)
              }
            >
              Печать предпросмотра
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin}
              onClick={() => {
                if (editorMode === 'visual') {
                  const next = visualEditorRef.current?.innerHTML ?? visualDraftHtml;
                  setVisualDraftHtml(next);
                  setHtml(next);
                } else {
                  setVisualDraftHtml(html);
                }
              }}
            >
              {editorMode === 'visual'
                ? 'Сформировать HTML из конструктора'
                : 'Загрузить HTML в конструктор'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin || editorMode !== 'visual'}
              onClick={() => void handlePasteContractTextFromClipboard()}
            >
              Вставить текст договора (из буфера) → авто-разбивка на абзацы
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin || editorMode !== 'visual'}
              onClick={() => void handleAppendContractTextFromClipboard()}
            >
              Добавить текст из буфера в конец текущего шаблона
            </button>
          </div>
        ) : null}
      </div>

      <div className={`${styles.contractTopTools} ${styles.blockTools}`} style={{ marginTop: 12 }}>
        <div className={styles.contractEditorMain}>
          <div className={styles.formatLevelBar}>
            <button
              type="button"
              className={
                editorMode === 'html' ? styles.formatLevelBtnActive : styles.formatLevelBtn
              }
              onClick={() => setEditorMode('html')}
            >
              HTML
            </button>
            <button
              type="button"
              className={
                editorMode === 'visual' ? styles.formatLevelBtnActive : styles.formatLevelBtn
              }
              onClick={() => setEditorMode('visual')}
            >
              Визуальный конструктор
            </button>
          </div>
          <div className={styles.formatLevelBar}>
            <button
              type="button"
              className={
                formatToolbarLevel === 'basic' ? styles.formatLevelBtnActive : styles.formatLevelBtn
              }
              onClick={() => setFormatToolbarLevel('basic')}
            >
              Базовые
            </button>
            <button
              type="button"
              className={
                formatToolbarLevel === 'advanced'
                  ? styles.formatLevelBtnActive
                  : styles.formatLevelBtn
              }
              onClick={() => setFormatToolbarLevel('advanced')}
            >
              Расширенные
            </button>
          </div>
          <div className={styles.formatToolbarTopRow}>
            <input
              type="text"
              value={formatToolbarQuery}
              onChange={(e) => setFormatToolbarQuery(e.target.value)}
              placeholder="Поиск инструмента…"
              className={styles.formatSearchInput}
            />
            <button
              type="button"
              className={showAllFormatTools ? styles.formatLevelBtnActive : styles.formatLevelBtn}
              onClick={() => setShowAllFormatTools((v) => !v)}
            >
              {showAllFormatTools ? 'Только частые' : 'Показать все'}
            </button>
          </div>
          <div className={styles.formatToolbar}>
            {visibleTools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                className={styles.formatBtn}
                onClick={tool.onClick}
                disabled={!isSuperAdmin}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
        <aside className={styles.placeholderPanelTop} aria-label="Плейсхолдеры для вставки">
          {REPAIR_CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
            <div key={group.title}>
              <div className={styles.placeholderGroupTitle}>{group.title}</div>
              <div className={styles.placeholderChips}>
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className={styles.placeholderChip}
                    title={`Вставить {{${item.path}}}`}
                    onClick={() => insertPlaceholder(item.path)}
                    disabled={!isSuperAdmin}
                  >
                    {item.label} <code>{`{{${item.path}}}`}</code>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      <div className={styles.contractLiveGrid}>
        <div className={styles.contractEditColumn}>
          {editorMode === 'html' ? (
            <>
              <label className={styles.contractEditorLabel} htmlFor="contract_template_html_source">
                HTML шаблона договора
              </label>
              <textarea
                id="contract_template_html_source"
                ref={htmlTextareaRef}
                className={styles.contractHtmlTextarea}
                spellCheck={false}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                disabled={!isSuperAdmin}
              />
            </>
          ) : (
            <>
              <label className={styles.contractEditorLabel}>Визуальный конструктор</label>
              <div
                ref={visualEditorRef}
                className={styles.contractHtmlTextarea}
                contentEditable={isSuperAdmin}
                suppressContentEditableWarning
                onInput={(e) => setVisualDraftHtml((e.currentTarget as HTMLDivElement).innerHTML)}
                style={{ whiteSpace: 'normal', overflow: 'auto' }}
              />
            </>
          )}
        </div>
        <div className={styles.contractPreviewColumn}>
          <h3 className={styles.previewBlockTitle}>Предпросмотр с подстановкой данных</h3>
          <div className={`${styles.docPane} ${styles.previewResizable}`}>
            <div dangerouslySetInnerHTML={{ __html: renderedPreview }} />
          </div>
        </div>
      </div>
    </div>
  );
}
