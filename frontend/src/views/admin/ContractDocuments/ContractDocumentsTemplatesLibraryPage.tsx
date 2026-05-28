'use client';

import {
  ArrowsPointingOutIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  Bars3Icon,
  Bars4Icon,
  BuildingOffice2Icon,
  ChatBubbleBottomCenterTextIcon,
  DocumentPlusIcon,
  ListBulletIcon,
  MinusIcon,
  NumberedListIcon,
  PencilSquareIcon,
  SparklesIcon,
  Square2StackIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type ContractDocumentPackageKind,
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
  sanitizeContractTemplatePresetForApi,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentTemplatePresetsTrash,
  trashContractTemplatePreset,
} from '@/shared/api/admin-contract-document-template-presets-trash';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import {
  AdminToolbarArchiveButton,
  AdminToolbarIconButton,
  AdminToolbarTrashButton,
  useAdminTrashCount,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import measurementFormStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';
import { TemplateTrashModal } from '@/views/admin/ContractDocuments/TemplateTrashModal';
import { applyTemplate } from '@/views/admin/ContractDocuments/repair/applyTemplate';
import {
  isRepairActTwinOneSheetTab,
  isRepairPlainCustomerTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from '@/views/admin/ContractDocuments/repair/repairActTwinCopiesOnOnePageHtml';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from '@/views/admin/ContractDocuments/repair/repairContractPlaceholders';
import { buildRepairContractRequisitesInsertHtml } from '@/views/admin/ContractDocuments/repair/repairContractRequisitesLayout';
import {
  REPAIR_LIBRARY_TEMPLATE_TAB_IDS,
  REPAIR_LIBRARY_TEMPLATE_TAB_LABELS,
  type RepairLibraryTemplateTabId,
  normalizeRepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from '@/views/admin/ContractDocuments/repair/repairLibraryTemplateTabs';
import {
  type RepairTemplatePreviewCustomerKind,
  buildRepairTemplatePreviewFallbackData,
  repairPackageFormForTemplate,
} from '@/views/admin/ContractDocuments/repair/repairPackageForm';
import { isRepairLibraryTemplatePreset } from '@/views/admin/ContractDocuments/repair/repairTemplatePresetTab';
import {
  applyWordImportedDocPrintCompact,
  readWordHtmlExportFileAsString,
} from '@/views/admin/ContractDocuments/repair/wordHtmlImport';

import styles from './ContractDocuments.module.css';

type FormatTool = {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function FormatToolbarSvgIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  return <Icon className={styles.formatToolbarSvg} aria-hidden />;
}

function FormatToolbarGlyph({ children }: { children: React.ReactNode }) {
  return <span className={styles.formatToolbarGlyph}>{children}</span>;
}
const TEMPLATES_UI_PREFS_KEY = 'admin.contractDocuments.templates.uiPrefs';
type NormalizeMode = 'soft' | 'strict';
type TemplatesUiPrefs = {
  previewFontSizePx?: number;
  previewZoomPct?: number;
  visualZoomPct?: number;
  visualEditorHeightPx?: number;
  previewPaneHeightPx?: number;
  activeLibraryKind?: ContractDocumentPackageKind;
  activeTemplateTab?: string;
  previewCustomerKind?: RepairTemplatePreviewCustomerKind;
  showArchivedTemplates?: boolean;
  selectedTemplateByScope?: Record<string, string>;
};

/** Только экран редактора и предпросмотра; на сохранённый HTML и печать не влияет. */
const TEMPLATE_EDITOR_ZOOM_MIN_PCT = 40;
const TEMPLATE_EDITOR_ZOOM_MAX_PCT = 150;

/** Те же SVG, что в списке расчётов (`ContractDocumentsEstimatesPage`). */
function EstimatesArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-3)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 8v13H3V8" />
      <path d="M23 3v5H1V3z" />
      <path d="M10 12h4" />
    </svg>
  );
}

function TemplatesLibraryExportIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function EstimatesRestoreFromArchiveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--admin-chart-series-1)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function normalizeContractTemplatePreset(it: ContractTemplatePreset): ContractTemplatePreset {
  const tabId = repairLibraryTemplateTabIdFromPreset(it.tabId);
  return sanitizeContractTemplatePresetForApi({
    ...it,
    tabId: tabId ?? it.tabId,
    archived: Boolean(it.archived),
  });
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

const TEMPLATE_LIBRARY_KIND_OPTIONS = [
  { value: 'REPAIR' as const, label: 'Ремонт' },
  { value: 'WINDOWS' as const, label: 'Окна' },
];

function templateLibraryKindLabel(kind: ContractDocumentPackageKind): string {
  const found = TEMPLATE_LIBRARY_KIND_OPTIONS.find((it) => it.value === kind);
  return found?.label ?? kind;
}

export function ContractDocumentsTemplatesLibraryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [items, setItems] = useState<ContractTemplatePreset[]>([]);
  const [activeLibraryKind, setActiveLibraryKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [activeTemplateTab, setActiveTemplateTab] =
    useState<RepairLibraryTemplateTabId>('contract');
  const [previewCustomerKind, setPreviewCustomerKind] =
    useState<RepairTemplatePreviewCustomerKind>('PERSON');
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [templateTrashPending, setTemplateTrashPending] = useState<{
    presetId: string;
    name: string;
  } | null>(null);
  const [templateArchivePending, setTemplateArchivePending] = useState<{
    presetId: string;
    name: string;
  } | null>(null);
  const [autosaveSavedVisible, setAutosaveSavedVisible] = useState(false);
  const lastSavedSnapshotRef = useRef<string>('');
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialHydrationRef = useRef(true);
  /** Блокирует отложенный autosave, пока снимок предыдущей вкладки уходит на сервер. */
  const templateTabSwitchRef = useRef(false);
  /** Блокирует autosave при переключении шаблона после архивации (иначе stale items снимают archived). */
  const templateArchiveSwitchRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState('');
  const [title, setTitle] = useState('');
  const [titleRenameMode, setTitleRenameMode] = useState(false);
  const [html, setHtml] = useState('');
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
  const [placeholdersCollapsed, setPlaceholdersCollapsed] = useState(false);
  const [createTemplateHelpOpen, setCreateTemplateHelpOpen] = useState(false);
  const [visualEditorHeightPx, setVisualEditorHeightPx] = useState<number | null>(null);
  const [previewPaneHeightPx, setPreviewPaneHeightPx] = useState<number | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRenameInputRef = useRef<HTMLInputElement>(null);
  const templateHtmlFileInputRef = useRef<HTMLInputElement>(null);
  const createTemplateHelpHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const visualSelectionRangeRef = useRef<Range | null>(null);
  const visualHistoryRef = useRef<string[]>([]);
  const visualHistoryIndexRef = useRef(-1);
  const uiPrefsLoadedRef = useRef(false);
  const preferredTemplateIdsRef = useRef<Record<string, string>>({});

  const templatesScopeKey = useCallback(
    (kind: ContractDocumentPackageKind, tab: RepairLibraryTemplateTabId, archived: boolean) =>
      `${kind}:${tab}:${archived ? 'arch' : 'active'}`,
    []
  );

  const ensureTemplateDraftForEditing = useCallback(() => {
    if (editingId) return editingId;
    const nextId = `tpl_${Date.now()}`;
    const nextTitle = `Новый шаблон (${REPAIR_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]})`;
    setEditingId(nextId);
    setTitle(nextTitle);
    return nextId;
  }, [editingId, activeTemplateTab]);

  useEffect(() => {
    if (!titleRenameMode) return;
    const id = window.setTimeout(() => {
      titleRenameInputRef.current?.focus();
      titleRenameInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [titleRenameMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as TemplatesUiPrefs;
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
      if (
        parsed.activeLibraryKind &&
        TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === parsed.activeLibraryKind)
      ) {
        setActiveLibraryKind(parsed.activeLibraryKind);
      }
      if (typeof parsed.activeTemplateTab === 'string') {
        setActiveTemplateTab(normalizeRepairLibraryTemplateTabId(parsed.activeTemplateTab));
      }
      if (
        parsed.previewCustomerKind === 'PERSON' ||
        parsed.previewCustomerKind === 'COMPANY' ||
        parsed.previewCustomerKind === 'ENTREPRENEUR'
      ) {
        setPreviewCustomerKind(parsed.previewCustomerKind);
      }
      if (typeof parsed.showArchivedTemplates === 'boolean') {
        setShowArchivedTemplates(parsed.showArchivedTemplates);
      }
      if (parsed.selectedTemplateByScope && typeof parsed.selectedTemplateByScope === 'object') {
        preferredTemplateIdsRef.current = parsed.selectedTemplateByScope;
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
          activeLibraryKind,
          activeTemplateTab,
          previewCustomerKind,
          showArchivedTemplates,
          selectedTemplateByScope: preferredTemplateIdsRef.current,
        })
      );
    } catch {
      // ignore localStorage write issues
    }
  }, [
    previewFontSizePx,
    previewZoomPct,
    visualZoomPct,
    visualEditorHeightPx,
    previewPaneHeightPx,
    activeLibraryKind,
    activeTemplateTab,
    previewCustomerKind,
    showArchivedTemplates,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistOnUnload = () => {
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
            activeLibraryKind,
            activeTemplateTab,
            previewCustomerKind,
            showArchivedTemplates,
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
    previewFontSizePx,
    previewZoomPct,
    visualZoomPct,
    visualEditorHeightPx,
    previewPaneHeightPx,
    activeLibraryKind,
    activeTemplateTab,
    previewCustomerKind,
    showArchivedTemplates,
  ]);

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

  const showCreateTemplateHelp = useCallback(() => {
    if (createTemplateHelpHideTimerRef.current) {
      clearTimeout(createTemplateHelpHideTimerRef.current);
      createTemplateHelpHideTimerRef.current = null;
    }
    setCreateTemplateHelpOpen(true);
  }, []);

  const hideCreateTemplateHelpWithDelay = useCallback(() => {
    if (createTemplateHelpHideTimerRef.current) {
      clearTimeout(createTemplateHelpHideTimerRef.current);
    }
    createTemplateHelpHideTimerRef.current = setTimeout(() => {
      setCreateTemplateHelpOpen(false);
      createTemplateHelpHideTimerRef.current = null;
    }, 250);
  }, []);

  useEffect(
    () => () => {
      if (createTemplateHelpHideTimerRef.current) {
        clearTimeout(createTemplateHelpHideTimerRef.current);
      }
    },
    []
  );

  const readVisualEditorHtml = (): string => visualEditorRef.current?.innerHTML ?? visualDraftHtml;

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

  const syncVisualEditorToHtmlState = useCallback(() => {
    const next = readVisualEditorHtml();
    setVisualDraftHtml(next);
    setHtml(next);
    return next;
  }, [visualDraftHtml]);

  const switchEditorMode = useCallback(
    (mode: 'html' | 'visual') => {
      if (mode === editorMode) return;
      if (mode === 'html') {
        const next = visualEditorRef.current?.innerHTML ?? visualDraftHtml;
        setVisualDraftHtml(next);
        setHtml(next);
        setEditorMode('html');
        return;
      }
      setVisualDraftHtml(html);
      resetVisualHistory(html);
      setEditorMode('visual');
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = html || '';
      }
    },
    [editorMode, html, visualDraftHtml]
  );

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
        buildRepairTemplatePreviewFallbackData(
          firstExecutorProfile,
          firstSignatoryProfile,
          previewCustomerKind
        ),
        { templateTab: activeTemplateTab }
      ),
    [firstExecutorProfile, firstSignatoryProfile, activeTemplateTab, previewCustomerKind]
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
        if (repairLibraryTemplateTabIdFromPreset(it.tabId) !== activeTemplateTab) return false;
        return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
      }),
    [items, activeTemplateTab, showArchivedTemplates]
  );
  const templatesCountByTab = useMemo(() => {
    const out = Object.fromEntries(
      REPAIR_LIBRARY_TEMPLATE_TAB_IDS.map((tab) => [tab, 0])
    ) as Record<RepairLibraryTemplateTabId, number>;
    for (const it of items) {
      if (it.archived) continue;
      const tab = repairLibraryTemplateTabIdFromPreset(it.tabId);
      if (tab && tab in out) out[tab] += 1;
    }
    return out;
  }, [items]);

  const archivedCountOnTab = useMemo(
    () =>
      items.filter(
        (it) => it.archived && repairLibraryTemplateTabIdFromPreset(it.tabId) === activeTemplateTab
      ).length,
    [items, activeTemplateTab]
  );

  const archivedTemplatesCount = useMemo(
    () => items.filter((it) => isRepairLibraryTemplatePreset(it) && it.archived).length,
    [items]
  );

  const editingTemplate = useMemo(
    () => (editingId ? items.find((it) => it.id === editingId) : undefined),
    [items, editingId]
  );

  const fetchTemplateTrashTotal = useCallback(
    () => getContractDocumentTemplatePresetsTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchTemplateTrashTotal);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [templatesRes, executorRes, signatoryRes] = await Promise.allSettled([
          getContractDocumentTemplatePresets(activeLibraryKind),
          getContractDocumentExecutorProfiles(activeLibraryKind),
          getContractDocumentSignatoryProfiles(activeLibraryKind),
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
        lastSavedSnapshotRef.current = JSON.stringify(
          next.map((it) => normalizeContractTemplatePreset(it))
        );
        isInitialHydrationRef.current = true;
        const tabItems = next.filter(
          (it) =>
            repairLibraryTemplateTabIdFromPreset(it.tabId) === activeTemplateTab && !it.archived
        );
        const preferredId =
          preferredTemplateIdsRef.current[
            templatesScopeKey(activeLibraryKind, activeTemplateTab, false)
          ];
        const firstId =
          tabItems.find((it) => it.id === preferredId)?.id ??
          tabItems.find((it) => it.isDefault)?.id ??
          tabItems[0]?.id ??
          '';
        setEditingId(firstId);
        const t = tabItems.find((it) => it.id === firstId);
        setTitle(t?.title ?? '');
        setHtml(t?.html ?? '');
        setVisualDraftHtml(t?.html ?? '');
        resetVisualHistory(t?.html ?? '');
        void refreshTrashCount();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку шаблонов');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLibraryKind, activeTemplateTab, templatesScopeKey]);

  const persist = async (next: ContractTemplatePreset[], successText: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const normalized = next.map((it) => normalizeContractTemplatePreset(it));
      await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
      setItems(normalized);
      lastSavedSnapshotRef.current = JSON.stringify(normalized);
      setOk(successText);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const buildItemsForAutosave = useCallback((): ContractTemplatePreset[] | null => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return null;
    const t = title.trim();
    const contentHtml = (
      editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? visualDraftHtml) : html
    ).trim();
    if (!t || !contentHtml) return null;
    const exists = items.some((it) => it.id === editingId);
    if (exists) {
      return items.map((it) =>
        it.id === editingId ? { ...it, title: t, html: contentHtml, tabId: activeTemplateTab } : it
      );
    }
    return [
      ...items,
      {
        id: editingId,
        title: t,
        html: contentHtml,
        tabId: activeTemplateTab,
        isDefault: itemsByActiveTab.length === 0,
        archived: false,
      },
    ];
  }, [
    isSuperAdmin,
    editingId,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    items,
    activeTemplateTab,
    itemsByActiveTab.length,
  ]);

  const persistItemsSnapshot = useCallback(
    async (next: ContractTemplatePreset[]) => {
      const snapshot = JSON.stringify(next.map((it) => normalizeContractTemplatePreset(it)));
      if (snapshot === lastSavedSnapshotRef.current) return;
      setSaving(true);
      setError(null);
      try {
        const normalized = next.map((it) => normalizeContractTemplatePreset(it));
        await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
        setItems(normalized);
        lastSavedSnapshotRef.current = JSON.stringify(normalized);
        setAutosaveSavedVisible(true);
        window.setTimeout(() => setAutosaveSavedVisible(false), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблон');
      } finally {
        setSaving(false);
      }
    },
    [activeLibraryKind]
  );

  const persistAutosave = useCallback(async () => {
    const next = buildItemsForAutosave();
    if (!next) return;
    await persistItemsSnapshot(next);
  }, [buildItemsForAutosave, persistItemsSnapshot]);

  const handleSaveNow = useCallback(async () => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    if (!editingId) ensureTemplateDraftForEditing();
    const hasHtml =
      (editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? html) : html).trim()
        .length > 0;
    if (!hasHtml) {
      setError('Шаблон пустой. Добавьте текст и сохраните снова.');
      return;
    }
    if (!title.trim()) {
      setError('Укажите название шаблона перед сохранением.');
      return;
    }
    await persistAutosave();
    setOk(`Шаблон сохранён для направления «${templateLibraryKindLabel(activeLibraryKind)}».`);
  }, [
    isSuperAdmin,
    showArchivedTemplates,
    editingId,
    ensureTemplateDraftForEditing,
    editorMode,
    html,
    title,
    persistAutosave,
    activeLibraryKind,
  ]);

  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistAutosave();
  }, [persistAutosave]);

  const handleRenameTemplateTitle = useCallback(() => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return;
    setTitleRenameMode(true);
  }, [isSuperAdmin, editingId, showArchivedTemplates]);

  const handleActiveTemplateTabChange = useCallback(
    (nextTab: RepairLibraryTemplateTabId) => {
      if (nextTab === activeTemplateTab) return;
      const pendingSave = buildItemsForAutosave();
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      templateTabSwitchRef.current = true;
      setActiveTemplateTab(nextTab);
      void (async () => {
        try {
          if (pendingSave) {
            await persistItemsSnapshot(pendingSave);
          }
        } finally {
          templateTabSwitchRef.current = false;
        }
      })();
    },
    [activeTemplateTab, buildItemsForAutosave, persistItemsSnapshot]
  );

  useEffect(() => {
    if (loading || !isSuperAdmin) return;
    if (templateTabSwitchRef.current || templateArchiveSwitchRef.current) return;
    if (isInitialHydrationRef.current) {
      isInitialHydrationRef.current = false;
      const initial = buildItemsForAutosave();
      lastSavedSnapshotRef.current = JSON.stringify(
        initial?.map((it) => normalizeContractTemplatePreset(it)) ?? items
      );
      return;
    }
    if (showArchivedTemplates) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistAutosave();
    }, 700);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    loading,
    isSuperAdmin,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    editingId,
    activeTemplateTab,
    items,
    buildItemsForAutosave,
    persistAutosave,
  ]);

  const selectTemplate = (id: string) => {
    void (async () => {
      await flushAutosave();
      preferredTemplateIdsRef.current[
        templatesScopeKey(activeLibraryKind, activeTemplateTab, showArchivedTemplates)
      ] = id;
      setTitleRenameMode(false);
      setEditingId(id);
      const t = itemsByActiveTab.find((it) => it.id === id);
      setTitle(t?.title ?? '');
      setHtml(t?.html ?? '');
      setVisualDraftHtml(t?.html ?? '');
      resetVisualHistory(t?.html ?? '');
    })();
  };

  const createNewTemplate = () => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    void (async () => {
      await flushAutosave();
      setTitleRenameMode(true);
      setEditingId(`tpl_${Date.now()}`);
      setTitle('Новый шаблон');
      const next = '<div class="docPrint"></div>';
      setHtml(next);
      setVisualDraftHtml(next);
      resetVisualHistory(next);
    })();
  };

  useEffect(() => {
    if (!visualEditorRef.current) return;
    const source = visualDraftHtml || html || '';
    visualEditorRef.current.innerHTML = source;
    if (editorMode === 'visual' && visualHistoryRef.current.length === 0) {
      resetVisualHistory(source);
    }
    // Важно: НЕ зависим от visualDraftHtml/html, иначе при каждом onInput перезаписываем DOM
    // и курсор прыгает в начало.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorMode, editingId]);

  useEffect(() => {
    const preferredId =
      preferredTemplateIdsRef.current[
        templatesScopeKey(activeLibraryKind, activeTemplateTab, showArchivedTemplates)
      ];
    const firstId =
      itemsByActiveTab.find((it) => it.id === preferredId)?.id ??
      itemsByActiveTab.find((it) => it.isDefault)?.id ??
      itemsByActiveTab[0]?.id ??
      '';
    setTitleRenameMode(false);
    setEditingId(firstId);
    const t = itemsByActiveTab.find((it) => it.id === firstId);
    setTitle(t?.title ?? '');
    setHtml(t?.html ?? '');
    setVisualDraftHtml(t?.html ?? '');
    resetVisualHistory(t?.html ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeLibraryKind,
    activeTemplateTab,
    items.length,
    showArchivedTemplates,
    templatesScopeKey,
  ]);

  const requestMoveTemplateToTrash = () => {
    if (!isSuperAdmin || !editingId) return;
    void (async () => {
      await flushAutosave();
      const current = items.find((it) => it.id === editingId);
      if (!current) return;
      const name = (current.title ?? title).trim() || 'без названия';
      setTemplateTrashPending({ presetId: editingId, name });
    })();
  };

  const confirmMoveTemplateToTrash = () => {
    const pending = templateTrashPending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        await trashContractTemplatePreset(presetId);
        const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
        const next = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        setItems(next);
        void refreshTrashCount();
        setOk('Шаблон перемещён в корзину.');
        const tabItems = next.filter((it) => {
          if (repairLibraryTemplateTabIdFromPreset(it.tabId) !== activeTemplateTab) return false;
          return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
        });
        const fallback = tabItems.find((it) => it.isDefault)?.id ?? tabItems[0]?.id ?? '';
        if (fallback) selectTemplate(fallback);
        else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetVisualHistory('');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить шаблон в корзину');
      } finally {
        setSaving(false);
      }
    })();
  };

  const templateTrashConfirmMessage =
    templateTrashPending != null
      ? `Шаблон «${templateTrashPending.name}» будет перемещён в корзину и скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}». Через 30 дней он удалится безвозвратно. Восстановить можно из корзины.`
      : '';

  const requestArchiveTemplate = () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current) return;
    if (current.archived) {
      setError('Этот шаблон уже в архиве.');
      return;
    }
    void (async () => {
      await flushAutosave();
      const fresh = items.find((it) => it.id === editingId);
      if (!fresh || fresh.archived) return;
      const name = (fresh.title ?? title).trim() || 'без названия';
      setTemplateArchivePending({ presetId: editingId, name });
    })();
  };

  const applyEditingTemplateFromList = (list: ContractTemplatePreset[], id: string) => {
    setEditingId(id);
    const t = list.find((it) => it.id === id);
    setTitle(t?.title ?? '');
    setHtml(t?.html ?? '');
    setVisualDraftHtml(t?.html ?? '');
    resetVisualHistory(t?.html ?? '');
  };

  const confirmArchiveTemplate = () => {
    const pending = templateArchivePending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      templateArchiveSwitchRef.current = true;
      try {
        await flushAutosave();
        const tab = activeTemplateTab;
        let next = items.map((it) =>
          it.id === presetId ? { ...it, archived: true, isDefault: false } : it
        );
        let activeOnTab = next.filter(
          (it) => repairLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
        );
        if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
          const pickId = activeOnTab[0].id;
          next = next.map((it) =>
            repairLibraryTemplateTabIdFromPreset(it.tabId) !== tab
              ? it
              : { ...it, isDefault: !it.archived && it.id === pickId }
          );
          activeOnTab = next.filter(
            (it) => repairLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
          );
        }
        const saved = await persist(next, 'Шаблон перенесён в архив.');
        if (!saved) return;
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        const fallback = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
        if (fallback) {
          applyEditingTemplateFromList(next, fallback);
        } else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetVisualHistory('');
        }
      } finally {
        templateArchiveSwitchRef.current = false;
      }
    })();
  };

  const templateArchiveConfirmMessage =
    templateArchivePending != null
      ? `Шаблон «${templateArchivePending.name}» будет скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}» (останется в архиве). Восстановление: «Показать архивные» → «Восстановить».`
      : '';

  const restoreArchivedTemplate = async () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current?.archived) return;
    const next = items.map((it) => (it.id === editingId ? { ...it, archived: false } : it));
    await persist(next, 'Шаблон восстановлен из архива.');
  };

  const handleExportSeedJson = () => {
    if (!isSuperAdmin) return;
    const libraryItems = items
      .filter((it) => isRepairLibraryTemplatePreset(it) && !it.archived)
      .map((it) => normalizeContractTemplatePreset(it));
    const blob = new Blob([JSON.stringify({ version: 1, items: libraryItems }, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const kindSlug = activeLibraryKind.toLowerCase();
    a.download = `${kindSlug}-library-templates.seed.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOk(
      `Скачан ${kindSlug}-library-templates.seed.json — положите в backend/prisma/seed-data/ в репозиторий и выполните сидирование соответствующего направления.`
    );
  };

  const handleSyncHtmlWithVisualEditor = () => {
    if (!isSuperAdmin) return;
    if (editorMode === 'visual') {
      const next = syncVisualEditorToHtmlState();
      pushVisualHistory(next);
    } else {
      setVisualDraftHtml(html);
      resetVisualHistory(html);
      setEditorMode('visual');
    }
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
      content:
        '<hr style="border: 0; border-top: 1px solid var(--admin-border-strong); margin: 12pt 0;" />',
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
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.signatureName|plain}}</p>
    </td>
  </tr>
</table>`,
    }));
  const insertRequisitesTemplate = () =>
    updateHtmlBySelection(() => ({
      content: buildRepairContractRequisitesInsertHtml(),
    }));
  const insertQuoteBlock = () =>
    updateHtmlBySelection(() => ({
      content: `<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid var(--admin-border-strong); background: var(--admin-surface-muted);">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`,
    }));
  const insertEmptySpacer = () =>
    updateHtmlBySelection(() => ({ content: '<div style="height: 10pt;"></div>' }));
  const insertTwoColumnsBlock = () =>
    updateHtmlBySelection(() => ({
      content: `<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong);">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЛЕВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{customer.requisitesHtml|plain}}</p>
      <p style="margin: 0;">___________________ / {{customer.signatureName|plain}}</p>
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
        '<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;"><tr><th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Пункт</th><th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Содержание</th></tr><tr><td style="border: 1px solid var(--admin-border); padding: 6px;">1</td><td style="border: 1px solid var(--admin-border); padding: 6px;">Описание</td></tr></table>',
    }));
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

  const formatTools: FormatTool[] = [
    {
      id: 'h1',
      title: 'Заголовок H1',
      icon: <FormatToolbarGlyph>H1</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(1),
    },
    {
      id: 'h2',
      title: 'Заголовок H2',
      icon: <FormatToolbarGlyph>H2</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(2),
    },
    {
      id: 'h3',
      title: 'Заголовок H3',
      icon: <FormatToolbarGlyph>H3</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(3),
    },
    {
      id: 'align-left',
      title: 'Выравнивание по левому краю',
      icon: <FormatToolbarSvgIcon icon={Bars3BottomLeftIcon} />,
      onClick: () => wrapParagraphWithAlign('left'),
    },
    {
      id: 'align-center',
      title: 'Выравнивание по центру',
      icon: <FormatToolbarSvgIcon icon={Bars3Icon} />,
      onClick: () => wrapParagraphWithAlign('center'),
    },
    {
      id: 'align-right',
      title: 'Выравнивание по правому краю',
      icon: <FormatToolbarSvgIcon icon={Bars3BottomRightIcon} />,
      onClick: () => wrapParagraphWithAlign('right'),
    },
    {
      id: 'align-justify',
      title: 'Выравнивание по ширине',
      icon: <FormatToolbarSvgIcon icon={Bars4Icon} />,
      onClick: () => wrapParagraphWithAlign('justify'),
    },
    {
      id: 'paragraph-indent',
      title: 'Абзац с отступом первой строки',
      icon: <FormatToolbarGlyph>¶</FormatToolbarGlyph>,
      onClick: wrapParagraphWithIndent,
    },
    {
      id: 'indent-none',
      title: 'Абзац без отступа первой строки',
      icon: <FormatToolbarGlyph>⇤</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithIndentCm(0),
    },
    {
      id: 'indent-125',
      title: 'Отступ первой строки 1,25 см',
      icon: <FormatToolbarGlyph>⇥</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithIndentCm(1.25),
    },
    {
      id: 'spacing-tight',
      title: 'Узкий межстрочный интервал',
      icon: <FormatToolbarGlyph>↕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.3, 6),
    },
    {
      id: 'spacing-wide',
      title: 'Широкий межстрочный интервал',
      icon: <FormatToolbarGlyph>⇕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.6, 10),
    },
    {
      id: 'bold',
      title: 'Жирный текст',
      icon: <FormatToolbarGlyph>B</FormatToolbarGlyph>,
      onClick: () => wrapSelection('<strong>', '</strong>', 'жирный текст'),
    },
    {
      id: 'italic',
      title: 'Курсив',
      icon: <FormatToolbarGlyph>I</FormatToolbarGlyph>,
      onClick: () => wrapSelection('<em>', '</em>', 'курсив'),
    },
    {
      id: 'underline',
      title: 'Подчёркивание',
      icon: <FormatToolbarGlyph>U</FormatToolbarGlyph>,
      onClick: () => wrapSelection('<u>', '</u>', 'подчёркнуто'),
    },
    {
      id: 'uppercase',
      title: 'ВЕРХНИЙ РЕГИСТР',
      icon: <FormatToolbarGlyph>AA</FormatToolbarGlyph>,
      onClick: uppercaseSelection,
    },
    {
      id: 'clear-format',
      title: 'Очистить форматирование выделения',
      icon: <FormatToolbarGlyph>Tx</FormatToolbarGlyph>,
      onClick: clearFormattingInSelection,
    },
    {
      id: 'list-ul',
      title: 'Маркированный список',
      icon: <FormatToolbarSvgIcon icon={ListBulletIcon} />,
      onClick: () => wrapAsList(false),
    },
    {
      id: 'list-ol',
      title: 'Нумерованный список',
      icon: <FormatToolbarSvgIcon icon={NumberedListIcon} />,
      onClick: () => wrapAsList(true),
    },
    {
      id: 'normalize-soft',
      title: 'Нормализовать (мягко): убрать лишние пробелы и пустые строки',
      icon: <FormatToolbarSvgIcon icon={SparklesIcon} />,
      onClick: () => normalizeTemplateText('soft'),
    },
    {
      id: 'normalize-strict',
      title: 'Нормализовать (строго): пробелы, пустые строки и выравнивание абзацев',
      icon: <FormatToolbarGlyph>N+</FormatToolbarGlyph>,
      onClick: () => normalizeTemplateText('strict'),
    },
    {
      id: 'columns-2',
      title: 'Блок из двух колонок',
      icon: <FormatToolbarSvgIcon icon={Square2StackIcon} />,
      onClick: insertTwoColumnsBlock,
    },
    {
      id: 'signatures',
      title: 'Подписи сторон',
      icon: <FormatToolbarSvgIcon icon={PencilSquareIcon} />,
      onClick: insertSignatureLines,
    },
    {
      id: 'requisites',
      title: 'Реквизиты (готовый блок)',
      icon: <FormatToolbarSvgIcon icon={BuildingOffice2Icon} />,
      onClick: insertRequisitesTemplate,
    },
    {
      id: 'section-template',
      title: 'Шаблон раздела',
      icon: <FormatToolbarSvgIcon icon={DocumentPlusIcon} />,
      onClick: insertSectionTemplate,
    },
    {
      id: 'quote',
      title: 'Цитата / примечание',
      icon: <FormatToolbarSvgIcon icon={ChatBubbleBottomCenterTextIcon} />,
      onClick: insertQuoteBlock,
    },
    {
      id: 'table-2x2',
      title: 'Таблица 2×2',
      icon: <FormatToolbarSvgIcon icon={TableCellsIcon} />,
      onClick: insertSimpleTable,
    },
    {
      id: 'spacer',
      title: 'Пустая строка (отступ)',
      icon: <FormatToolbarGlyph>⏎</FormatToolbarGlyph>,
      onClick: insertEmptySpacer,
    },
    {
      id: 'hr',
      title: 'Горизонтальный разделитель',
      icon: <FormatToolbarSvgIcon icon={MinusIcon} />,
      onClick: insertHorizontalRule,
    },
    {
      id: 'page-break',
      title: 'Разрыв страницы',
      icon: <FormatToolbarSvgIcon icon={ArrowsPointingOutIcon} />,
      onClick: insertPageBreak,
    },
  ];

  const editorModeToggle = (
    <div
      className={`${styles.formatLevelBar} ${styles.templatesLibraryEditorModeToggle}`}
      role="group"
      aria-label="Режим редактора шаблона"
    >
      <button
        type="button"
        className={editorMode === 'html' ? styles.formatLevelBtnActive : styles.formatLevelBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('html')}
      >
        HTML
      </button>
      <button
        type="button"
        className={editorMode === 'visual' ? styles.formatLevelBtnActive : styles.formatLevelBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('visual')}
      >
        Визуальный конструктор
      </button>
    </div>
  );

  return (
    <div className={`${styles.page} ${styles.pageWide} ${styles.templatesLibraryPage}`}>
      <div className={styles.editorHeader}>
        <div className={styles.templatesLibraryTitleWithAutosave}>
          <div className={styles.templatesLibraryTitleBlock}>
            <div className={styles.templatesLibraryTitleRow}>
              <h1 className={styles.title}>Библиотека шаблонов документов</h1>
              {titleRenameMode ? (
                <input
                  ref={titleRenameInputRef}
                  type="text"
                  className={styles.templatesLibraryCurrentTemplateTitleInput}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTitleRenameMode(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setTitleRenameMode(false);
                    }
                  }}
                  aria-label="Название шаблона"
                />
              ) : (
                <span className={styles.templatesLibraryCurrentTemplateTitle}>
                  {' - '}
                  {title.trim() ||
                    `${REPAIR_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]} ${templateLibraryKindLabel(activeLibraryKind)}`}
                </span>
              )}
              {isSuperAdmin ? (
                <button
                  type="button"
                  className={styles.templatesLibraryRenameTitleBtn}
                  aria-label="Переименовать название шаблона"
                  title="Переименовать название шаблона"
                  disabled={!editingId || showArchivedTemplates}
                  onClick={handleRenameTemplateTitle}
                >
                  <PencilSquareIcon style={{ width: 12, height: 12 }} />
                </button>
              ) : null}
            </div>
            <p className={styles.templatesLibrarySaveHelp}>
              Сохранение работает так: первый раз нажмите «Сохранить», чтобы создать шаблон в
              выбранном направлении и типе документа. После этого изменения названия и содержимого
              сохраняются автоматически.
            </p>
          </div>
          {isSuperAdmin ? (
            <span
              className={`${measurementFormStyles.autosaveNotice} ${
                autosaveSavedVisible ? measurementFormStyles.autosaveNoticeVisible : ''
              }`}
              role="status"
              aria-live="polite"
            >
              Сохранено
            </span>
          ) : null}
        </div>
        <div className={styles.templatesLibraryHeaderActions}>
          <div className={styles.templatesLibraryHeaderButtons}>
            {isSuperAdmin ? (
              <div
                className={styles.templatesLibraryAddButtonWithTooltip}
                onMouseEnter={showCreateTemplateHelp}
                onMouseLeave={hideCreateTemplateHelpWithDelay}
              >
                <button
                  type="button"
                  className={styles.templatesLibraryAddButton}
                  disabled={showArchivedTemplates}
                  aria-describedby={
                    createTemplateHelpOpen && !showArchivedTemplates
                      ? 'templates-library-create-help'
                      : undefined
                  }
                  onFocus={showCreateTemplateHelp}
                  onBlur={hideCreateTemplateHelpWithDelay}
                  onClick={createNewTemplate}
                >
                  + Новый шаблон
                </button>
                {createTemplateHelpOpen && !showArchivedTemplates ? (
                  <div
                    id="templates-library-create-help"
                    role="tooltip"
                    className={styles.templatesLibraryCreateTemplateTooltip}
                    onMouseEnter={showCreateTemplateHelp}
                    onMouseLeave={hideCreateTemplateHelpWithDelay}
                  >
                    <strong>Как создать шаблон</strong>
                    <ol>
                      <li>Выберите направление и тип документа.</li>
                      <li>Нажмите «+ Новый шаблон».</li>
                      <li>При необходимости переименуйте шаблон у заголовка.</li>
                      <li>Заполните шаблон (HTML или Визуальный конструктор).</li>
                      <li>Нажмите «Сохранить» для первичного создания.</li>
                      <li>Дальше изменения сохраняются автоматически.</li>
                    </ol>
                    <p>
                      Сейчас будет создан пустой шаблон для «
                      {REPAIR_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]}», направление «
                      {templateLibraryKindLabel(activeLibraryKind)}».
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isSuperAdmin ? (
              <AdminToolbarIconButton
                aria-label="Экспорт"
                title="Выгрузка шаблонов на прод"
                disabled={saving}
                onClick={handleExportSeedJson}
              >
                <TemplatesLibraryExportIcon size={18} />
              </AdminToolbarIconButton>
            ) : null}
            <AdminToolbarArchiveButton
              archiveCount={archivedTemplatesCount}
              archiveView={showArchivedTemplates}
              disabled={loading}
              title="Архив шаблонов"
              aria-label="Архив шаблонов"
              onClick={() => setShowArchivedTemplates((v) => !v)}
            />
            {isSuperAdmin ? (
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина шаблонов"
                aria-label="Корзина шаблонов"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.templatesLibraryMessages}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {!error && ok ? <p className={styles.hint}>{ok}</p> : null}
        {!error && !ok && !editingId && !showArchivedTemplates ? (
          <p className={styles.hint}>
            Нет активного шаблона. Нажмите «+ Новый шаблон», при необходимости переименуйте его
            кнопкой возле заголовка, вставьте текст и нажмите «Сохранить».
          </p>
        ) : null}
      </div>
      {!isSuperAdmin ? (
        <p className={styles.hint}>Изменение библиотеки шаблонов доступно только супер-админу.</p>
      ) : null}

      <div
        className={`${styles.sectionCard} ${styles.templatesLibraryControls} ${measurementFormStyles.blankSheet}`}
      >
        {showArchivedTemplates ? (
          <p className={styles.templatesLibraryModeBanner} role="status">
            Режим архива: видны только скрытые шаблоны. Выберите шаблон и нажмите «Восстановить» или
            снова нажмите иконку архива в шапке.
          </p>
        ) : null}

        <div
          className={`${styles.templatesLibraryMeta} ${
            isSuperAdmin && editingId ? styles.templatesLibraryMetaWithActions : ''
          }`}
        >
          <div
            className={`${measurementFormStyles.grid} ${measurementFormStyles.blankMetaGrid} ${styles.templatesLibraryMetaFields}`}
          >
            <div className={measurementFormStyles.row}>
              <label
                className={measurementFormStyles.label}
                htmlFor="templates-library-kind"
                title="Для какого направления загружается и сохраняется библиотека"
              >
                Направление
              </label>
              <select
                id="templates-library-kind"
                className={measurementFormStyles.select}
                value={activeLibraryKind}
                onChange={(e) =>
                  setActiveLibraryKind(e.currentTarget.value as ContractDocumentPackageKind)
                }
              >
                {TEMPLATE_LIBRARY_KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div
              className={`${measurementFormStyles.row} ${styles.templatesLibraryDocumentTypeField}`}
            >
              <label
                className={measurementFormStyles.label}
                htmlFor="templates-library-tab"
                title="Пять типов документов библиотеки"
              >
                Тип документа
              </label>
              <select
                id="templates-library-tab"
                className={measurementFormStyles.select}
                value={activeTemplateTab}
                onChange={(e) =>
                  handleActiveTemplateTabChange(
                    normalizeRepairLibraryTemplateTabId(e.currentTarget.value)
                  )
                }
              >
                {REPAIR_LIBRARY_TEMPLATE_TAB_IDS.map((tab) => (
                  <option key={tab} value={tab}>
                    {REPAIR_LIBRARY_TEMPLATE_TAB_LABELS[tab]} ({templatesCountByTab[tab]})
                  </option>
                ))}
              </select>
            </div>
            <div className={measurementFormStyles.row}>
              <label
                className={measurementFormStyles.label}
                htmlFor="templates-library-preview-customer"
                title="Тестовые данные в предпросмотре справа"
              >
                Превью заказчика
              </label>
              <select
                id="templates-library-preview-customer"
                className={measurementFormStyles.select}
                value={previewCustomerKind}
                onChange={(e) =>
                  setPreviewCustomerKind(e.target.value as RepairTemplatePreviewCustomerKind)
                }
              >
                <option value="PERSON">Физическое лицо</option>
                <option value="COMPANY">Юридическое лицо</option>
                <option value="ENTREPRENEUR">ИП</option>
              </select>
            </div>
            <div className={measurementFormStyles.row}>
              <label
                className={measurementFormStyles.label}
                htmlFor="templates-library-template"
                title={
                  showArchivedTemplates
                    ? 'Скрытые шаблоны этой вкладки'
                    : 'Шаблоны, доступные в пакете'
                }
              >
                {showArchivedTemplates ? 'Архивный шаблон' : 'Активный шаблон'}
              </label>
              {itemsByActiveTab.length > 1 ? (
                <select
                  id="templates-library-template"
                  className={measurementFormStyles.select}
                  value={editingId}
                  disabled={loading}
                  onChange={(e) => selectTemplate(e.target.value)}
                >
                  {itemsByActiveTab.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title}
                    </option>
                  ))}
                </select>
              ) : itemsByActiveTab.length === 1 ? (
                <input
                  id="templates-library-template"
                  className={measurementFormStyles.input}
                  value={`Шаблон: ${itemsByActiveTab[0].title}`}
                  readOnly
                />
              ) : showArchivedTemplates ? (
                <input
                  id="templates-library-template"
                  className={measurementFormStyles.input}
                  value="Архив пуст"
                  readOnly
                />
              ) : (
                <button
                  id="templates-library-template"
                  type="button"
                  className={styles.templatesLibraryAddButton}
                  disabled={!isSuperAdmin || loading}
                  onClick={createNewTemplate}
                  title="Создать первый шаблон для выбранного типа документа"
                >
                  Создать шаблон
                </button>
              )}
            </div>
          </div>
          {isSuperAdmin && editingId ? (
            <div className={`${styles.templatesLibraryMetaActions} ${styles.estimatesCardActions}`}>
              <button
                type="button"
                className={styles.templatesLibraryAddButton}
                disabled={saving || showArchivedTemplates}
                title={
                  showArchivedTemplates
                    ? 'Сохранение недоступно в режиме архива'
                    : `Сохранить шаблон в направлении «${templateLibraryKindLabel(activeLibraryKind)}»`
                }
                onClick={() => void handleSaveNow()}
              >
                Сохранить
              </button>
              {showArchivedTemplates ? (
                <button
                  type="button"
                  className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                  disabled={!editingId || saving}
                  aria-label="Восстановить"
                  title="Вернуть шаблон в активные"
                  onClick={() => void restoreArchivedTemplate()}
                >
                  <EstimatesRestoreFromArchiveIcon />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                    disabled={!editingId || saving}
                    aria-label="В архив"
                    title="Скрыть из пакета без удаления; восстановление через архив в шапке"
                    onClick={requestArchiveTemplate}
                  >
                    <EstimatesArchiveIcon />
                  </button>
                  <AdminTableIconButton
                    aria-label="В корзину"
                    title="Корзина: восстановление в течение 30 дней"
                    disabled={!editingId || saving}
                    onClick={requestMoveTemplateToTrash}
                  >
                    <DeleteIcon />
                  </AdminTableIconButton>
                </>
              )}
            </div>
          ) : null}
          <div className={styles.templatesLibraryMetaRow}>
            {!showArchivedTemplates &&
            itemsByActiveTab.length === 0 &&
            archivedCountOnTab > 0 &&
            !loading ? (
              <span className={styles.templatesLibraryMetaHint}>
                На этой вкладке только архивные — откройте архив иконкой в шапке (
                {archivedCountOnTab}).
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`${styles.contractTopTools} ${styles.blockTools} ${styles.templatesLibraryTopToolsStack}`}
      >
        <div
          className={`${styles.formatToolbar} ${styles.templatesLibraryFormatToolbarRow}`}
          role="toolbar"
          aria-label="Инструменты форматирования"
        >
          {formatTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className={styles.formatBtn}
              title={tool.title}
              aria-label={tool.title}
              onClick={tool.onClick}
              onMouseDown={(e) => e.preventDefault()}
              disabled={!isSuperAdmin}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <aside
          className={`${styles.placeholderPanelTop} ${styles.templatesLibraryPlaceholderPanel}`}
          aria-label="Плейсхолдеры для вставки"
        >
          <div className={styles.templatesLibraryPlaceholderHeader}>
            <span className={styles.templatesLibraryPlaceholderTitle}>Плейсхолдеры</span>
            <button
              type="button"
              className={styles.templatesLibraryPlaceholderToggleBtn}
              aria-expanded={!placeholdersCollapsed}
              onClick={() => setPlaceholdersCollapsed((v) => !v)}
            >
              {placeholdersCollapsed ? 'Развернуть' : 'Свернуть'}
            </button>
          </div>
          {!placeholdersCollapsed
            ? REPAIR_CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
                <div key={group.title} className={styles.templatesLibraryPlaceholderGroup}>
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
              ))
            : null}
        </aside>
      </div>

      <div className={styles.contractLiveGrid}>
        <div className={styles.contractEditColumn}>
          <div
            className={`${measurementFormStyles.blankSheet} ${styles.templatesLibraryPaneBlank}`}
          >
            <div
              className={`${styles.templatesLibraryEditorPaneHead} ${styles.templatesLibraryEditorPaneHeadMode}`}
            >
              {editorModeToggle}
              <div className={styles.templatesLibraryEditorHeadActions}>
                <button
                  type="button"
                  className={styles.templatesLibraryEditorHeadActionBtn}
                  disabled={!isSuperAdmin}
                  title="Загрузить .html / .htm (например, файл «Веб-страница, отфильтрованная» из Word). RTF и .docx сюда не подходят — сначала сохраните как отфильтрованную веб-страницу."
                  onClick={() => templateHtmlFileInputRef.current?.click()}
                >
                  Импорт из HTML…
                </button>
                <button
                  type="button"
                  className={styles.templatesLibraryEditorHeadActionBtn}
                  disabled={!isSuperAdmin}
                  title="Загрузить HTML из поля в визуальный конструктор"
                  onClick={handleSyncHtmlWithVisualEditor}
                >
                  HTML → конструктор
                </button>
                <input
                  ref={templateHtmlFileInputRef}
                  type="file"
                  accept=".html,.htm,text/html,application/xhtml+xml"
                  style={{ display: 'none' }}
                  onChange={(ev) => void handleTemplateHtmlFileImport(ev)}
                />
              </div>
            </div>
            <div
              className={editorMode === 'html' ? undefined : styles.editorPaneHidden}
              aria-hidden={editorMode !== 'html'}
            >
              <textarea
                id="contract_template_html_source"
                ref={htmlTextareaRef}
                className={`${measurementFormStyles.textarea} ${styles.contractHtmlTextarea} ${styles.templatesLibraryHtmlSource}`}
                spellCheck={false}
                aria-label="HTML шаблона договора"
                value={html}
                onChange={(e) => {
                  ensureTemplateDraftForEditing();
                  setHtml(e.target.value);
                }}
                disabled={!isSuperAdmin}
                tabIndex={editorMode === 'html' ? 0 : -1}
              />
            </div>
            <div
              className={editorMode === 'visual' ? undefined : styles.editorPaneHidden}
              aria-hidden={editorMode !== 'visual'}
            >
              <div
                className={styles.templatesLibraryEditorPaneHead}
                aria-label="Панель визуального конструктора"
              >
                <div className={styles.templatesLibraryPaneToolbar}>
                  <div className={styles.templatesLibraryInlineField}>
                    <label
                      className={measurementFormStyles.label}
                      htmlFor="templates-library-visual-zoom"
                    >
                      Масштаб: {visualZoomPct}%
                    </label>
                    <input
                      id="templates-library-visual-zoom"
                      type="number"
                      className={`${measurementFormStyles.input} ${styles.templatesLibraryNumberInput}`}
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
                    />
                  </div>
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
                className={`${measurementFormStyles.textarea} ${styles.contractHtmlTextarea} ${styles.visualEditor} ${styles.visualEditorScrollable} ${styles.templatesLibraryVisualEditor}`}
                contentEditable={isSuperAdmin && editorMode === 'visual'}
                suppressContentEditableWarning
                onInput={(e) => {
                  ensureTemplateDraftForEditing();
                  const next = (e.currentTarget as HTMLDivElement).innerHTML;
                  setVisualDraftHtml(next);
                  setHtml(next);
                  pushVisualHistory(next);
                  captureVisualSelection();
                }}
                onKeyUp={captureVisualSelection}
                onMouseUp={captureVisualSelection}
                onFocus={captureVisualSelection}
                onBlur={() => {
                  if (editorMode !== 'visual') return;
                  syncVisualEditorToHtmlState();
                  captureVisualEditorHeight();
                }}
                style={{
                  whiteSpace: 'normal',
                  zoom: editorMode === 'visual' ? `${visualZoomPct}%` : undefined,
                  height: visualEditorHeightPx ? `${visualEditorHeightPx}px` : undefined,
                }}
              />
            </div>
          </div>
        </div>
        <div className={styles.contractPreviewColumn}>
          <div
            className={`${measurementFormStyles.blankSheet} ${styles.templatesLibraryPaneBlank}`}
          >
            <div className={styles.templatesLibraryPreviewHead}>
              <h3 className={styles.previewBlockTitle}>Предпросмотр</h3>
              <div className={styles.templatesLibraryPaneToolbar}>
                <div className={styles.templatesLibraryInlineField}>
                  <label
                    className={measurementFormStyles.label}
                    htmlFor="templates-library-preview-font-size"
                  >
                    Текст: {previewFontSizePx}px
                  </label>
                  <input
                    id="templates-library-preview-font-size"
                    type="number"
                    className={`${measurementFormStyles.input} ${styles.templatesLibraryNumberInput}`}
                    min={10}
                    max={20}
                    step={1}
                    value={previewFontSizePx}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isFinite(n)) return;
                      setPreviewFontSizePx(Math.max(10, Math.min(20, n)));
                    }}
                  />
                </div>
                <div className={styles.templatesLibraryInlineField}>
                  <label
                    className={measurementFormStyles.label}
                    htmlFor="templates-library-preview-zoom"
                  >
                    Масштаб: {previewZoomPct}%
                  </label>
                  <input
                    id="templates-library-preview-zoom"
                    type="number"
                    className={`${measurementFormStyles.input} ${styles.templatesLibraryNumberInput}`}
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
                  />
                </div>
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
      </div>
      <ConfirmModal
        isOpen={templateArchivePending != null}
        onClose={() => setTemplateArchivePending(null)}
        onConfirm={confirmArchiveTemplate}
        title="В архив?"
        message={templateArchiveConfirmMessage}
        confirmText="В архив"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={templateTrashPending != null}
        onClose={() => setTemplateTrashPending(null)}
        onConfirm={confirmMoveTemplateToTrash}
        title="Переместить в корзину?"
        message={templateTrashConfirmMessage}
        confirmText="В корзину"
        cancelText="Отмена"
        variant="danger"
      />
      <TemplateTrashModal
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={() => {
          void refreshTrashCount();
          void (async () => {
            try {
              const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
              const next = (templatesRes.items ?? []).map((it) =>
                normalizeContractTemplatePreset(it)
              );
              setItems(next);
            } catch {
              /* ignore */
            }
          })();
        }}
      />
    </div>
  );
}
