'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { applyTemplate } from '@/views/admin/ContractDocuments/repair/applyTemplate';
import {
  pickPrintMarginFooterNames,
  printDocumentHtml,
} from '@/views/admin/ContractDocuments/repair/printDocument';
import {
  isRepairActTwinOneSheetTab,
  isRepairPlainCustomerTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from '@/views/admin/ContractDocuments/repair/repairActTwinCopiesOnOnePageHtml';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from '@/views/admin/ContractDocuments/repair/repairContractPlaceholders';
import {
  REPAIR_DOCUMENT_TAB_LABELS,
  type RepairDocumentTabId,
} from '@/views/admin/ContractDocuments/repair/repairDocumentTabs';
import {
  buildRepairTemplatePreviewFallbackData,
  repairPackageFormForTemplate,
} from '@/views/admin/ContractDocuments/repair/repairPackageForm';
import {
  applyWordImportedDocPrintCompact,
  readWordHtmlExportFileAsString,
} from '@/views/admin/ContractDocuments/repair/wordHtmlImport';

import styles from './ContractDocuments.module.css';

type ToolButton = { label: string; onClick: () => void; secondary?: boolean };
const TEMPLATES_UI_PREFS_KEY = 'admin.contractDocuments.templates.uiPrefs';
type NormalizeMode = 'soft' | 'strict';
type RepairTemplateTabId = Exclude<RepairDocumentTabId, 'data'>;
const TEMPLATE_TAB_IDS: RepairTemplateTabId[] = [
  'contract',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'questionnaire1',
  'questionnaire2',
  'addendum',
  'workOrder',
  'workOrderAddendum',
  'productionLog',
];

/** Только экран редактора и предпросмотра; на сохранённый HTML и печать не влияет. */
const TEMPLATE_EDITOR_ZOOM_MIN_PCT = 40;
const TEMPLATE_EDITOR_ZOOM_MAX_PCT = 150;

function normalizeTemplateTabId(value: string | undefined): RepairTemplateTabId {
  if (!value) return 'contract';
  return (TEMPLATE_TAB_IDS as string[]).includes(value)
    ? (value as RepairTemplateTabId)
    : 'contract';
}

function normalizeContractTemplatePreset(it: ContractTemplatePreset): ContractTemplatePreset {
  return {
    ...it,
    tabId: normalizeTemplateTabId(it.tabId),
    isProtected: Boolean(it.isProtected),
    archived: Boolean(it.archived),
  };
}

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

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeTextWhitespace(input: string): string {
  return input
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/[ \t]*\n+[ \t]*/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTemplateHtmlWhitespace(sourceHtml: string, mode: NormalizeMode): string {
  if (typeof window === 'undefined') return sourceHtml;
  const container = window.document.createElement('div');
  container.innerHTML = sourceHtml || '';

  const walker = window.document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }
  for (const textNode of textNodes) {
    const normalized = normalizeTextWhitespace(textNode.nodeValue ?? '');
    textNode.nodeValue = normalized;
  }

  const blocks = Array.from(container.querySelectorAll('p, div, li'));
  for (const el of blocks) {
    if (el.classList.contains('docPrint')) continue;
    const hasMeaningfulChild = !!el.querySelector('table, img, hr, ul, ol, blockquote');
    const normalizedText = normalizeTextWhitespace(el.textContent ?? '');
    if (!hasMeaningfulChild && !normalizedText) {
      el.remove();
    }
  }

  if (mode === 'strict') {
    const isSimpleTextBlock = (el: Element): el is HTMLDivElement | HTMLParagraphElement => {
      const tag = el.tagName.toLowerCase();
      if (tag !== 'p' && tag !== 'div') return false;
      if ((el as HTMLElement).classList.contains('docPrint')) return false;
      return !el.querySelector('table, ul, ol, li, blockquote, img, hr');
    };

    const normalizeBlockText = (el: Element): string => {
      const clone = el.cloneNode(true) as HTMLElement;
      for (const br of Array.from(clone.querySelectorAll('br'))) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      return normalizeTextWhitespace(clone.textContent ?? '');
    };

    const mergeSimpleBlocksIn = (root: ParentNode) => {
      const nodes = Array.from(root.childNodes);
      let i = 0;
      while (i < nodes.length) {
        const node = nodes[i];
        if (!(node instanceof HTMLElement) || !isSimpleTextBlock(node)) {
          i += 1;
          continue;
        }
        const group: HTMLElement[] = [node];
        let j = i + 1;
        while (j < nodes.length) {
          const next = nodes[j];
          if (!(next instanceof HTMLElement) || !isSimpleTextBlock(next)) break;
          group.push(next);
          j += 1;
        }
        if (group.length > 1) {
          const merged = normalizeTextWhitespace(
            group
              .map((el) => normalizeBlockText(el))
              .filter(Boolean)
              .join(' ')
          );
          group[0].textContent = merged;
          group[0].setAttribute(
            'style',
            'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;'
          );
          for (let k = 1; k < group.length; k += 1) {
            group[k].remove();
          }
        }
        i = j;
      }
    };

    mergeSimpleBlocksIn(container);
    for (const printable of Array.from(container.querySelectorAll('.docPrint'))) {
      mergeSimpleBlocksIn(printable);
    }

    const normalizeCellText = (cell: HTMLTableCellElement): string => {
      const clone = cell.cloneNode(true) as HTMLElement;
      for (const br of Array.from(clone.querySelectorAll('br'))) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      return normalizeTextWhitespace(clone.textContent ?? '');
    };

    const tables = Array.from(container.querySelectorAll('table'));
    for (const table of tables) {
      const getRows = () => Array.from(table.querySelectorAll('tr'));
      const getMaxCols = (rows: HTMLTableRowElement[]) =>
        rows.reduce((acc, row) => {
          const cols = Array.from(row.querySelectorAll('td, th')).reduce((sum, el) => {
            const span = Number((el as HTMLTableCellElement).getAttribute('colspan') ?? '1');
            return sum + (Number.isFinite(span) && span > 0 ? span : 1);
          }, 0);
          return Math.max(acc, cols);
        }, 1);

      const initialRows = getRows();
      if (initialRows.length === 0) continue;
      const rowTexts = initialRows.map((row) => {
        const cells = Array.from(row.querySelectorAll('td, th')) as HTMLTableCellElement[];
        return normalizeTextWhitespace(cells.map((c) => normalizeCellText(c)).join(' '));
      });
      const introStartIdx = rowTexts.findIndex((text) => text.includes('{{executor.companyName}}'));
      const introEndIdx = rowTexts.findIndex(
        (text) =>
          text.includes('далее «Заказчик»') ||
          text.includes('далее "Заказчик"') ||
          text.includes('далее Заказчик')
      );
      if (introStartIdx >= 0 && introEndIdx >= introStartIdx) {
        const mergedText = normalizeTextWhitespace(
          rowTexts
            .slice(introStartIdx, introEndIdx + 1)
            .filter(Boolean)
            .join(' ')
        );
        if (mergedText) {
          const maxCols = getMaxCols(initialRows);
          const replacementRow = window.document.createElement('tr');
          const replacementCell = window.document.createElement('td');
          replacementCell.setAttribute('colspan', String(maxCols));
          replacementCell.setAttribute('style', 'text-align: justify; padding: 2px 0;');
          replacementCell.textContent = mergedText;
          replacementRow.appendChild(replacementCell);
          const first = initialRows[introStartIdx];
          first.replaceWith(replacementRow);
          for (let i = introStartIdx + 1; i <= introEndIdx; i += 1) {
            initialRows[i]?.remove();
          }
        }
      }

      const rows = getRows();
      const maxCols = getMaxCols(rows);
      const extractPointNumber = (text: string): string | null => {
        const normalized = normalizeTextWhitespace(text);
        const match = normalized.match(/^(\d+(?:\.\d+)+)\b/);
        return match ? match[1] : null;
      };
      let i = 0;
      while (i < rows.length) {
        const row = rows[i];
        const cells = Array.from(row.querySelectorAll('td, th')) as HTMLTableCellElement[];
        if (cells.length < 2) {
          i += 1;
          continue;
        }
        const firstCellText = normalizeCellText(cells[0]);
        const pointNumber = extractPointNumber(firstCellText);
        if (!pointNumber) {
          i += 1;
          continue;
        }

        const chunk: string[] = [];
        const markerTail = normalizeTextWhitespace(firstCellText.replace(/^(\d+(?:\.\d+)+)\b/, ''));
        if (markerTail) chunk.push(markerTail);
        const firstBody = normalizeTextWhitespace(
          cells
            .slice(1)
            .map((c) => normalizeCellText(c))
            .join(' ')
        );
        if (firstBody) chunk.push(firstBody);
        let j = i + 1;
        while (j < rows.length) {
          const nextCells = Array.from(
            rows[j].querySelectorAll('td, th')
          ) as HTMLTableCellElement[];
          if (nextCells.length === 0) break;
          const marker = normalizeCellText(nextCells[0]);
          if (extractPointNumber(marker)) break;
          const nextJoined = normalizeTextWhitespace(
            nextCells.map((c) => normalizeCellText(c)).join(' ')
          );
          if (/^\d+\.\s+[А-ЯA-ZЁ]/.test(nextJoined)) break;
          const nextBody = normalizeTextWhitespace(
            (marker ? [marker] : [])
              .concat(nextCells.slice(1).map((c) => normalizeCellText(c)))
              .join(' ')
          );
          if (nextBody) chunk.push(nextBody);
          j += 1;
        }
        const mergedPointText = normalizeTextWhitespace(chunk.join(' '));
        const replacementRow = window.document.createElement('tr');
        const numberCell = window.document.createElement('td');
        numberCell.textContent = pointNumber;
        numberCell.setAttribute(
          'style',
          'text-align: justify; padding: 2px 0; vertical-align: top;'
        );
        const bodyCell = window.document.createElement('td');
        bodyCell.setAttribute('colspan', String(Math.max(1, maxCols - 1)));
        bodyCell.setAttribute('style', 'text-align: justify; padding: 2px 0;');
        bodyCell.textContent = mergedPointText;
        replacementRow.append(numberCell, bodyCell);
        row.replaceWith(replacementRow);
        if (j - i > 1) {
          for (let k = i + 1; k < j; k += 1) {
            rows[k]?.remove();
          }
        }
        i = j;
      }
    }

    const paragraphs = Array.from(container.querySelectorAll('p'));
    for (const p of paragraphs) {
      if (p.classList.contains('docPrint')) continue;
      const brNodes = Array.from(p.querySelectorAll('br'));
      for (const br of brNodes) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      p.setAttribute('style', 'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;');
      p.textContent = normalizeTextWhitespace(p.textContent ?? '');
    }

    const spans = Array.from(container.querySelectorAll('span'));
    for (const span of spans) {
      if (span.attributes.length === 0) {
        span.replaceWith(...Array.from(span.childNodes));
      }
    }
  }

  return container.innerHTML;
}

function stripDangerousInlineScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

function extractHtmlBodyInner(full: string): string {
  const match = full.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return stripDangerousInlineScripts((match ? match[1] : full).trim());
}

/** Импорт из Word «Веб-страница»: оборачиваем в `.docPrint`, если корня ещё нет. */
function ensureDocPrintRootWrapper(inner: string): string {
  const t = extractHtmlBodyInner(inner);
  if (!t) return '<div class="docPrint"></div>';
  if (
    /<div\b[^>]*\bclass\s*=\s*["'][^"']*\bdocPrint\b/i.test(t) ||
    /<div\b[^>]*\bclass\s*=\s*docPrint\b/i.test(t)
  ) {
    return t;
  }
  return `<div class="docPrint">\n${t}\n</div>`;
}

export function ContractDocumentsTemplatesLibraryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [items, setItems] = useState<ContractTemplatePreset[]>([]);
  const [activeTemplateTab, setActiveTemplateTab] = useState<RepairTemplateTabId>('contract');
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [copyTargetTab, setCopyTargetTab] = useState<RepairTemplateTabId>('actStart');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
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
  const [visualHistory, setVisualHistory] = useState<string[]>([]);
  const [visualHistoryIndex, setVisualHistoryIndex] = useState(-1);
  const [firstExecutorProfile, setFirstExecutorProfile] = useState<ExecutorRequisiteProfile | null>(
    null
  );
  const [firstSignatoryProfile, setFirstSignatoryProfile] =
    useState<ContractSignatoryProfile | null>(null);
  const [previewFontSizePx, setPreviewFontSizePx] = useState(12);
  const [previewZoomPct, setPreviewZoomPct] = useState(100);
  const [visualZoomPct, setVisualZoomPct] = useState(100);
  const [visualEditorHeightPx, setVisualEditorHeightPx] = useState<number | null>(null);
  const [previewPaneHeightPx, setPreviewPaneHeightPx] = useState<number | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const templateHtmlFileInputRef = useRef<HTMLInputElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const visualSelectionRangeRef = useRef<Range | null>(null);
  const visualHistoryRef = useRef<string[]>([]);
  const visualHistoryIndexRef = useRef(-1);
  const uiPrefsLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        previewFontSizePx?: number;
        previewZoomPct?: number;
        visualZoomPct?: number;
        visualEditorHeightPx?: number;
        previewPaneHeightPx?: number;
      };
      if (typeof parsed.previewFontSizePx === 'number') {
        setPreviewFontSizePx(clampInt(parsed.previewFontSizePx, 10, 20));
      }
      if (typeof parsed.previewZoomPct === 'number') {
        setPreviewZoomPct(
          clampInt(
            parsed.previewZoomPct,
            TEMPLATE_EDITOR_ZOOM_MIN_PCT,
            TEMPLATE_EDITOR_ZOOM_MAX_PCT
          )
        );
      }
      if (typeof parsed.visualZoomPct === 'number') {
        setVisualZoomPct(
          clampInt(parsed.visualZoomPct, TEMPLATE_EDITOR_ZOOM_MIN_PCT, TEMPLATE_EDITOR_ZOOM_MAX_PCT)
        );
      }
      if (typeof parsed.visualEditorHeightPx === 'number') {
        setVisualEditorHeightPx(clampInt(parsed.visualEditorHeightPx, 220, 2400));
      }
      if (typeof parsed.previewPaneHeightPx === 'number') {
        setPreviewPaneHeightPx(clampInt(parsed.previewPaneHeightPx, 220, 2400));
      }
    } catch {
      // ignore broken localStorage payload
    } finally {
      uiPrefsLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!uiPrefsLoadedRef.current) return;
    try {
      window.localStorage.setItem(
        TEMPLATES_UI_PREFS_KEY,
        JSON.stringify({
          previewFontSizePx,
          previewZoomPct,
          visualZoomPct,
          visualEditorHeightPx,
          previewPaneHeightPx,
        })
      );
    } catch {
      // ignore localStorage write issues
    }
  }, [previewFontSizePx, previewZoomPct, visualZoomPct, visualEditorHeightPx, previewPaneHeightPx]);

  const captureVisualEditorHeight = () => {
    const h = visualEditorRef.current?.offsetHeight;
    if (!h) return;
    setVisualEditorHeightPx(clampInt(h, 220, 2400));
  };

  const capturePreviewPaneHeight = () => {
    const h = previewPaneRef.current?.offsetHeight;
    if (!h) return;
    setPreviewPaneHeightPx(clampInt(h, 220, 2400));
  };

  useEffect(() => {
    visualHistoryRef.current = visualHistory;
  }, [visualHistory]);

  useEffect(() => {
    if (!showSaveSuccessModal) return;
    const timer = window.setTimeout(() => setShowSaveSuccessModal(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showSaveSuccessModal]);

  useEffect(() => {
    visualHistoryIndexRef.current = visualHistoryIndex;
  }, [visualHistoryIndex]);

  const pushVisualHistory = (nextHtml: string) => {
    const prev = visualHistoryRef.current;
    const idx = visualHistoryIndexRef.current;
    const base = idx >= 0 ? prev.slice(0, idx + 1) : [];
    if (base.length > 0 && base[base.length - 1] === nextHtml) return;
    const next = [...base, nextHtml];
    visualHistoryRef.current = next;
    visualHistoryIndexRef.current = next.length - 1;
    setVisualHistory(next);
    setVisualHistoryIndex(next.length - 1);
  };

  const resetVisualHistory = (htmlSnapshot: string) => {
    visualHistoryRef.current = [htmlSnapshot];
    visualHistoryIndexRef.current = 0;
    setVisualHistory([htmlSnapshot]);
    setVisualHistoryIndex(0);
  };

  const handleTemplateHtmlFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !isSuperAdmin) return;
    setError(null);
    setOk(null);
    try {
      const raw = await readWordHtmlExportFileAsString(file);
      const wrapped = ensureDocPrintRootWrapper(raw);
      const next = applyWordImportedDocPrintCompact(wrapped);
      setHtml(next);
      setEditorMode('html');
      setVisualDraftHtml(next);
      resetVisualHistory(next);
      setOk(
        `Файл «${file.name}» загружен в поле HTML (кодировка windows-1251/UTF-8 определяется автоматически). Для фрагментов Word с классом WordSection1 добавлены более плотные отступы и печать с тем же классом docPrintWordCompact. Ползунок «Масштаб» у конструктора/предпросмотра меняет только отображение на экране, не печать. Для правок в конструкторе нажмите «HTML → конструктор».`
      );
    } catch {
      setError('Не удалось прочитать файл');
    }
  };

  const applyVisualSnapshot = (htmlSnapshot: string) => {
    setVisualDraftHtml(htmlSnapshot);
    setHtml(htmlSnapshot);
    const editor = visualEditorRef.current;
    if (!editor) return;
    const prevScrollTop = editor.scrollTop;
    const wasFocused = window.document.activeElement === editor;
    editor.innerHTML = htmlSnapshot;
    window.requestAnimationFrame(() => {
      editor.scrollTop = prevScrollTop;
      if (wasFocused) {
        editor.focus({ preventScroll: true });
      }
    });
  };

  const captureVisualSelection = () => {
    const editor = visualEditorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    visualSelectionRangeRef.current = range.cloneRange();
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

  const templateData = useMemo(
    () =>
      repairPackageFormForTemplate(
        buildRepairTemplatePreviewFallbackData(firstExecutorProfile, firstSignatoryProfile)
      ),
    [firstExecutorProfile, firstSignatoryProfile]
  );

  const renderedPreview = useMemo(
    () =>
      applyTemplate(html || '', templateData, {
        autoInsertContractSignatures: activeTemplateTab === 'contract',
        plainCustomerPlaceholders: isRepairPlainCustomerTab(activeTemplateTab),
      }),
    [html, templateData, activeTemplateTab]
  );

  const renderedPreviewDisplay = useMemo(
    () =>
      isRepairActTwinOneSheetTab(activeTemplateTab)
        ? wrapRepairActTwinCopiesOnOnePageHtml(renderedPreview)
        : renderedPreview,
    [renderedPreview, activeTemplateTab]
  );
  const itemsByActiveTab = useMemo(
    () =>
      items.filter((it) => {
        if (normalizeTemplateTabId(it.tabId) !== activeTemplateTab) return false;
        return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
      }),
    [items, activeTemplateTab, showArchivedTemplates]
  );
  const templatesCountByTab = useMemo(() => {
    const out: Record<RepairTemplateTabId, number> = {
      contract: 0,
      estimate: 0,
      actStart: 0,
      actAcceptance: 0,
      cashOrder: 0,
      questionnaire1: 0,
      questionnaire2: 0,
      addendum: 0,
      workOrder: 0,
      workOrderAddendum: 0,
      productionLog: 0,
    };
    for (const it of items) {
      if (it.archived) continue;
      const tab = normalizeTemplateTabId(it.tabId);
      out[tab] += 1;
    }
    return out;
  }, [items]);
  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [templatesRes, executorRes, signatoryRes] = await Promise.allSettled([
          getContractDocumentTemplatePresets('REPAIR'),
          getContractDocumentExecutorProfiles('REPAIR'),
          getContractDocumentSignatoryProfiles('REPAIR'),
        ]);
        if (executorRes.status === 'fulfilled') {
          setFirstExecutorProfile(executorRes.value.items?.[0] ?? null);
        }
        if (signatoryRes.status === 'fulfilled') {
          setFirstSignatoryProfile(signatoryRes.value.items?.[0] ?? null);
        }
        if (templatesRes.status !== 'fulfilled') {
          throw new Error('Не удалось загрузить библиотеку шаблонов');
        }
        const next = (templatesRes.value.items ?? []).map((it) =>
          normalizeContractTemplatePreset(it)
        );
        setItems(next);
        const tabItems = next.filter(
          (it) => normalizeTemplateTabId(it.tabId) === activeTemplateTab && !it.archived
        );
        const firstId = tabItems.find((it) => it.isDefault)?.id ?? tabItems[0]?.id ?? '';
        setEditingId(firstId);
        const t = tabItems.find((it) => it.id === firstId);
        setTitle(t?.title ?? '');
        setHtml(t?.html ?? '');
        setVisualDraftHtml(t?.html ?? '');
        resetVisualHistory(t?.html ?? '');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку шаблонов');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = async (next: ContractTemplatePreset[], successText: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const normalized = next.map((it) => normalizeContractTemplatePreset(it));
      await putContractDocumentTemplatePresets({ kind: 'REPAIR', items: normalized });
      setItems(normalized);
      setOk(successText);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const selectTemplate = (id: string) => {
    setEditingId(id);
    const t = itemsByActiveTab.find((it) => it.id === id);
    setTitle(t?.title ?? '');
    setHtml(t?.html ?? '');
    setVisualDraftHtml(t?.html ?? '');
    resetVisualHistory(t?.html ?? '');
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
      ? items.map((it) =>
          it.id === id ? { ...it, title: t, html: h, tabId: activeTemplateTab } : it
        )
      : [
          ...items,
          {
            id,
            title: t,
            html: h,
            tabId: activeTemplateTab,
            isDefault: itemsByActiveTab.length === 0,
            archived: false,
            isProtected: false,
          },
        ];
    const isSaved = await persist(next, 'Шаблон сохранен.');
    if (!isSaved) return;
    setEditingId(id);
    setShowSaveSuccessModal(true);
  };

  const createTemplate = (mode: 'copy' | 'blank') => {
    if (!isSuperAdmin) return;
    setEditingId(`tpl_${Date.now()}`);
    setTitle(mode === 'copy' ? 'Копия шаблона' : 'Новый шаблон');
    const next = mode === 'copy' ? html : '<div class="docPrint"></div>';
    setHtml(next);
    setVisualDraftHtml(next);
    resetVisualHistory(next);
  };

  useEffect(() => {
    if (editorMode === 'visual' && visualEditorRef.current) {
      visualEditorRef.current.innerHTML = visualDraftHtml || '';
      if (visualHistoryRef.current.length === 0) {
        resetVisualHistory(visualDraftHtml || '');
      }
    }
    // Важно: НЕ зависим от visualDraftHtml, иначе при каждом onInput перезаписываем DOM
    // и курсор прыгает в начало.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, editingId]);

  useEffect(() => {
    const firstId =
      itemsByActiveTab.find((it) => it.isDefault)?.id ?? itemsByActiveTab[0]?.id ?? '';
    setEditingId(firstId);
    const t = itemsByActiveTab.find((it) => it.id === firstId);
    setTitle(t?.title ?? '');
    setHtml(t?.html ?? '');
    setVisualDraftHtml(t?.html ?? '');
    resetVisualHistory(t?.html ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTemplateTab, items.length, showArchivedTemplates]);

  const deleteTemplate = async () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current) return;
    if (current.isProtected) {
      setError(
        'Шаблон защищён от удаления. Снимите защиту (чекбокс ниже), сохраните при необходимости, затем снова нажмите «В архив».'
      );
      return;
    }
    if (current.archived) {
      setError('Этот шаблон уже в архиве.');
      return;
    }
    const name = (current.title ?? title).trim() || 'без названия';
    const ok = window.confirm(
      `Шаблон «${name}» будет перенесён в архив (не в списке выбора). Его можно восстановить, включив показ архива. Продолжить?`
    );
    if (!ok) return;
    const tab = activeTemplateTab;
    let next = items.map((it) =>
      it.id === editingId ? { ...it, archived: true, isDefault: false } : it
    );
    let activeOnTab = next.filter((it) => normalizeTemplateTabId(it.tabId) === tab && !it.archived);
    if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
      const pickId = activeOnTab[0].id;
      next = next.map((it) =>
        normalizeTemplateTabId(it.tabId) !== tab
          ? it
          : { ...it, isDefault: !it.archived && it.id === pickId }
      );
      activeOnTab = next.filter((it) => normalizeTemplateTabId(it.tabId) === tab && !it.archived);
    }
    const saved = await persist(next, 'Шаблон перенесён в архив.');
    if (!saved) return;
    const fallback = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
    if (fallback) selectTemplate(fallback);
    else {
      setEditingId('');
      setTitle('');
      setHtml('');
      setVisualDraftHtml('');
      resetVisualHistory('');
    }
  };

  const restoreArchivedTemplate = async () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current?.archived) return;
    const next = items.map((it) => (it.id === editingId ? { ...it, archived: false } : it));
    await persist(next, 'Шаблон восстановлен из архива.');
  };

  const toggleTemplateProtected = async (value: boolean) => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (current?.archived) {
      setError('Восстановите шаблон из архива, чтобы менять защиту.');
      return;
    }
    const next = items.map((it) => (it.id === editingId ? { ...it, isProtected: value } : it));
    await persist(
      next,
      value
        ? 'Включена защита от удаления и архивации.'
        : 'Защита снята. Шаблон можно перенести в архив.'
    );
  };

  const setDefault = async () => {
    if (!isSuperAdmin || !editingId) return;
    const cur = items.find((it) => it.id === editingId);
    if (cur?.archived) {
      setError('Нельзя сделать архивный шаблон по умолчанию. Сначала восстановите его из архива.');
      return;
    }
    const next = items.map((it) => ({
      ...it,
      isDefault:
        normalizeTemplateTabId(it.tabId) === activeTemplateTab
          ? it.id === editingId
          : Boolean(it.isDefault),
    }));
    await persist(next, 'Шаблон по умолчанию обновлен.');
  };

  const copyTemplateToAnotherTab = async () => {
    if (!isSuperAdmin) return;
    const source = itemsByActiveTab.find((it) => it.id === editingId) ?? itemsByActiveTab[0];
    if (!source) {
      setError('Выберите шаблон для копирования.');
      return;
    }
    if (copyTargetTab === activeTemplateTab) {
      setError('Выберите другую вкладку назначения.');
      return;
    }
    const targetItems = items.filter(
      (it) => normalizeTemplateTabId(it.tabId) === copyTargetTab && !it.archived
    );
    const copied: ContractTemplatePreset = {
      id: `tpl_${Date.now()}`,
      title: `${source.title} (копия)`,
      html: source.html,
      tabId: copyTargetTab,
      isDefault: targetItems.length === 0,
      archived: false,
      isProtected: false,
    };
    const okSaved = await persist(
      [...items, copied],
      `Шаблон скопирован в «${REPAIR_DOCUMENT_TAB_LABELS[copyTargetTab]}».`
    );
    if (!okSaved) return;
    setActiveTemplateTab(copyTargetTab);
    setEditingId(copied.id);
    setTitle(copied.title);
    setHtml(copied.html);
    setVisualDraftHtml(copied.html);
    resetVisualHistory(copied.html);
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
      pushVisualHistory(next);
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
    if (editorMode === 'visual') {
      const cmd =
        align === 'left'
          ? 'justifyLeft'
          : align === 'center'
            ? 'justifyCenter'
            : align === 'right'
              ? 'justifyRight'
              : 'justifyFull';
      visualEditorRef.current?.focus();
      document.execCommand(cmd);
      const next = visualEditorRef.current?.innerHTML ?? '';
      setVisualDraftHtml(next);
      setHtml(next);
      pushVisualHistory(next);
      captureVisualSelection();
      return;
    }
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
<table class="contractRequisitesBlock" style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
      <p style="text-align: center; margin: 0 0 8pt;">ПОДРЯДЧИК</p>
      <p style="margin: 0 0 4pt;">{{executor.companyName}}</p>
      <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
      <p style="margin: 0 0 4pt;">Юр. адрес: {{executor.legalAddress}}</p>
      <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
      <p style="margin: 0 0 8pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; margin: 0 0 8pt;">ЗАКАЗЧИК</p>
      <p style="margin: 0 0 4pt;">{{customer.fullName|plain}}</p>
      <p style="margin: 0 0 4pt;">Адрес: {{customer.address|plain}}</p>
      <p style="margin: 0 0 4pt;">Тел.: {{customer.phone|plain}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{customer.email|plain}}</p>
      <p style="margin: 0 0 4pt;">Банковские реквизиты:</p>
      <p style="margin: 0 0 4pt; white-space: pre-wrap;">{{customer.bankDetails|plain}}</p>
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
      pushVisualHistory(next);
      setOk('Текст из буфера вставлен и разбит на абзацы.');
    } catch {
      const manual = window.prompt('Вставьте текст договора:');
      if (!manual) return;
      const next = plainTextToParagraphHtml(manual);
      if (!next) return;
      setVisualDraftHtml(next);
      setHtml(next);
      if (visualEditorRef.current) visualEditorRef.current.innerHTML = next;
      pushVisualHistory(next);
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
      pushVisualHistory(next);
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
      pushVisualHistory(next);
      setOk('Текст добавлен в конец шаблона.');
    }
  };
  const handleVisualUndo = () => {
    if (!isSuperAdmin || editorMode !== 'visual') return;
    if (visualHistoryIndexRef.current <= 0) return;
    const nextIndex = visualHistoryIndexRef.current - 1;
    const snapshot = visualHistoryRef.current[nextIndex] ?? '';
    visualHistoryIndexRef.current = nextIndex;
    setVisualHistoryIndex(nextIndex);
    applyVisualSnapshot(snapshot);
  };
  const handleVisualRedo = () => {
    if (!isSuperAdmin || editorMode !== 'visual') return;
    if (
      visualHistoryIndexRef.current < 0 ||
      visualHistoryIndexRef.current >= visualHistoryRef.current.length - 1
    ) {
      return;
    }
    const nextIndex = visualHistoryIndexRef.current + 1;
    const snapshot = visualHistoryRef.current[nextIndex] ?? '';
    visualHistoryIndexRef.current = nextIndex;
    setVisualHistoryIndex(nextIndex);
    applyVisualSnapshot(snapshot);
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
    pushVisualHistory(next);
    setOk(
      mode === 'strict'
        ? 'Выполнена строгая нормализация: очищены пробелы, пустые строки и выровнены абзацы.'
        : 'Выполнена мягкая нормализация: убраны лишние пробелы и пустые строки.'
    );
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
    { label: 'Нормализовать (мягко)', onClick: () => normalizeTemplateText('soft') },
    { label: 'Нормализовать (строго)', onClick: () => normalizeTemplateText('strict') },
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
    { label: 'Нормализовать (мягко)', onClick: () => normalizeTemplateText('soft') },
    { label: 'Нормализовать (строго)', onClick: () => normalizeTemplateText('strict') },
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
    <div className={`${styles.page} ${styles.pageWide} ${styles.templatesLibraryPage}`}>
      <div className={styles.editorHeader}>
        <div>
          <h1 className={styles.title}>Библиотека шаблонов документов</h1>
        </div>
        <Link className={styles.secondaryBtn} href="/admin/contract-documents/repair">
          К разделу «Ремонт»
        </Link>
      </div>

      <div className={styles.templatesLibraryMessages}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {!error && ok ? <p className={styles.hint}>{ok}</p> : null}
      </div>
      {!isSuperAdmin ? (
        <p className={styles.hint}>Изменение библиотеки шаблонов доступно только супер-админу.</p>
      ) : null}

      <div className={`${styles.sectionCard} ${styles.templatesLibraryControls}`}>
        <div className={styles.templatesLibraryMeta}>
          <div className={styles.field}>
            <label>Тип</label>
            <select
              value={activeTemplateTab}
              onChange={(e) => setActiveTemplateTab(normalizeTemplateTabId(e.target.value))}
            >
              {TEMPLATE_TAB_IDS.map((tab) => (
                <option key={tab} value={tab}>
                  {REPAIR_DOCUMENT_TAB_LABELS[tab]} ({templatesCountByTab[tab]})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Шаблон</label>
            <select
              value={editingId}
              disabled={loading || itemsByActiveTab.length === 0}
              onChange={(e) => selectTemplate(e.target.value)}
            >
              {itemsByActiveTab.length === 0 ? <option value="">— нет —</option> : null}
              {itemsByActiveTab.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.title}
                  {it.isDefault ? ' (по умолч.)' : ''}
                  {it.archived ? ' [арх.]' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label>Имя</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isSuperAdmin}
            />
          </div>
          <div className={styles.templatesLibraryMetaRow}>
            {isSuperAdmin && editingId ? (
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(items.find((it) => it.id === editingId)?.isProtected)}
                  disabled={Boolean(items.find((it) => it.id === editingId)?.archived) || saving}
                  onChange={(e) => void toggleTemplateProtected(e.target.checked)}
                />
                Защита от удаления
              </label>
            ) : null}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => setShowArchivedTemplates((v) => !v)}
              style={{ justifyContent: 'flex-start' }}
            >
              {showArchivedTemplates ? 'Активные' : 'Архив'}
            </button>
          </div>
        </div>
        {isSuperAdmin ? (
          <div className={styles.templatesLibraryToolbar}>
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving}
              onClick={() => void saveTemplate()}
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => createTemplate('copy')}
              disabled={!editingId}
            >
              Копия
            </button>
            <div className={styles.templatesLibraryCopyRow}>
              <span>Вкладка</span>
              <select
                value={copyTargetTab}
                onChange={(e) => setCopyTargetTab(normalizeTemplateTabId(e.target.value))}
              >
                {TEMPLATE_TAB_IDS.map((tab) => (
                  <option key={tab} value={tab} disabled={tab === activeTemplateTab}>
                    {REPAIR_DOCUMENT_TAB_LABELS[tab]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void copyTemplateToAnotherTab()}
                disabled={!editingId || copyTargetTab === activeTemplateTab}
              >
                Копировать
              </button>
            </div>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => createTemplate('blank')}
            >
              Пустой
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!editingId || Boolean(items.find((it) => it.id === editingId)?.archived)}
              onClick={() => void setDefault()}
            >
              По умолчанию
            </button>
            {items.find((it) => it.id === editingId)?.archived ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={!editingId || saving}
                onClick={() => void restoreArchivedTemplate()}
              >
                Из архива
              </button>
            ) : (
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={
                  !editingId ||
                  Boolean(items.find((it) => it.id === editingId)?.isProtected) ||
                  saving
                }
                title={
                  items.find((it) => it.id === editingId)?.isProtected
                    ? 'Снимите защиту, чтобы перенести шаблон в архив'
                    : undefined
                }
                onClick={() => void deleteTemplate()}
              >
                В архив
              </button>
            )}
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => {
                const actTwinTab = isRepairActTwinOneSheetTab(activeTemplateTab);
                const printBody = actTwinTab
                  ? wrapRepairActTwinCopiesOnOnePageHtml(renderedPreview)
                  : renderedPreview;
                const printDocTitle = actTwinTab
                  ? ''
                  : `Шаблон: ${REPAIR_DOCUMENT_TAB_LABELS[activeTemplateTab]} / ${title || 'без названия'}`;
                printDocumentHtml(
                  printBody,
                  printDocTitle,
                  activeTemplateTab === 'contract'
                    ? { marginFooter: pickPrintMarginFooterNames(templateData) }
                    : {}
                );
              }}
            >
              Печать
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin}
              title={
                editorMode === 'visual'
                  ? 'Сформировать HTML из визуального конструктора'
                  : 'Загрузить HTML из поля в визуальный конструктор'
              }
              onClick={() => {
                if (editorMode === 'visual') {
                  const next = visualEditorRef.current?.innerHTML ?? visualDraftHtml;
                  setVisualDraftHtml(next);
                  setHtml(next);
                  pushVisualHistory(next);
                } else {
                  setVisualDraftHtml(html);
                  resetVisualHistory(html);
                }
              }}
            >
              {editorMode === 'visual' ? 'HTML ← конструктор' : 'HTML → конструктор'}
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin || editorMode !== 'visual'}
              title="Вставить текст договора из буфера с авто-разбивкой на абзацы"
              onClick={() => void handlePasteContractTextFromClipboard()}
            >
              Текст → абзацы
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              disabled={!isSuperAdmin || editorMode !== 'visual'}
              title="Добавить текст из буфера в конец шаблона"
              onClick={() => void handleAppendContractTextFromClipboard()}
            >
              + текст в конец
            </button>
          </div>
        ) : null}
      </div>

      <div className={`${styles.contractTopTools} ${styles.blockTools}`}>
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
                onMouseDown={(e) => e.preventDefault()}
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
                    onMouseDown={(e) => e.preventDefault()}
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
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  disabled={!isSuperAdmin}
                  title="Загрузить .html / .htm (например, файл «Веб-страница, отфильтрованная» из Word). RTF и .docx сюда не подходят — сначала сохраните как отфильтрованную веб-страницу."
                  onClick={() => templateHtmlFileInputRef.current?.click()}
                >
                  Импорт из HTML-файла…
                </button>
                <input
                  ref={templateHtmlFileInputRef}
                  type="file"
                  accept=".html,.htm,text/html,application/xhtml+xml"
                  style={{ display: 'none' }}
                  onChange={(ev) => void handleTemplateHtmlFileImport(ev)}
                />
                <span className={styles.hint} style={{ margin: 0, fontSize: 12, maxWidth: '100%' }}>
                  ПКО из Word: «Файл» → «Сохранить как» → тип «Веб-страница, отфильтрованная
                  (*.html)» — затем импорт сюда. Вставка RTF или сложной вёрстки в визуальный
                  редактор в браузере даёт плохой результат; правьте при необходимости в режиме
                  HTML.
                </span>
              </div>
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
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <label className={styles.contractEditorLabel} style={{ marginBottom: 0 }}>
                  Визуальный конструктор
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <label
                    className={styles.field}
                    style={{ minWidth: 150, gap: 4, flexDirection: 'row', alignItems: 'center' }}
                  >
                    <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      Масштаб: {visualZoomPct}%
                    </span>
                    <input
                      type="number"
                      min={TEMPLATE_EDITOR_ZOOM_MIN_PCT}
                      max={TEMPLATE_EDITOR_ZOOM_MAX_PCT}
                      step={5}
                      value={visualZoomPct}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n)) return;
                        setVisualZoomPct(
                          Math.max(
                            TEMPLATE_EDITOR_ZOOM_MIN_PCT,
                            Math.min(TEMPLATE_EDITOR_ZOOM_MAX_PCT, n)
                          )
                        );
                      }}
                      style={{ height: 24, padding: '2px 6px', width: 66 }}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!isSuperAdmin || editorMode !== 'visual'}
                    onClick={handleVisualUndo}
                    title="Назад"
                    style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                    aria-label="Назад"
                  >
                    ↶
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!isSuperAdmin || editorMode !== 'visual'}
                    onClick={handleVisualRedo}
                    title="Вперёд"
                    style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                    aria-label="Вперёд"
                  >
                    ↷
                  </button>
                </div>
              </div>
              <div
                ref={visualEditorRef}
                className={`${styles.contractHtmlTextarea} ${styles.visualEditor} ${styles.visualEditorScrollable}`}
                contentEditable={isSuperAdmin}
                suppressContentEditableWarning
                onInput={(e) => {
                  const next = (e.currentTarget as HTMLDivElement).innerHTML;
                  setVisualDraftHtml(next);
                  setHtml(next);
                  pushVisualHistory(next);
                  captureVisualSelection();
                }}
                onKeyUp={captureVisualSelection}
                onMouseUp={captureVisualSelection}
                onFocus={captureVisualSelection}
                onBlur={captureVisualEditorHeight}
                style={{
                  whiteSpace: 'normal',
                  zoom: `${visualZoomPct}%`,
                  height: visualEditorHeightPx ? `${visualEditorHeightPx}px` : undefined,
                }}
              />
            </>
          )}
        </div>
        <div className={styles.contractPreviewColumn}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              marginBottom: 3,
            }}
          >
            <h3 className={styles.previewBlockTitle} style={{ margin: 0 }}>
              Предпросмотр
            </h3>
            <div
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                gap: 10,
                alignItems: 'center',
                fontSize: 12,
              }}
            >
              <label
                className={styles.field}
                style={{ minWidth: 180, gap: 6, flexDirection: 'row', alignItems: 'center' }}
              >
                <span style={{ fontSize: 12, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  Текст: {previewFontSizePx}px
                </span>
                <input
                  type="number"
                  min={10}
                  max={20}
                  step={1}
                  value={previewFontSizePx}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setPreviewFontSizePx(Math.max(10, Math.min(20, n)));
                  }}
                  style={{ height: 24, padding: '2px 6px', width: 64 }}
                />
              </label>
              <label
                className={styles.field}
                style={{ minWidth: 190, gap: 6, flexDirection: 'row', alignItems: 'center' }}
              >
                <span style={{ fontSize: 12, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  Масштаб: {previewZoomPct}%
                </span>
                <input
                  type="number"
                  min={TEMPLATE_EDITOR_ZOOM_MIN_PCT}
                  max={TEMPLATE_EDITOR_ZOOM_MAX_PCT}
                  step={5}
                  value={previewZoomPct}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    setPreviewZoomPct(
                      Math.max(
                        TEMPLATE_EDITOR_ZOOM_MIN_PCT,
                        Math.min(TEMPLATE_EDITOR_ZOOM_MAX_PCT, n)
                      )
                    );
                  }}
                  style={{ height: 24, padding: '2px 6px', width: 68 }}
                />
              </label>
            </div>
          </div>
          <div
            ref={previewPaneRef}
            className={`${styles.docPane} ${styles.previewResizable}`}
            style={{ height: previewPaneHeightPx ? `${previewPaneHeightPx}px` : undefined }}
            onMouseUp={capturePreviewPaneHeight}
            onTouchEnd={capturePreviewPaneHeight}
          >
            <div
              style={{
                fontSize: `${previewFontSizePx}px`,
                zoom: `${previewZoomPct}%`,
                width: '100%',
                overflowX: 'hidden',
              }}
              dangerouslySetInnerHTML={{ __html: renderedPreviewDisplay }}
            />
          </div>
        </div>
      </div>
      {showSaveSuccessModal ? (
        <div
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            zIndex: 2000,
            background: '#111827',
            color: '#fff',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
          }}
          role="status"
          aria-live="polite"
        >
          <span>Шаблон успешно сохранен.</span>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowSaveSuccessModal(false)}
            style={{ padding: '4px 8px', minHeight: 24 }}
          >
            Закрыть
          </button>
        </div>
      ) : null}
    </div>
  );
}
