'use client';

import {
  ArrowsPointingOutIcon,
  BuildingOffice2Icon,
  ChatBubbleBottomCenterTextIcon,
  ListBulletIcon,
  MinusIcon,
  NumberedListIcon,
  PencilSquareIcon,
  SparklesIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

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
  buildContractLegalListHtml,
  changeContractLegalListLevel,
  handleContractLegalListBackspace,
  handleContractLegalListEnter,
  handleContractLegalListShiftEnter,
  isNodeInsideContractLegalList,
  normalizeContractLegalListInHtml,
} from '@/views/admin/ContractDocuments/repair/contractLegalList';
import { normalizeContractActHandwrittenSignaturesInHtml } from '@/views/admin/ContractDocuments/repair/contractTemplateActSignatures';
import {
  toggleContractParagraphSpacingInHtmlRange,
  toggleContractParagraphSpacingInHtmlWhole,
  toggleContractParagraphSpacingInVisualDocument,
  toggleContractSpacingOnBlockElements,
} from '@/views/admin/ContractDocuments/repair/contractTemplateCompactSpacing';
import {
  INSERT_BLOCK_TOOLTIP,
  buildContractActHandwrittenCustomerSignaturesHtml,
  buildContractPartySignaturesHtml,
  buildSimpleContractTableHtml,
} from '@/views/admin/ContractDocuments/repair/contractTemplateInsertBlocks';
import {
  BULLET_MARKER_OPTIONS,
  type BulletMarkerId,
  LIST_TOOLTIP,
  applyBulletedListInVisualEditor,
  applyContractMultilevelListInVisualEditor,
  applyNumberedListInVisualEditor,
  buildBulletedListHtml,
  buildNumberedListHtml,
  detectSectionForListHtml,
  getLinesForListFromHtmlSelection,
} from '@/views/admin/ContractDocuments/repair/contractTemplateLists';
import {
  buildContractTemplatePageBreakHtml,
  normalizeContractTemplatePageBreaksInHtml,
} from '@/views/admin/ContractDocuments/repair/contractTemplatePageBreak';
import {
  REMARK_BLANK_LINES_TOOLTIP,
  insertContractRemarkBlankLinesInVisualEditor,
} from '@/views/admin/ContractDocuments/repair/contractTemplateRemarkBlankLines';
import { repairContractTemplateStructureInHtml } from '@/views/admin/ContractDocuments/repair/contractTemplateStructure';
import {
  addTableColumnAfterCell,
  addTableColumnInHtml,
  addTableRowBelowCell,
  addTableRowInHtml,
  findTableCellInEditor,
  focusTableCell,
  isCursorInsideHtmlTable,
} from '@/views/admin/ContractDocuments/repair/contractTemplateTableEditor';
import {
  isLikelyContractTitleElement,
  normalizeContractTitleInDom,
} from '@/views/admin/ContractDocuments/repair/contractTemplateTitle';
import {
  CLEANUP_TOOLTIP,
  FONT_SIZE_TOOLTIP,
  normalizeContractTemplateTypography,
  prepareContractTemplateHtmlForPreview,
  sanitizePastedContractHtml,
  unifyContractDocumentTypographyInHtml,
} from '@/views/admin/ContractDocuments/repair/contractTemplateTypography';
import {
  isRepairActTwinOneSheetTab,
  isRepairPlainCustomerTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from '@/views/admin/ContractDocuments/repair/repairActTwinCopiesOnOnePageHtml';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from '@/views/admin/ContractDocuments/repair/repairContractPlaceholders';
import { buildRepairContractRequisitesInsertHtmlForToolbar } from '@/views/admin/ContractDocuments/repair/repairContractRequisitesLayout';
import {
  REPAIR_LIBRARY_TEMPLATE_TAB_IDS,
  REPAIR_LIBRARY_TEMPLATE_TAB_LABELS,
  type RepairLibraryTemplateTabId,
  isRepairLibraryTemplateTabId,
  libraryTemplateTabIdsForPackageKind,
  normalizeLibraryTemplateTabForPackageKind,
  repairLibraryTemplateTabIdFromPreset,
} from '@/views/admin/ContractDocuments/repair/repairLibraryTemplateTabs';
import {
  type RepairTemplatePreviewCustomerKind,
  buildRepairTemplatePreviewFallbackData,
  repairPackageFormForTemplate,
} from '@/views/admin/ContractDocuments/repair/repairPackageForm';
import { isRepairLibraryTemplatePreset } from '@/views/admin/ContractDocuments/repair/repairTemplatePresetTab';
import {
  TEMPLATE_EDITOR_ZOOM_MAX_PCT,
  TEMPLATE_EDITOR_ZOOM_MIN_PCT,
  appendTemplateHistoryEntry,
  clampTemplateEditorZoomPct,
} from '@/views/admin/ContractDocuments/repair/templateEditorHistory';
import { libraryTemplateFallbackHtml } from '@/views/admin/ContractDocuments/repair/templates';
import {
  applyWordImportedDocPrintCompact,
  readWordHtmlExportFileAsString,
} from '@/views/admin/ContractDocuments/repair/wordHtmlImport';

import styles from './ContractDocuments.module.css';

type FormatToolHelp = {
  title: string;
  steps: readonly string[];
  note?: string;
};

type FormatTool = {
  id: string;
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  ariaPressed?: boolean;
  wideGlyph?: boolean;
  help?: FormatToolHelp;
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

function FormatToolbarHelpTooltip({
  title,
  steps,
  note,
  disabled,
  isActive,
  ariaPressed,
  wideGlyph,
  onClick,
  children,
}: {
  title: string;
  steps: readonly string[];
  note?: string;
  disabled?: boolean;
  isActive?: boolean;
  ariaPressed?: boolean;
  wideGlyph?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tooltipPortalReady, setTooltipPortalReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    setTooltipPortalReady(true);
  }, []);

  const updateTooltipPosition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateTooltipPosition();
    const onScrollOrResize = () => updateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updateTooltipPosition]);

  const showHelp = () => {
    updateTooltipPosition();
    setOpen(true);
  };

  const hideHelp = () => setOpen(false);

  const portalTarget = tooltipPortalReady && typeof document !== 'undefined' ? document.body : null;

  const tooltipPanel =
    open && tooltipPos && portalTarget
      ? createPortal(
          <div
            role="tooltip"
            className={styles.formatToolbarHelpTooltip}
            style={{
              top: tooltipPos.top,
              left: tooltipPos.left,
            }}
            onMouseEnter={showHelp}
            onMouseLeave={hideHelp}
          >
            <strong>{title}</strong>
            <ol>
              {steps.map((step, index) => (
                <li key={`${title}-${index}`}>{step}</li>
              ))}
            </ol>
            {note ? <p>{note}</p> : null}
          </div>,
          portalTarget
        )
      : null;

  return (
    <div
      ref={wrapRef}
      className={styles.formatToolbarHelpWrap}
      onMouseEnter={showHelp}
      onMouseLeave={hideHelp}
    >
      <button
        type="button"
        className={`${styles.formatBtn} ${wideGlyph ? styles.formatBtnWideGlyph : ''} ${isActive ? styles.formatBtnActive : ''}`}
        aria-label={title}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        onFocus={showHelp}
        onBlur={hideHelp}
      >
        {children}
      </button>
      {tooltipPanel}
    </div>
  );
}

function TemplateEditorZoomControl({
  id,
  value,
  draft,
  disabled,
  ariaLabel,
  title,
  onDraftChange,
  onCommit,
  onStep,
}: {
  id: string;
  value: number;
  draft: string | null;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  onDraftChange: (draft: string | null) => void;
  onCommit: () => void;
  onStep: (delta: number) => void;
}) {
  const atMin = value <= TEMPLATE_EDITOR_ZOOM_MIN_PCT;
  const atMax = value >= TEMPLATE_EDITOR_ZOOM_MAX_PCT;

  return (
    <div
      className={styles.templatesLibraryVisualZoom}
      role="group"
      aria-label={ariaLabel}
      title={title}
    >
      <button
        type="button"
        className={styles.templatesLibraryVisualZoomBtn}
        disabled={disabled || atMin}
        aria-label="Уменьшить масштаб"
        onClick={() => onStep(-5)}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        className={styles.templatesLibraryVisualZoomInput}
        value={draft ?? String(value)}
        disabled={disabled}
        aria-label={`${ariaLabel}, проценты`}
        onChange={(e) => {
          onDraftChange(e.target.value.replace(/\D/g, '').slice(0, 3));
        }}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit();
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
      />
      <span className={styles.templatesLibraryVisualZoomSuffix} aria-hidden>
        %
      </span>
      <button
        type="button"
        className={styles.templatesLibraryVisualZoomBtn}
        disabled={disabled || atMax}
        aria-label="Увеличить масштаб"
        onClick={() => onStep(5)}
      >
        +
      </button>
    </div>
  );
}

type ParagraphTextAlign = 'left' | 'center' | 'right' | 'justify';

function FormatToolbarTextAlignIcon({ kind }: { kind: ParagraphTextAlign }) {
  const lineProps = {
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
  };
  const lines: { x1: number; x2: number; y: number }[] =
    kind === 'left'
      ? [
          { x1: 4, x2: 18, y: 7 },
          { x1: 4, x2: 20, y: 12 },
          { x1: 4, x2: 15, y: 17 },
        ]
      : kind === 'center'
        ? [
            { x1: 6, x2: 18, y: 7 },
            { x1: 5, x2: 19, y: 12 },
            { x1: 7, x2: 17, y: 17 },
          ]
        : kind === 'right'
          ? [
              { x1: 6, x2: 20, y: 7 },
              { x1: 4, x2: 20, y: 12 },
              { x1: 9, x2: 20, y: 17 },
            ]
          : [
              { x1: 4, x2: 20, y: 7 },
              { x1: 4, x2: 20, y: 12 },
              { x1: 4, x2: 20, y: 17 },
            ];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={styles.formatToolbarSvg}
      aria-hidden
    >
      {lines.map((line) => (
        <line
          key={`${line.y}-${line.x1}`}
          x1={line.x1}
          y1={line.y}
          x2={line.x2}
          y2={line.y}
          {...lineProps}
        />
      ))}
    </svg>
  );
}

type InlineFormatKind = 'bold' | 'italic' | 'underline';

const INLINE_FORMAT_TAGS: Record<InlineFormatKind, string[]> = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
};

const INLINE_FORMAT_EXEC: Record<InlineFormatKind, 'bold' | 'italic' | 'underline'> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
};

const INLINE_FORMAT_WRAP: Record<
  InlineFormatKind,
  { before: string; after: string; placeholder: string }
> = {
  bold: { before: '<strong>', after: '</strong>', placeholder: 'жирный текст' },
  italic: { before: '<em>', after: '</em>', placeholder: 'курсив' },
  underline: { before: '<u>', after: '</u>', placeholder: 'подчёркнуто' },
};

function tryUnwrapHtmlInlineTags(
  source: string,
  start: number,
  end: number,
  tags: string[]
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  for (const tag of tags) {
    const wrappedRe = new RegExp(`^\\s*<${tag}(\\s[^>]*)?>([\\s\\S]*)</${tag}>\\s*$`, 'i');
    const wrapped = selected.match(wrappedRe);
    if (wrapped) {
      const inner = wrapped[2] ?? '';
      return {
        next: source.slice(0, start) + inner + source.slice(end),
        cursor: start,
        selectLength: inner.length,
      };
    }
  }
  for (const tag of tags) {
    const openRe = new RegExp(`<${tag}(\\s[^>]*)?>\\s*$`, 'i');
    const closeRe = new RegExp(`^\\s*</${tag}>`, 'i');
    const before = source.slice(0, start);
    const after = source.slice(end);
    const openM = before.match(openRe);
    const closeM = after.match(closeRe);
    if (openM && closeM) {
      const openStart = start - openM[0].length;
      const closeEnd = end + closeM[0].length;
      return {
        next: source.slice(0, openStart) + selected + source.slice(closeEnd),
        cursor: openStart,
        selectLength: selected.length,
      };
    }
  }
  return null;
}

const HTML_FONT_WEIGHT_BOLD_STYLE_RE = /font-weight\s*:\s*(?:bold|bolder|[7-9]00)\b/i;
const HTML_FONT_STYLE_ITALIC_RE = /font-style\s*:\s*italic\b/i;
const HTML_BOLD_STYLE_TAG_NAMES = 'span|p|div|td|th|li|b|strong';
const HTML_ITALIC_STYLE_TAG_NAMES = 'span|p|div|td|th|li|em|i';

function htmlTagChunkIsBoldMarkup(tagName: string, attrs: string): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong') return true;
  return HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(attrs);
}

function htmlTagChunkIsItalicMarkup(tagName: string, attrs: string): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'em' || tag === 'i') return true;
  return HTML_FONT_STYLE_ITALIC_RE.test(attrs);
}

function tryUnwrapHtmlFontStyleItalic(
  source: string,
  start: number,
  end: number
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  const wrappedRe = new RegExp(
    `^\\s*<(${HTML_ITALIC_STYLE_TAG_NAMES})(\\s[^>]*)>([\\s\\S]*)<\\/\\1>\\s*$`,
    'i'
  );
  const wrapped = selected.match(wrappedRe);
  if (wrapped) {
    const tagName = wrapped[1] ?? '';
    const attrs = wrapped[2] ?? '';
    if (!htmlTagChunkIsItalicMarkup(tagName, attrs)) return null;
    const inner = wrapped[3] ?? '';
    return {
      next: source.slice(0, start) + inner + source.slice(end),
      cursor: start,
      selectLength: inner.length,
    };
  }
  const openRe = new RegExp(`<(${HTML_ITALIC_STYLE_TAG_NAMES})(\\s[^>]*)>\\s*$`, 'i');
  const closeRe = new RegExp(`^\\s*<\\/(${HTML_ITALIC_STYLE_TAG_NAMES})>`, 'i');
  const before = source.slice(0, start);
  const after = source.slice(end);
  const openM = before.match(openRe);
  const closeM = after.match(closeRe);
  if (openM && closeM) {
    const tagName = openM[1] ?? '';
    const attrs = openM[2] ?? '';
    if (!htmlTagChunkIsItalicMarkup(tagName, attrs)) return null;
    const openStart = start - openM[0].length;
    const closeEnd = end + closeM[0].length;
    return {
      next: source.slice(0, openStart) + selected + source.slice(closeEnd),
      cursor: openStart,
      selectLength: selected.length,
    };
  }
  return null;
}

function tryUnwrapHtmlFontWeightBold(
  source: string,
  start: number,
  end: number
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  const wrappedRe = new RegExp(
    `^\\s*<(${HTML_BOLD_STYLE_TAG_NAMES})(\\s[^>]*)>([\\s\\S]*)<\\/\\1>\\s*$`,
    'i'
  );
  const wrapped = selected.match(wrappedRe);
  if (wrapped) {
    const tagName = wrapped[1] ?? '';
    const attrs = wrapped[2] ?? '';
    if (!htmlTagChunkIsBoldMarkup(tagName, attrs)) return null;
    const inner = wrapped[3] ?? '';
    return {
      next: source.slice(0, start) + inner + source.slice(end),
      cursor: start,
      selectLength: inner.length,
    };
  }
  const openRe = new RegExp(`<(${HTML_BOLD_STYLE_TAG_NAMES})(\\s[^>]*)>\\s*$`, 'i');
  const closeRe = new RegExp(`^\\s*<\\/${HTML_BOLD_STYLE_TAG_NAMES}>`, 'i');
  const before = source.slice(0, start);
  const after = source.slice(end);
  const openM = before.match(openRe);
  const closeM = after.match(closeRe);
  if (openM && closeM) {
    const tagName = openM[1] ?? '';
    const attrs = openM[2] ?? '';
    if (!htmlTagChunkIsBoldMarkup(tagName, attrs)) return null;
    const openStart = start - openM[0].length;
    const closeEnd = end + closeM[0].length;
    return {
      next: source.slice(0, openStart) + selected + source.slice(closeEnd),
      cursor: openStart,
      selectLength: selected.length,
    };
  }
  return null;
}

function isBoldFontWeightValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'bold' || normalized === 'bolder') return true;
  const numeric = Number.parseInt(normalized, 10);
  return !Number.isNaN(numeric) && numeric >= 700;
}

function rangeCloneContainsBoldMarkup(range: Range): boolean {
  const fragment = range.cloneContents();
  if (fragment.querySelector('b, strong, B, STRONG')) return true;
  for (const el of fragment.querySelectorAll<HTMLElement>('[style]')) {
    const styleAttr = el.getAttribute('style') ?? '';
    if (HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(styleAttr)) return true;
    if (isBoldFontWeightValue(el.style.fontWeight)) return true;
  }
  return false;
}

function isItalicFontStyleValue(value: string): boolean {
  return value.trim().toLowerCase() === 'italic';
}

function rangeCloneContainsItalicMarkup(range: Range): boolean {
  const fragment = range.cloneContents();
  if (fragment.querySelector('em, i, EM, I')) return true;
  for (const el of fragment.querySelectorAll<HTMLElement>('[style]')) {
    const styleAttr = el.getAttribute('style') ?? '';
    if (HTML_FONT_STYLE_ITALIC_RE.test(styleAttr)) return true;
    if (isItalicFontStyleValue(el.style.fontStyle)) return true;
  }
  return false;
}

function unwrapElementNode(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function rangeFullyContainsNode(range: Range, node: Node): boolean {
  const nodeRange = document.createRange();
  nodeRange.selectNode(node);
  const startsBeforeOrAt = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0;
  const endsAfterOrAt = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
  return startsBeforeOrAt && endsAfterOrAt;
}

function stripBoldFontWeightFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (
    !HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(styleAttr) &&
    !isBoldFontWeightValue(el.style.fontWeight)
  ) {
    return;
  }
  el.style.fontWeight = 'normal';
  const nextStyle = styleAttr
    .replace(/font-weight\s*:\s*(?:bold|bolder|[7-9]00)\s*;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function stripBoldFromHtmlFragment(fragment: DocumentFragment): DocumentFragment {
  const holder = document.createElement('div');
  holder.appendChild(fragment);
  for (const el of [...holder.querySelectorAll('b, strong, B, STRONG')]) {
    unwrapElementNode(el);
  }
  for (const el of holder.querySelectorAll<HTMLElement>('[style]')) {
    stripBoldFontWeightFromElementStyle(el);
  }
  const result = document.createDocumentFragment();
  while (holder.firstChild) result.appendChild(holder.firstChild);
  return result;
}

function stripBoldFromRangeInEditor(editor: HTMLElement, range: Range): void {
  const boldElements = [...editor.querySelectorAll<HTMLElement>('b, strong, B, STRONG')];
  for (const el of boldElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    unwrapElementNode(el);
  }
  const styledElements = [...editor.querySelectorAll<HTMLElement>('[style]')];
  for (const el of styledElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    stripBoldFontWeightFromElementStyle(el);
  }
}

function stripItalicFontStyleFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (!HTML_FONT_STYLE_ITALIC_RE.test(styleAttr) && !isItalicFontStyleValue(el.style.fontStyle)) {
    return;
  }
  el.style.fontStyle = 'normal';
  const nextStyle = styleAttr
    .replace(/font-style\s*:\s*italic\s*;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function stripItalicFromRangeInEditor(editor: HTMLElement, range: Range): void {
  const italicElements = [...editor.querySelectorAll<HTMLElement>('em, i, EM, I')];
  for (const el of italicElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    unwrapElementNode(el);
  }
  const styledElements = [...editor.querySelectorAll<HTMLElement>('[style]')];
  for (const el of styledElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    stripItalicFontStyleFromElementStyle(el);
  }
}

function toggleVisualBoldInEditor(editor: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    document.execCommand('bold');
    return;
  }
  const shouldUnbold = document.queryCommandState('bold') || rangeCloneContainsBoldMarkup(range);
  if (shouldUnbold) {
    if (document.queryCommandState('bold')) {
      document.execCommand('bold');
      return;
    }
    stripBoldFromRangeInEditor(editor, range);
    return;
  }
  document.execCommand('bold');
}

function toggleVisualItalicInEditor(editor: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    document.execCommand('italic');
    return;
  }
  const shouldUnitalic =
    document.queryCommandState('italic') || rangeCloneContainsItalicMarkup(range);
  if (shouldUnitalic) {
    if (document.queryCommandState('italic')) {
      document.execCommand('italic');
      return;
    }
    stripItalicFromRangeInEditor(editor, range);
    return;
  }
  document.execCommand('italic');
}

/** Размеры как в списке Word (пт). */
const VISUAL_FONT_SIZE_PT_OPTIONS = [
  8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
] as const;

const DEFAULT_VISUAL_FONT_SIZE_PT = 11;

function pxToPt(px: number): number {
  return Math.round(((px * 72) / 96) * 2) / 2;
}

function parseCssFontSizeToPt(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  const ptMatch = normalized.match(/^([\d.]+)\s*pt$/);
  if (ptMatch) {
    const pt = Number.parseFloat(ptMatch[1]);
    return Number.isFinite(pt) ? pt : null;
  }
  const pxMatch = normalized.match(/^([\d.]+)\s*px$/);
  if (pxMatch) {
    const px = Number.parseFloat(pxMatch[1]);
    return Number.isFinite(px) ? pxToPt(px) : null;
  }
  return null;
}

function getInlineFontSizePt(el: HTMLElement): number | null {
  const styleAttr = el.getAttribute('style') ?? '';
  const fromAttr = styleAttr.match(/font-size\s*:\s*([^;]+)/i)?.[1]?.trim();
  if (fromAttr) {
    const pt = parseCssFontSizeToPt(fromAttr);
    if (pt != null) return pt;
  }
  if (el.style.fontSize) {
    const pt = parseCssFontSizeToPt(el.style.fontSize);
    if (pt != null) return pt;
  }
  return null;
}

function collectSelectionFontSizesPt(editor: HTMLElement, range: Range): number[] {
  const sizes: number[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent?.replace(/\u200B/g, '').trim() ?? '';
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    let pt = getInlineFontSizePt(parent);
    if (pt == null) {
      const computed = window.getComputedStyle(parent).fontSize;
      pt = parseCssFontSizeToPt(computed) ?? DEFAULT_VISUAL_FONT_SIZE_PT;
    }
    sizes.push(pt);
  }
  return sizes;
}

function getVisualSelectionFontSizePt(
  editor: HTMLElement,
  range: Range
): { pt: number; mixed: boolean } {
  const sizes = collectSelectionFontSizesPt(editor, range);
  if (sizes.length === 0) {
    return { pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false };
  }
  const first = sizes[0];
  const mixed = sizes.some((size) => Math.abs(size - first) > 0.01);
  return { pt: first, mixed };
}

function stripFontSizeFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (!/font-size\s*:/i.test(styleAttr) && !el.style.fontSize) return;
  el.style.fontSize = '';
  const nextStyle = styleAttr
    .replace(/font-size\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function replaceFontElementWithSizedSpan(fontEl: Element, sizePt: number): HTMLSpanElement {
  const span = document.createElement('span');
  span.style.fontSize = `${sizePt}pt`;
  while (fontEl.firstChild) span.appendChild(fontEl.firstChild);
  return span;
}

function applyVisualFontSizePt(editor: HTMLElement, sizePt: number): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  if (range.collapsed) {
    const block = findVisualBlockElement(editor, range.startContainer);
    if (block) {
      block.style.fontSize = `${sizePt}pt`;
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${sizePt}pt`;
    span.appendChild(document.createTextNode('\u200B'));
    range.insertNode(span);
    const caret = document.createRange();
    caret.setStart(span.firstChild!, 1);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    return;
  }

  const extracted = range.extractContents();
  const holder = document.createElement('div');
  holder.appendChild(extracted);
  for (const fontEl of [...holder.querySelectorAll('font')]) {
    fontEl.replaceWith(replaceFontElementWithSizedSpan(fontEl, sizePt));
  }
  for (const el of holder.querySelectorAll<HTMLElement>('*')) {
    stripFontSizeFromElementStyle(el);
  }
  const span = document.createElement('span');
  span.style.fontSize = `${sizePt}pt`;
  while (holder.firstChild) span.appendChild(holder.firstChild);
  range.insertNode(span);
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(nextRange);
}

const VISUAL_BLOCK_TAGS = new Set([
  'P',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TD',
  'TH',
  'BLOCKQUOTE',
]);

function findVisualBlockElement(editor: HTMLElement, node: Node | null): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== editor) {
    if (current instanceof HTMLElement && VISUAL_BLOCK_TAGS.has(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function findVisualBlockAtCollapsedCaret(editor: HTMLElement, range: Range): HTMLElement | null {
  const direct = findVisualBlockElement(editor, range.startContainer);
  if (direct) return direct;

  if (range.startContainer === editor) {
    const next = editor.children[range.startOffset];
    if (next instanceof HTMLElement && VISUAL_BLOCK_TAGS.has(next.tagName)) return next;
    const prev = editor.children[range.startOffset - 1];
    if (prev instanceof HTMLElement && VISUAL_BLOCK_TAGS.has(prev.tagName)) return prev;
  }

  return null;
}

function collectVisualBlocksInRange(editor: HTMLElement, range: Range): HTMLElement[] {
  const blocks = new Set<HTMLElement>();

  if (range.collapsed) {
    const block = findVisualBlockAtCollapsedCaret(editor, range);
    if (block) blocks.add(block);
    return [...blocks];
  }

  for (const el of editor.querySelectorAll<HTMLElement>(
    'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote'
  )) {
    if (range.intersectsNode(el)) blocks.add(el);
  }

  if (blocks.size === 0) {
    const block = findVisualBlockElement(editor, range.commonAncestorContainer);
    if (block) blocks.add(block);
  }

  return [...blocks];
}

const HTML_BLOCK_ALIGN_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'td',
  'th',
  'blockquote',
] as const;

function normalizeTextAlignKeyword(raw: string): ParagraphTextAlign | null {
  const value = raw.toLowerCase();
  if (value === 'center') return 'center';
  if (value === 'right' || value === 'end') return 'right';
  if (value === 'justify') return 'justify';
  if (value === 'left' || value === 'start') return 'left';
  return null;
}

/** Только явный text-align в CSS-тексте (атрибут style или style.*). */
function parseExplicitTextAlign(cssText: string | null | undefined): ParagraphTextAlign | null {
  if (!cssText) return null;
  const match = cssText.match(/text-align\s*:\s*([\w-]+)/i);
  if (!match) return null;
  return normalizeTextAlignKeyword(match[1]);
}

function getBlockTextAlign(block: HTMLElement): ParagraphTextAlign | null {
  const fromAttr = parseExplicitTextAlign(block.getAttribute('style'));
  if (fromAttr) return fromAttr;
  const fromInline = parseExplicitTextAlign(block.style.cssText);
  if (fromInline) return fromInline;
  return normalizeTextAlignKeyword(window.getComputedStyle(block).textAlign);
}

function getVisualSelectionTextAlign(editor: HTMLElement, range: Range): ParagraphTextAlign | null {
  const blocks = collectVisualBlocksInRange(editor, range);
  if (blocks.length === 0) return null;
  const aligns = blocks.map(getBlockTextAlign);
  if (aligns.some((align) => align === null)) return null;
  const first = aligns[0];
  return aligns.every((align) => align === first) ? first : null;
}

type HeadingLevel = 1 | 2 | 3;

function getBlockHeadingLevel(block: HTMLElement): HeadingLevel | null {
  const tag = block.tagName;
  if (tag === 'H1') return 1;
  if (tag === 'H2') return 2;
  if (tag === 'H3') return 3;
  return null;
}

function getVisualSelectionHeadingLevelFromCommand(): HeadingLevel | null {
  const formatBlock = String(document.queryCommandValue('formatBlock') ?? '')
    .trim()
    .toLowerCase();
  const match = formatBlock.match(/^h([1-3])$/);
  if (!match) return null;
  return Number(match[1]) as HeadingLevel;
}

function getVisualSelectionHeadingLevel(editor: HTMLElement, range: Range): HeadingLevel | null {
  const blocks = collectVisualBlocksInRange(editor, range);
  if (blocks.length === 0) return getVisualSelectionHeadingLevelFromCommand();
  const levels = blocks.map(getBlockHeadingLevel);
  const first = levels[0];
  return levels.every((level) => level === first) ? first : null;
}

function parseHeadingLevelFromOpenTagHtml(openTag: string): HeadingLevel | null {
  const match = openTag.match(/^<h([1-3])\b/i);
  if (!match) return null;
  return Number(match[1]) as HeadingLevel;
}

function getHtmlSelectionHeadingLevel(
  source: string,
  start: number,
  end: number
): HeadingLevel | null {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return null;
  const levels = blocks.map((block) =>
    parseHeadingLevelFromOpenTagHtml(source.slice(block.openTagStart, block.openTagEnd))
  );
  const first = levels[0];
  return levels.every((level) => level === first) ? first : null;
}

function parseTextAlignFromHtmlAttrs(attrs: string): ParagraphTextAlign | null {
  const styleMatch = attrs.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  const styleValue = styleMatch?.[2] ?? styleMatch?.[3] ?? '';
  return parseExplicitTextAlign(styleValue);
}

type HtmlBlockOpenTagRef = {
  openTagStart: number;
  openTagEnd: number;
  attrs: string;
};

function findHtmlBlockOpenTagRefAtOffset(
  source: string,
  offset: number
): HtmlBlockOpenTagRef | null {
  for (const tag of HTML_BLOCK_ALIGN_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = openEnd;
      const closeMatch = closeRe.exec(source);
      if (!closeMatch) continue;
      if (offset >= openEnd && offset <= closeMatch.index) {
        return { openTagStart: openStart, openTagEnd: openEnd, attrs: match[1] ?? '' };
      }
    }
  }
  return null;
}

function collectHtmlBlockOpenTagRefsIntersectingRange(
  source: string,
  start: number,
  end: number
): HtmlBlockOpenTagRef[] {
  const blocks: {
    openTagStart: number;
    openTagEnd: number;
    attrs: string;
    contentStart: number;
    contentEnd: number;
  }[] = [];
  for (const tag of HTML_BLOCK_ALIGN_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = openEnd;
      const closeMatch = closeRe.exec(source);
      if (!closeMatch) continue;
      blocks.push({
        openTagStart: openStart,
        openTagEnd: openEnd,
        attrs: match[1] ?? '',
        contentStart: openEnd,
        contentEnd: closeMatch.index,
      });
    }
  }
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);
  const hits = blocks.filter(
    (block) => block.contentStart < rangeEnd && block.contentEnd > rangeStart
  );
  if (hits.length > 0) {
    hits.sort((a, b) => b.openTagStart - a.openTagStart);
    return hits.map(({ openTagStart, openTagEnd, attrs }) => ({ openTagStart, openTagEnd, attrs }));
  }

  const caretBlock = findHtmlBlockOpenTagRefAtOffset(source, rangeStart);
  if (caretBlock) return [caretBlock];

  const ahead = source.slice(rangeStart);
  const beforeTag = ahead.match(/^<(p|h[1-6]|li|td|th|blockquote)(\s[^>]*)?>/i);
  if (beforeTag) {
    return [
      {
        openTagStart: rangeStart,
        openTagEnd: rangeStart + beforeTag[0].length,
        attrs: beforeTag[2] ?? '',
      },
    ];
  }

  return [];
}

function collectHtmlBlocksIntersectingRange(
  source: string,
  start: number,
  end: number
): { attrs: string }[] {
  return collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
}

function getHtmlSelectionTextAlign(
  source: string,
  start: number,
  end: number
): ParagraphTextAlign | null {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return null;
  const aligns = blocks.map((block) => parseTextAlignFromHtmlAttrs(block.attrs));
  if (aligns.some((align) => align === null)) return null;
  const first = aligns[0];
  return aligns.every((align) => align === first) ? first : null;
}

function applyVisualLineSpacing(
  editor: HTMLElement,
  lineHeight: number,
  marginBottomPt: number
): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  for (const block of collectVisualBlocksInRange(editor, range)) {
    block.style.lineHeight = String(lineHeight);
    block.style.marginBottom = `${marginBottomPt}pt`;
  }
}

function setTextIndentInStyleString(style: string, indentCm: number): string {
  let next = style
    .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (indentCm > 0) {
    const indent = `text-indent: ${indentCm}cm`;
    next = next ? `${next}; ${indent}` : indent;
  }
  return next;
}

function syncBlockElementStyleAttribute(block: HTMLElement): void {
  const cssText = block.style.cssText.trim().replace(/;;+/g, ';');
  if (cssText) block.setAttribute('style', cssText);
  else block.removeAttribute('style');
}

function applyTextIndentToBlockElement(block: HTMLElement, indentCm: number): void {
  if (indentCm <= 0) block.style.removeProperty('text-indent');
  else block.style.textIndent = `${indentCm}cm`;
  syncBlockElementStyleAttribute(block);
}

function patchHtmlOpenTagTextIndent(openTag: string, indentCm: number): string {
  const styleMatch = openTag.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (styleMatch) {
    const quote = styleMatch[0].includes('"') ? '"' : "'";
    const current = styleMatch[2] ?? styleMatch[3] ?? '';
    const updated = setTextIndentInStyleString(current, indentCm);
    return openTag.replace(styleMatch[0], `style=${quote}${updated}${quote}`);
  }
  if (indentCm <= 0) return openTag;
  return openTag.replace(/>$/, ` style="text-indent: ${indentCm}cm;">`);
}

function applyHtmlParagraphIndentCm(
  source: string,
  start: number,
  end: number,
  indentCm: number
): string {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return source;

  let next = source;
  for (const block of blocks) {
    const openTag = next.slice(block.openTagStart, block.openTagEnd);
    const patched = patchHtmlOpenTagTextIndent(openTag, indentCm);
    next = next.slice(0, block.openTagStart) + patched + next.slice(block.openTagEnd);
  }
  return next;
}

function applyVisualParagraphIndent(editor: HTMLElement, indentCm: number): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  for (const block of collectVisualBlocksInRange(editor, range)) {
    applyTextIndentToBlockElement(block, indentCm);
  }
}

const EMPTY_INLINE_FORMAT_ACTIVE: Record<InlineFormatKind, boolean> = {
  bold: false,
  italic: false,
  underline: false,
};

function isHtmlCaretInsideTag(source: string, pos: number, tag: string): boolean {
  const before = source.slice(0, pos);
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
  const closeRe = new RegExp(`</${tag}>`, 'gi');
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return new RegExp(`^[\\s\\S]*?</${tag}>`, 'i').test(after);
}

function isHtmlCaretInsideFontStyleItalic(source: string, pos: number): boolean {
  const before = source.slice(0, pos);
  const openRe =
    /<(span|p|div|td|th|li|em|i)(\s+[^>]*style="[^"]*font-style\s*:\s*italic[^"]*"[^>]*)>/gi;
  const closeRe = /<\/(span|p|div|td|th|li|em|i)>/gi;
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return /^[\s\S]*?<\/(span|p|div|td|th|li|em|i)>/i.test(after);
}

function isHtmlCaretInsideFontWeightBold(source: string, pos: number): boolean {
  const before = source.slice(0, pos);
  const openRe = /<(span|p)(\s+[^>]*style="[^"]*font-weight\s*:\s*bold[^"]*"[^>]*)>/gi;
  const closeRe = /<\/(span|p)>/gi;
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return /^[\s\S]*?<\/(span|p)>/i.test(after);
}

function selectionPlainTextForCaseCheck(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

function selectionHasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

function isSelectionAllUppercaseLetters(text: string): boolean {
  const letters = text.match(/\p{L}/gu);
  if (!letters?.length) return false;
  return letters.every(
    (ch) => ch === ch.toLocaleUpperCase('ru-RU') && ch !== ch.toLocaleLowerCase('ru-RU')
  );
}

function applyCaseToPlainText(text: string, mode: 'upper' | 'lower'): string {
  return mode === 'upper' ? text.toLocaleUpperCase('ru-RU') : text.toLocaleLowerCase('ru-RU');
}

function applyCaseToHtmlFragment(html: string, mode: 'upper' | 'lower'): string {
  if (!/<[a-z][\s/>]/i.test(html)) {
    return applyCaseToPlainText(html, mode);
  }
  const doc = new DOMParser().parseFromString(`<div id="__case_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__case_root');
  if (!root) return applyCaseToPlainText(html, mode);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = node.textContent ?? '';
    if (!value) continue;
    node.textContent = applyCaseToPlainText(value, mode);
  }
  return root.innerHTML;
}

function isHtmlInlineFormatActive(
  source: string,
  start: number,
  end: number,
  kind: InlineFormatKind
): boolean {
  const tags = INLINE_FORMAT_TAGS[kind];
  if (tryUnwrapHtmlInlineTags(source, start, end, tags)) return true;
  if (kind === 'bold' && tryUnwrapHtmlFontWeightBold(source, start, end)) return true;
  if (kind === 'italic' && tryUnwrapHtmlFontStyleItalic(source, start, end)) return true;
  const positions = start === end ? [start] : [start, end];
  if (kind === 'bold') {
    if (positions.some((pos) => isHtmlCaretInsideFontWeightBold(source, pos))) return true;
  }
  if (kind === 'italic') {
    if (positions.some((pos) => isHtmlCaretInsideFontStyleItalic(source, pos))) return true;
  }
  return tags.some((tag) => positions.some((pos) => isHtmlCaretInsideTag(source, pos, tag)));
}

const TEMPLATES_UI_PREFS_KEY = 'admin.contractDocuments.templates.uiPrefs';
const TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY =
  'admin.contractDocuments.templates.placeholdersCollapsed';
const TEMPLATES_ACTIVE_KIND_KEY = 'admin.contractDocuments.templates.activeKind';
const TEMPLATES_ACTIVE_TAB_KEY = 'admin.contractDocuments.templates.activeTab';
const TEMPLATES_ARCHIVE_MODE_KEY = 'admin.contractDocuments.templates.archiveMode';
const TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY = 'admin.contractDocuments.templates.previewCustomerKind';
const TEMPLATES_PREVIEW_ZOOM_KEY = 'admin.contractDocuments.templates.previewZoomPct';
const TEMPLATES_VISUAL_ZOOM_KEY = 'admin.contractDocuments.templates.visualZoomPct';
const TEMPLATES_VISUAL_HEIGHT_KEY = 'admin.contractDocuments.templates.visualEditorHeightPx';
const TEMPLATES_PREVIEW_HEIGHT_KEY = 'admin.contractDocuments.templates.previewPaneHeightPx';
const TEMPLATES_EDITOR_MODE_KEY = 'admin.contractDocuments.templates.editorMode';
const TEMPLATES_HTML_HEIGHT_KEY = 'admin.contractDocuments.templates.htmlEditorHeightPx';
type NormalizeMode = 'soft' | 'strict';
type TemplatesUiPrefs = {
  previewZoomPct?: number;
  visualZoomPct?: number;
  visualEditorHeightPx?: number;
  previewPaneHeightPx?: number;
  editorMode?: 'html' | 'visual';
  htmlEditorHeightPx?: number;
  activeLibraryKind?: ContractDocumentPackageKind;
  activeTemplateTab?: string;
  previewCustomerKind?: RepairTemplatePreviewCustomerKind;
  showArchivedTemplates?: boolean;
  placeholdersCollapsed?: boolean;
  selectedTemplateByScope?: Record<string, string>;
};

const TEMPLATE_HTML_HISTORY_DEBOUNCE_MS = 400;

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

function normalizeTemplateEditorHtml(raw: string): string {
  return unifyContractDocumentTypographyInHtml(
    normalizeContractActHandwrittenSignaturesInHtml(
      normalizeContractTemplatePageBreaksInHtml(
        normalizeContractLegalListInHtml(repairContractTemplateStructureInHtml(raw))
      )
    )
  );
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
          if (group.some((el) => isLikelyContractTitleElement(el))) {
            i = j;
            continue;
          }
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
      if (isLikelyContractTitleElement(p)) continue;
      const brNodes = Array.from(p.querySelectorAll('br'));
      for (const br of brNodes) {
        br.replaceWith(window.document.createTextNode(' '));
      }
      p.setAttribute('style', 'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;');
      p.textContent = normalizeTextWhitespace(p.textContent ?? '');
    }

    normalizeContractTitleInDom(container);

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

function filterTemplatesByActiveKind(
  items: ContractTemplatePreset[],
  activeKind: ContractDocumentPackageKind
): ContractTemplatePreset[] {
  return items.filter((it) => {
    const kind = (it as ContractTemplatePreset & { kind?: unknown }).kind;
    if (typeof kind !== 'string' || !kind.trim()) return true;
    return kind === activeKind;
  });
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
  const libraryTemplateTabIds = useMemo(
    () => libraryTemplateTabIdsForPackageKind(activeLibraryKind),
    [activeLibraryKind]
  );
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
  const [templateHistory, setTemplateHistory] = useState<string[]>([]);
  const [templateHistoryIndex, setTemplateHistoryIndex] = useState(-1);
  const [firstExecutorProfile, setFirstExecutorProfile] = useState<ExecutorRequisiteProfile | null>(
    null
  );
  const [firstSignatoryProfile, setFirstSignatoryProfile] =
    useState<ContractSignatoryProfile | null>(null);
  const [previewZoomPct, setPreviewZoomPct] = useState(100);
  const [previewZoomDraft, setPreviewZoomDraft] = useState<string | null>(null);
  const [visualZoomPct, setVisualZoomPct] = useState(100);
  const [visualZoomDraft, setVisualZoomDraft] = useState<string | null>(null);
  const [placeholdersCollapsed, setPlaceholdersCollapsed] = useState(false);
  const [tableEditActive, setTableEditActive] = useState(false);
  const [createTemplateHelpOpen, setCreateTemplateHelpOpen] = useState(false);
  const [createTemplateHelpPortalReady, setCreateTemplateHelpPortalReady] = useState(false);
  const createTemplateHelpWrapRef = useRef<HTMLDivElement>(null);
  const [createTemplateTooltipPos, setCreateTemplateTooltipPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [htmlEditorHeightPx, setHtmlEditorHeightPx] = useState<number | null>(null);
  const [visualEditorHeightPx, setVisualEditorHeightPx] = useState<number | null>(null);
  const [previewPaneHeightPx, setPreviewPaneHeightPx] = useState<number | null>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRenameInputRef = useRef<HTMLInputElement>(null);
  const templateHtmlFileInputRef = useRef<HTMLInputElement>(null);
  const createTemplateHelpHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const visualSelectionRangeRef = useRef<Range | null>(null);
  const templateHistoryRef = useRef<string[]>([]);
  const templateHistoryIndexRef = useRef(-1);
  const skipNextTemplateHistoryPushRef = useRef(false);
  const htmlHistoryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uiPrefsLoadedRef = useRef(false);
  const skipInitialUiPrefsPersistRef = useRef(true);
  const skipInitialSizingPersistRef = useRef(true);
  const templatesLoadRequestIdRef = useRef(0);
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
      const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : null;
      if (parsed && typeof parsed.previewZoomPct === 'number') {
        setPreviewZoomPct(clampTemplateEditorZoomPct(parsed.previewZoomPct));
      }
      const previewZoomRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_ZOOM_KEY);
      if (previewZoomRaw != null && Number.isFinite(Number(previewZoomRaw))) {
        setPreviewZoomPct(clampTemplateEditorZoomPct(Number(previewZoomRaw)));
      }
      if (parsed && typeof parsed.visualZoomPct === 'number') {
        setVisualZoomPct(clampTemplateEditorZoomPct(parsed.visualZoomPct));
      }
      const visualZoomRaw = window.localStorage.getItem(TEMPLATES_VISUAL_ZOOM_KEY);
      if (visualZoomRaw != null && Number.isFinite(Number(visualZoomRaw))) {
        setVisualZoomPct(clampTemplateEditorZoomPct(Number(visualZoomRaw)));
      }
      if (parsed && typeof parsed.visualEditorHeightPx === 'number') {
        setVisualEditorHeightPx(clampInt(parsed.visualEditorHeightPx, 220, 2400));
      }
      const visualHeightRaw = window.localStorage.getItem(TEMPLATES_VISUAL_HEIGHT_KEY);
      if (visualHeightRaw != null && Number.isFinite(Number(visualHeightRaw))) {
        setVisualEditorHeightPx(clampInt(Number(visualHeightRaw), 220, 2400));
      }
      if (parsed && typeof parsed.previewPaneHeightPx === 'number') {
        setPreviewPaneHeightPx(clampInt(parsed.previewPaneHeightPx, 220, 2400));
      }
      const previewHeightRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_HEIGHT_KEY);
      if (previewHeightRaw != null && Number.isFinite(Number(previewHeightRaw))) {
        setPreviewPaneHeightPx(clampInt(Number(previewHeightRaw), 220, 2400));
      }
      if (parsed && (parsed.editorMode === 'html' || parsed.editorMode === 'visual')) {
        setEditorMode(parsed.editorMode);
      }
      const editorModeRaw = window.localStorage.getItem(TEMPLATES_EDITOR_MODE_KEY);
      if (editorModeRaw === 'html' || editorModeRaw === 'visual') {
        setEditorMode(editorModeRaw);
      }
      if (parsed && typeof parsed.htmlEditorHeightPx === 'number') {
        setHtmlEditorHeightPx(clampInt(parsed.htmlEditorHeightPx, 220, 2400));
      }
      const htmlHeightRaw = window.localStorage.getItem(TEMPLATES_HTML_HEIGHT_KEY);
      if (htmlHeightRaw != null && Number.isFinite(Number(htmlHeightRaw))) {
        setHtmlEditorHeightPx(clampInt(Number(htmlHeightRaw), 220, 2400));
      }
      let hydratedLibraryKind: ContractDocumentPackageKind = 'REPAIR';
      if (
        parsed &&
        parsed.activeLibraryKind &&
        TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === parsed.activeLibraryKind)
      ) {
        hydratedLibraryKind = parsed.activeLibraryKind;
      }
      const activeKindRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_KIND_KEY);
      if (activeKindRaw && TEMPLATE_LIBRARY_KIND_OPTIONS.some((o) => o.value === activeKindRaw)) {
        hydratedLibraryKind = activeKindRaw as ContractDocumentPackageKind;
      }
      setActiveLibraryKind(hydratedLibraryKind);
      if (parsed && typeof parsed.activeTemplateTab === 'string') {
        setActiveTemplateTab(
          normalizeLibraryTemplateTabForPackageKind(parsed.activeTemplateTab, hydratedLibraryKind)
        );
      }
      const activeTabRaw = window.localStorage.getItem(TEMPLATES_ACTIVE_TAB_KEY);
      if (typeof activeTabRaw === 'string' && activeTabRaw.trim()) {
        setActiveTemplateTab(
          normalizeLibraryTemplateTabForPackageKind(activeTabRaw, hydratedLibraryKind)
        );
      }
      if (
        (parsed && parsed.previewCustomerKind === 'PERSON') ||
        (parsed && parsed.previewCustomerKind === 'COMPANY') ||
        (parsed && parsed.previewCustomerKind === 'ENTREPRENEUR')
      ) {
        setPreviewCustomerKind(parsed.previewCustomerKind as RepairTemplatePreviewCustomerKind);
      }
      const previewKindRaw = window.localStorage.getItem(TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY);
      if (
        previewKindRaw === 'PERSON' ||
        previewKindRaw === 'COMPANY' ||
        previewKindRaw === 'ENTREPRENEUR'
      ) {
        setPreviewCustomerKind(previewKindRaw);
      }
      if (parsed && typeof parsed.showArchivedTemplates === 'boolean') {
        setShowArchivedTemplates(parsed.showArchivedTemplates);
      }
      const archiveModeRaw = window.localStorage.getItem(TEMPLATES_ARCHIVE_MODE_KEY);
      if (archiveModeRaw === '1') setShowArchivedTemplates(true);
      else if (archiveModeRaw === '0') setShowArchivedTemplates(false);
      const collapsedRaw = window.localStorage.getItem(TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY);
      if (collapsedRaw === '1') setPlaceholdersCollapsed(true);
      else if (collapsedRaw === '0') setPlaceholdersCollapsed(false);
      else if (parsed && typeof parsed.placeholdersCollapsed === 'boolean') {
        setPlaceholdersCollapsed(parsed.placeholdersCollapsed);
      }
      if (parsed?.selectedTemplateByScope && typeof parsed.selectedTemplateByScope === 'object') {
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
    if (skipInitialUiPrefsPersistRef.current) {
      skipInitialUiPrefsPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(TEMPLATES_PREVIEW_ZOOM_KEY, String(previewZoomPct));
      window.localStorage.setItem(TEMPLATES_VISUAL_ZOOM_KEY, String(visualZoomPct));
      if (visualEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(visualEditorHeightPx));
      }
      if (previewPaneHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(previewPaneHeightPx));
      }
      window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
      if (htmlEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightPx));
      }
      window.localStorage.setItem(
        TEMPLATES_UI_PREFS_KEY,
        JSON.stringify({
          previewZoomPct,
          visualZoomPct,
          editorMode,
          htmlEditorHeightPx,
          visualEditorHeightPx,
          previewPaneHeightPx,
          activeLibraryKind,
          activeTemplateTab,
          previewCustomerKind,
          showArchivedTemplates,
          placeholdersCollapsed,
          selectedTemplateByScope: preferredTemplateIdsRef.current,
        })
      );
    } catch {
      // ignore localStorage write issues
    }
  }, [
    previewZoomPct,
    visualZoomPct,
    editorMode,
    htmlEditorHeightPx,
    visualEditorHeightPx,
    previewPaneHeightPx,
    activeLibraryKind,
    activeTemplateTab,
    previewCustomerKind,
    showArchivedTemplates,
    placeholdersCollapsed,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!uiPrefsLoadedRef.current) return;
    if (skipInitialSizingPersistRef.current) {
      skipInitialSizingPersistRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(TEMPLATES_PREVIEW_ZOOM_KEY, String(previewZoomPct));
      window.localStorage.setItem(TEMPLATES_VISUAL_ZOOM_KEY, String(visualZoomPct));
      if (visualEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(visualEditorHeightPx));
      }
      if (previewPaneHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(previewPaneHeightPx));
      }
      window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
      if (htmlEditorHeightPx != null) {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightPx));
      }
    } catch {
      // ignore localStorage write issues
    }
  }, [
    previewZoomPct,
    visualZoomPct,
    editorMode,
    htmlEditorHeightPx,
    visualEditorHeightPx,
    previewPaneHeightPx,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const persistOnUnload = () => {
      if (!uiPrefsLoadedRef.current) return;
      try {
        const visualEditorHeightSnapshot =
          visualEditorRef.current?.offsetHeight && visualEditorRef.current.offsetHeight > 0
            ? clampInt(visualEditorRef.current.offsetHeight, 220, 2400)
            : visualEditorHeightPx;
        const previewPaneHeightSnapshot =
          previewPaneRef.current?.offsetHeight && previewPaneRef.current.offsetHeight > 0
            ? clampInt(previewPaneRef.current.offsetHeight, 220, 2400)
            : previewPaneHeightPx;
        const htmlEditorHeightSnapshot =
          htmlTextareaRef.current?.offsetHeight && htmlTextareaRef.current.offsetHeight > 0
            ? clampInt(htmlTextareaRef.current.offsetHeight, 220, 2400)
            : htmlEditorHeightPx;
        window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, editorMode);
        if (htmlEditorHeightSnapshot != null) {
          window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(htmlEditorHeightSnapshot));
        }
        window.localStorage.setItem(
          TEMPLATES_UI_PREFS_KEY,
          JSON.stringify({
            previewZoomPct,
            visualZoomPct,
            editorMode,
            htmlEditorHeightPx: htmlEditorHeightSnapshot,
            visualEditorHeightPx: visualEditorHeightSnapshot,
            previewPaneHeightPx: previewPaneHeightSnapshot,
            activeLibraryKind,
            activeTemplateTab,
            previewCustomerKind,
            showArchivedTemplates,
            placeholdersCollapsed,
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
    previewZoomPct,
    visualZoomPct,
    editorMode,
    htmlEditorHeightPx,
    visualEditorHeightPx,
    previewPaneHeightPx,
    activeLibraryKind,
    activeTemplateTab,
    previewCustomerKind,
    showArchivedTemplates,
    placeholdersCollapsed,
  ]);

  const captureVisualEditorHeight = () => {
    const h = visualEditorRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setVisualEditorHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  const capturePreviewPaneHeight = () => {
    const h = previewPaneRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setPreviewPaneHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  const captureHtmlEditorHeight = () => {
    const h = htmlTextareaRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setHtmlEditorHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  useEffect(() => {
    templateHistoryRef.current = templateHistory;
  }, [templateHistory]);

  useEffect(() => {
    templateHistoryIndexRef.current = templateHistoryIndex;
  }, [templateHistoryIndex]);

  useEffect(
    () => () => {
      if (htmlHistoryDebounceRef.current) {
        clearTimeout(htmlHistoryDebounceRef.current);
      }
    },
    []
  );

  const pushTemplateHistory = useCallback((nextHtml: string) => {
    if (skipNextTemplateHistoryPushRef.current) {
      skipNextTemplateHistoryPushRef.current = false;
      return;
    }
    const { history: next, index } = appendTemplateHistoryEntry(
      templateHistoryRef.current,
      templateHistoryIndexRef.current,
      nextHtml
    );
    templateHistoryRef.current = next;
    templateHistoryIndexRef.current = index;
    setTemplateHistory(next);
    setTemplateHistoryIndex(index);
  }, []);

  const schedulePushTemplateHistoryFromHtml = useCallback(
    (nextHtml: string) => {
      if (htmlHistoryDebounceRef.current) {
        clearTimeout(htmlHistoryDebounceRef.current);
      }
      htmlHistoryDebounceRef.current = setTimeout(() => {
        htmlHistoryDebounceRef.current = null;
        pushTemplateHistory(nextHtml);
      }, TEMPLATE_HTML_HISTORY_DEBOUNCE_MS);
    },
    [pushTemplateHistory]
  );

  const resetTemplateHistory = useCallback((htmlSnapshot: string) => {
    if (htmlHistoryDebounceRef.current) {
      clearTimeout(htmlHistoryDebounceRef.current);
      htmlHistoryDebounceRef.current = null;
    }
    templateHistoryRef.current = [htmlSnapshot];
    templateHistoryIndexRef.current = 0;
    setTemplateHistory([htmlSnapshot]);
    setTemplateHistoryIndex(0);
  }, []);

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
      resetTemplateHistory(next);
      setOk(
        `Файл «${file.name}» загружен в поле HTML (кодировка windows-1251/UTF-8 определяется автоматически). Для фрагментов Word с классом WordSection1 добавлены более плотные отступы и печать с тем же классом docPrintWordCompact. Ползунок «Масштаб» у конструктора/предпросмотра меняет только отображение на экране, не печать. Для правок в конструкторе нажмите «HTML → конструктор».`
      );
    } catch {
      setError('Не удалось прочитать файл');
    }
  };

  const updateCreateTemplateTooltipPosition = useCallback(() => {
    const el = createTemplateHelpWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCreateTemplateTooltipPos({
      top: rect.bottom + 8,
      left: rect.right,
    });
  }, []);

  useEffect(() => {
    setCreateTemplateHelpPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!createTemplateHelpOpen) return;
    updateCreateTemplateTooltipPosition();
    const onScrollOrResize = () => updateCreateTemplateTooltipPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [createTemplateHelpOpen, updateCreateTemplateTooltipPosition]);

  const showCreateTemplateHelp = useCallback(() => {
    if (createTemplateHelpHideTimerRef.current) {
      clearTimeout(createTemplateHelpHideTimerRef.current);
      createTemplateHelpHideTimerRef.current = null;
    }
    updateCreateTemplateTooltipPosition();
    setCreateTemplateHelpOpen(true);
  }, [updateCreateTemplateTooltipPosition]);

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

  const applyTemplateHistorySnapshot = useCallback((htmlSnapshot: string) => {
    skipNextTemplateHistoryPushRef.current = true;
    const normalized = normalizeTemplateEditorHtml(htmlSnapshot);
    setVisualDraftHtml(normalized);
    setHtml(normalized);
    const editor = visualEditorRef.current;
    if (!editor) return;
    const prevScrollTop = editor.scrollTop;
    const wasFocused = window.document.activeElement === editor;
    editor.innerHTML = normalized;
    window.requestAnimationFrame(() => {
      editor.scrollTop = prevScrollTop;
      if (wasFocused) {
        editor.focus({ preventScroll: true });
      }
    });
  }, []);

  const syncVisualEditorToHtmlState = useCallback(() => {
    const next = readVisualEditorHtml();
    setVisualDraftHtml(next);
    setHtml(next);
    return next;
  }, [visualDraftHtml]);

  const switchEditorMode = useCallback(
    (mode: 'html' | 'visual') => {
      if (mode === editorMode) return;
      if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
        try {
          window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, mode);
        } catch {
          // ignore localStorage write issues
        }
      }
      if (mode === 'html') {
        const next = visualEditorRef.current?.innerHTML ?? visualDraftHtml;
        setVisualDraftHtml(next);
        setHtml(next);
        pushTemplateHistory(next);
        setEditorMode('html');
        return;
      }
      const normalized = normalizeTemplateEditorHtml(html);
      setVisualDraftHtml(normalized);
      setHtml(normalized);
      pushTemplateHistory(normalized);
      setEditorMode('visual');
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = normalized || '';
      }
    },
    [editorMode, html, visualDraftHtml, pushTemplateHistory]
  );

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

  const renderedPreviewDisplay = useMemo(() => {
    const withTypography = prepareContractTemplateHtmlForPreview(renderedPreview);
    return isRepairActTwinOneSheetTab(activeTemplateTab, activeLibraryKind)
      ? wrapRepairActTwinCopiesOnOnePageHtml(withTypography)
      : withTypography;
  }, [renderedPreview, activeTemplateTab, activeLibraryKind]);
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
    const requestId = ++templatesLoadRequestIdRef.current;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [templatesRes, executorRes, signatoryRes] = await Promise.allSettled([
          getContractDocumentTemplatePresets(activeLibraryKind),
          getContractDocumentExecutorProfiles(activeLibraryKind),
          getContractDocumentSignatoryProfiles(activeLibraryKind),
        ]);
        if (templatesLoadRequestIdRef.current !== requestId) return;
        if (executorRes.status === 'fulfilled') {
          setFirstExecutorProfile(executorRes.value.items?.[0] ?? null);
        }
        if (signatoryRes.status === 'fulfilled') {
          setFirstSignatoryProfile(signatoryRes.value.items?.[0] ?? null);
        }
        if (templatesRes.status !== 'fulfilled') {
          throw new Error('Не удалось загрузить библиотеку шаблонов');
        }
        const nextRaw = (templatesRes.value.items ?? []).map((it) =>
          normalizeContractTemplatePreset(it)
        );
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
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
        const loadedHtml = normalizeTemplateEditorHtml(t?.html ?? '');
        setHtml(loadedHtml);
        setVisualDraftHtml(loadedHtml);
        resetTemplateHistory(loadedHtml);
        void refreshTrashCount();
      } catch (e) {
        if (templatesLoadRequestIdRef.current !== requestId) return;
        setError(e instanceof Error ? e.message : 'Не удалось загрузить библиотеку шаблонов');
      } finally {
        if (templatesLoadRequestIdRef.current !== requestId) return;
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
    const rawContentHtml = (
      editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? visualDraftHtml) : html
    ).trim();
    const contentHtml = normalizeTemplateEditorHtml(rawContentHtml);
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

  const togglePlaceholdersCollapsed = useCallback(() => {
    setPlaceholdersCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
        try {
          window.localStorage.setItem(TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY, next ? '1' : '0');
          const raw = window.localStorage.getItem(TEMPLATES_UI_PREFS_KEY);
          const parsed = raw ? (JSON.parse(raw) as TemplatesUiPrefs) : {};
          window.localStorage.setItem(
            TEMPLATES_UI_PREFS_KEY,
            JSON.stringify({
              ...parsed,
              placeholdersCollapsed: next,
            })
          );
        } catch {
          // ignore localStorage write issues
        }
      }
      return next;
    });
  }, []);

  const handleActiveLibraryKindChange = useCallback(
    (nextKind: ContractDocumentPackageKind) => {
      if (nextKind === activeLibraryKind) return;
      setActiveLibraryKind(nextKind);
      setActiveTemplateTab((tab) => normalizeLibraryTemplateTabForPackageKind(tab, nextKind));
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ACTIVE_KIND_KEY, nextKind);
        } catch {
          // ignore localStorage write issues
        }
      }
    },
    [activeLibraryKind]
  );

  useEffect(() => {
    setActiveTemplateTab((tab) =>
      normalizeLibraryTemplateTabForPackageKind(tab, activeLibraryKind)
    );
  }, [activeLibraryKind]);

  const handlePreviewCustomerKindChange = useCallback(
    (nextKind: RepairTemplatePreviewCustomerKind) => {
      setPreviewCustomerKind(nextKind);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY, nextKind);
        } catch {
          // ignore localStorage write issues
        }
      }
    },
    []
  );

  const toggleArchiveMode = useCallback(() => {
    setShowArchivedTemplates((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ARCHIVE_MODE_KEY, next ? '1' : '0');
        } catch {
          // ignore localStorage write issues
        }
      }
      return next;
    });
  }, []);

  const handleRenameTemplateTitle = useCallback(() => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return;
    setTitleRenameMode(true);
  }, [isSuperAdmin, editingId, showArchivedTemplates]);

  const handleActiveTemplateTabChange = useCallback(
    (nextTab: RepairLibraryTemplateTabId) => {
      if (nextTab === activeTemplateTab) return;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TEMPLATES_ACTIVE_TAB_KEY, nextTab);
        } catch {
          // ignore localStorage write issues
        }
      }
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
      const loadedHtml = normalizeTemplateEditorHtml(t?.html ?? '');
      setHtml(loadedHtml);
      setVisualDraftHtml(loadedHtml);
      resetTemplateHistory(loadedHtml);
    })();
  };

  const createNewTemplate = () => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    void (async () => {
      await flushAutosave();
      setTitleRenameMode(true);
      setEditingId(`tpl_${Date.now()}`);
      setTitle('Новый шаблон');
      const next = isRepairLibraryTemplateTabId(activeTemplateTab)
        ? libraryTemplateFallbackHtml(activeLibraryKind, activeTemplateTab)
        : '<div class="docPrint"></div>';
      setHtml(next);
      setVisualDraftHtml(next);
      resetTemplateHistory(next);
    })();
  };

  useEffect(() => {
    if (!visualEditorRef.current) return;
    const raw = visualDraftHtml || html || '';
    const source = normalizeTemplateEditorHtml(raw);
    visualEditorRef.current.innerHTML = source;
    if (editorMode === 'visual' && source !== raw) {
      setVisualDraftHtml(source);
      setHtml(source);
    }
    if (editorMode === 'visual' && templateHistoryRef.current.length === 0) {
      resetTemplateHistory(source);
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
    const loadedHtml = t?.html ?? '';
    const repairedHtml =
      activeTemplateTab === 'contract'
        ? repairContractTemplateStructureInHtml(loadedHtml)
        : loadedHtml;
    setHtml(repairedHtml);
    setVisualDraftHtml(repairedHtml);
    resetTemplateHistory(repairedHtml);
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
        const nextRaw = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
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
          resetTemplateHistory('');
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
    const loadedHtml = normalizeTemplateEditorHtml(t?.html ?? '');
    setHtml(loadedHtml);
    setVisualDraftHtml(loadedHtml);
    resetTemplateHistory(loadedHtml);
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
          resetTemplateHistory('');
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
      pushTemplateHistory(next);
      captureVisualSelection();
      window.requestAnimationFrame(() => refreshInlineFormatActiveState());
      return;
    }
    wrapSelection(`<p style="text-align: ${align}; margin: 0 0 8pt;">`, '</p>', 'Новый абзац');
    window.requestAnimationFrame(() => refreshInlineFormatActiveState());
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
  const syncVisualEditorFromDom = () => {
    const el = visualEditorRef.current;
    if (!el) return;
    const next = el.innerHTML;
    setVisualDraftHtml(next);
    setHtml(next);
    pushTemplateHistory(next);
    captureVisualSelection();
  };

  const [bulletMarker, setBulletMarker] = useState<BulletMarkerId>('disc');

  const applyBulletedList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      if (!applyBulletedListInVisualEditor(el, bulletMarker)) {
        setError(
          'Маркированный список нельзя применить внутри договорной нумерации. Выйдите: Enter в пустом пункте.'
        );
        return;
      }
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, ['Пункт списка']);
      return { content: buildBulletedListHtml(lines, bulletMarker) };
    });
  };

  const applyNumberedList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      if (!applyNumberedListInVisualEditor(el)) {
        setError(
          'Обычную нумерацию 1. 2. 3. нельзя смешивать с договорным списком (1. / 1.1.). Выйдите из договорного списка.'
        );
        return;
      }
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, [
        'Пункт 1',
        'Пункт 2',
      ]);
      return { content: buildNumberedListHtml(lines) };
    });
  };

  const applyMultilevelContractList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      applyContractMultilevelListInVisualEditor(el);
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, ['']);
      const section = detectSectionForListHtml(visualEditorRef.current);
      return { content: buildContractLegalListHtml(lines, section) };
    });
    setError(null);
  };

  const insertRemarkBlankLines = () => {
    if (editorMode !== 'visual') {
      setError(
        'Вставка пустых строк для замечаний — в визуальном конструкторе: курсор в пункт списка (1., 1.1., 2.3. …).'
      );
      return;
    }
    const el = visualEditorRef.current;
    if (!el) return;
    el.focus();
    restoreVisualSelection();
    if (insertContractRemarkBlankLinesInVisualEditor(el)) {
      syncVisualEditorFromDom();
      setError(null);
      setOk('Добавлены 2 строки с линией для замечаний. Enter — следующий пункт списка.');
    } else {
      setError(
        'Поставьте курсор в пункт договорного списка (1., 1.1., 2.3. …), после которого нужны пустые строки, и нажмите снова.'
      );
    }
  };

  const repairContractLegalListsInEditor = useCallback(() => {
    if (!isSuperAdmin || editorMode !== 'visual') return;
    const next = normalizeTemplateEditorHtml(readVisualEditorHtml());
    applyTemplateHistorySnapshot(next);
    setOk('Списки исправлены: убрана лишняя обёртка, пустые пункты (1.3) и служебные комментарии.');
    setError(null);
  }, [applyTemplateHistorySnapshot, editorMode, isSuperAdmin, readVisualEditorHtml]);

  const changeListLevel = (direction: 'indent' | 'outdent') => {
    if (editorMode !== 'visual' || !visualEditorRef.current) return;
    visualEditorRef.current.focus();
    restoreVisualSelection();
    if (changeContractLegalListLevel(visualEditorRef.current, direction)) {
      syncVisualEditorFromDom();
      setError(null);
    } else {
      setError(
        '⇤: поднять подпункт на уровень выше. Раздел 2 — Shift+Enter, не Tab (Tab вложит 2 внутрь 1).'
      );
    }
  };

  const renderCleanupToolbar = () => (
    <>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.normalizeSoft.title}
        steps={CLEANUP_TOOLTIP.normalizeSoft.steps}
        note={CLEANUP_TOOLTIP.normalizeSoft.note}
        disabled={!isSuperAdmin}
        onClick={() => normalizeTemplateText('soft')}
      >
        <FormatToolbarSvgIcon icon={SparklesIcon} />
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.normalizeStrict.title}
        steps={CLEANUP_TOOLTIP.normalizeStrict.steps}
        note={CLEANUP_TOOLTIP.normalizeStrict.note}
        disabled={!isSuperAdmin}
        wideGlyph
        onClick={() => normalizeTemplateText('strict')}
      >
        <FormatToolbarGlyph>N+</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.clearFormat.title}
        steps={CLEANUP_TOOLTIP.clearFormat.steps}
        note={CLEANUP_TOOLTIP.clearFormat.note}
        disabled={!isSuperAdmin}
        onClick={clearFormattingInSelection}
      >
        <FormatToolbarGlyph>Tx</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.wordTypography.title}
        steps={CLEANUP_TOOLTIP.wordTypography.steps}
        note={CLEANUP_TOOLTIP.wordTypography.note}
        disabled={!isSuperAdmin}
        onClick={normalizeContractTypographyInEditor}
      >
        <FormatToolbarGlyph>Tt</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </>
  );

  const renderTableStructureToolbar = () => (
    <span className={styles.formatToolbarTableGroup}>
      <FormatToolbarHelpTooltip
        title={INSERT_BLOCK_TOOLTIP.tableAddRow.title}
        steps={INSERT_BLOCK_TOOLTIP.tableAddRow.steps}
        note={INSERT_BLOCK_TOOLTIP.tableAddRow.note}
        disabled={!isSuperAdmin || !tableEditActive}
        onClick={handleAddTableRow}
      >
        <FormatToolbarGlyph>+стр</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={INSERT_BLOCK_TOOLTIP.tableAddColumn.title}
        steps={INSERT_BLOCK_TOOLTIP.tableAddColumn.steps}
        note={INSERT_BLOCK_TOOLTIP.tableAddColumn.note}
        disabled={!isSuperAdmin || !tableEditActive}
        onClick={handleAddTableColumn}
      >
        <FormatToolbarGlyph>+стб</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </span>
  );

  const renderListToolbar = () => (
    <>
      <span className={styles.formatToolbarListGroup}>
        <select
          className={styles.formatToolbarListMarkerSelect}
          value={bulletMarker}
          disabled={!isSuperAdmin}
          aria-label="Вид маркера маркированного списка"
          title="Вид маркера"
          onChange={(e) => setBulletMarker(e.target.value as BulletMarkerId)}
        >
          {BULLET_MARKER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} title={option.title}>
              {option.glyph}
            </option>
          ))}
        </select>
        <FormatToolbarHelpTooltip
          title={LIST_TOOLTIP.bullet.title}
          steps={LIST_TOOLTIP.bullet.steps}
          note={LIST_TOOLTIP.bullet.note}
          disabled={!isSuperAdmin}
          onClick={applyBulletedList}
        >
          <FormatToolbarSvgIcon icon={ListBulletIcon} />
        </FormatToolbarHelpTooltip>
      </span>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.numbered.title}
        steps={LIST_TOOLTIP.numbered.steps}
        note={LIST_TOOLTIP.numbered.note}
        disabled={!isSuperAdmin}
        onClick={applyNumberedList}
      >
        <FormatToolbarSvgIcon icon={NumberedListIcon} />
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.multilevel.title}
        steps={LIST_TOOLTIP.multilevel.steps}
        note={LIST_TOOLTIP.multilevel.note}
        disabled={!isSuperAdmin}
        onClick={applyMultilevelContractList}
      >
        <FormatToolbarGlyph>1.</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.outdent.title}
        steps={LIST_TOOLTIP.outdent.steps}
        note={LIST_TOOLTIP.outdent.note}
        disabled={!isSuperAdmin}
        onClick={() => changeListLevel('outdent')}
      >
        <FormatToolbarGlyph>⇤</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.indent.title}
        steps={LIST_TOOLTIP.indent.steps}
        note={LIST_TOOLTIP.indent.note}
        disabled={!isSuperAdmin}
        onClick={() => changeListLevel('indent')}
      >
        <FormatToolbarGlyph>⇥</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={REMARK_BLANK_LINES_TOOLTIP.title}
        steps={REMARK_BLANK_LINES_TOOLTIP.steps}
        note={REMARK_BLANK_LINES_TOOLTIP.note}
        disabled={!isSuperAdmin}
        onClick={insertRemarkBlankLines}
      >
        <FormatToolbarGlyph>2⏎</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title="Починить списки"
        steps={[
          'Если пустой подпункт мешает — нажмите эту кнопку.',
          'Убирается лишний обычный список, выравнивается структура 1 / 1.1 и пустые пункты.',
          'После исправления сохраните шаблон.',
        ]}
        note="Выполняется автоматически при открытии и сохранении шаблона."
        disabled={!isSuperAdmin}
        onClick={repairContractLegalListsInEditor}
      >
        <FormatToolbarGlyph>Списки</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </>
  );

  const handleVisualEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editorMode !== 'visual' || !isSuperAdmin) return;
    const el = visualEditorRef.current;
    if (!el) return;

    if (e.key === 'Tab') {
      const sel = window.getSelection();
      const node = sel?.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
      if (isNodeInsideContractLegalList(el, node)) {
        e.preventDefault();
        changeContractLegalListLevel(el, e.shiftKey ? 'outdent' : 'indent');
        syncVisualEditorFromDom();
      }
      return;
    }

    if (e.key === 'Enter' && e.shiftKey) {
      if (handleContractLegalListShiftEnter(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (handleContractLegalListEnter(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
        return;
      }
    }

    if (e.key === 'Backspace') {
      if (handleContractLegalListBackspace(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
      }
    }
  };
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
      content: buildRepairContractRequisitesInsertHtmlForToolbar(),
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
      editor.focus();
      restoreVisualSelection();
      const cell = findTableCellInEditor(editor, window.getSelection());
      if (!cell) {
        setError('Поставьте курсор в ячейку таблицы, затем нажмите «+стр».');
        return;
      }
      const nextCell = addTableRowBelowCell(cell);
      focusTableCell(editor, nextCell);
      syncVisualEditorFromDom();
      setError(null);
      return;
    }
    const textarea = htmlTextareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? 0;
    const next = addTableRowInHtml(html, cursor);
    if (!next) {
      setError('Поставьте курсор внутрь таблицы (<table>…</table>), затем нажмите «+стр».');
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

  const handleAddTableColumn = () => {
    if (!isSuperAdmin) return;
    if (editorMode === 'visual') {
      const editor = visualEditorRef.current;
      if (!editor) return;
      editor.focus();
      restoreVisualSelection();
      const cell = findTableCellInEditor(editor, window.getSelection());
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
  }, [applyTemplateHistorySnapshot, isSuperAdmin]);

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
  }, [applyTemplateHistorySnapshot, isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')
      ) {
        // handled in editors; still allow undo for template when focus in our editors
      }
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
  }, [handleTemplateRedo, handleTemplateUndo, isSuperAdmin]);

  const commitVisualZoomDraft = useCallback(() => {
    const raw = (visualZoomDraft ?? '').trim();
    setVisualZoomDraft(null);
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    setVisualZoomPct(clampTemplateEditorZoomPct(n));
  }, [visualZoomDraft]);

  const stepVisualZoom = useCallback((delta: number) => {
    setVisualZoomDraft(null);
    setVisualZoomPct((prev) => clampTemplateEditorZoomPct(prev + delta));
  }, []);

  const commitPreviewZoomDraft = useCallback(() => {
    const raw = (previewZoomDraft ?? '').trim();
    setPreviewZoomDraft(null);
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    setPreviewZoomPct(clampTemplateEditorZoomPct(n));
  }, [previewZoomDraft]);

  const stepPreviewZoom = useCallback((delta: number) => {
    setPreviewZoomDraft(null);
    setPreviewZoomPct((prev) => clampTemplateEditorZoomPct(prev + delta));
  }, []);

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
    const pastedHtml = e.clipboardData.getData('text/html');
    const pastedText = e.clipboardData.getData('text/plain');
    const sanitized = pastedHtml.trim()
      ? sanitizePastedContractHtml(pastedHtml)
      : pastedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    visualEditorRef.current?.focus();
    restoreVisualSelection();
    document.execCommand('insertHTML', false, sanitized || '');
    const el = visualEditorRef.current;
    if (!el) return;
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

  const formatTools: FormatTool[] = [
    {
      id: 'h1',
      title: 'Заголовок H1',
      icon: <FormatToolbarGlyph>H1</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(1),
      isActive: headingLevelActive === 1,
      ariaPressed: headingLevelActive === 1,
    },
    {
      id: 'h2',
      title: 'Заголовок H2',
      icon: <FormatToolbarGlyph>H2</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(2),
      isActive: headingLevelActive === 2,
      ariaPressed: headingLevelActive === 2,
    },
    {
      id: 'h3',
      title: 'Заголовок H3',
      icon: <FormatToolbarGlyph>H3</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(3),
      isActive: headingLevelActive === 3,
      ariaPressed: headingLevelActive === 3,
    },
    {
      id: 'align-left',
      title: 'Выравнивание по левому краю',
      icon: <FormatToolbarTextAlignIcon kind="left" />,
      onClick: () => wrapParagraphWithAlign('left'),
      isActive: paragraphAlignActive === 'left',
      ariaPressed: paragraphAlignActive === 'left',
    },
    {
      id: 'align-center',
      title: 'Выравнивание по центру',
      icon: <FormatToolbarTextAlignIcon kind="center" />,
      onClick: () => wrapParagraphWithAlign('center'),
      isActive: paragraphAlignActive === 'center',
      ariaPressed: paragraphAlignActive === 'center',
    },
    {
      id: 'align-right',
      title: 'Выравнивание по правому краю',
      icon: <FormatToolbarTextAlignIcon kind="right" />,
      onClick: () => wrapParagraphWithAlign('right'),
      isActive: paragraphAlignActive === 'right',
      ariaPressed: paragraphAlignActive === 'right',
    },
    {
      id: 'align-justify',
      title: 'Выравнивание по ширине',
      icon: <FormatToolbarTextAlignIcon kind="justify" />,
      onClick: () => wrapParagraphWithAlign('justify'),
      isActive: paragraphAlignActive === 'justify',
      ariaPressed: paragraphAlignActive === 'justify',
    },
    {
      id: 'paragraph-indent',
      title: 'Красная строка 1,25 см для текущего абзаца (не создаёт новый)',
      icon: <FormatToolbarGlyph>¶</FormatToolbarGlyph>,
      onClick: wrapParagraphWithIndent,
    },
    {
      id: 'indent-none',
      title: 'Убрать отступ первой строки у текущего абзаца',
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
      title: 'Узкий межстрочный интервал (выделенный абзац)',
      icon: <FormatToolbarGlyph>↕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.3, 6),
    },
    {
      id: 'spacing-wide',
      title: 'Широкий межстрочный интервал (выделенный абзац)',
      icon: <FormatToolbarGlyph>⇕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.6, 10),
    },
    {
      id: 'spacing-contract-dense',
      title:
        'Уплотнить / разредить договор (≡): весь договор без выделения; с выделением — только выбранные абзацы. Повторный клик — обратно',
      icon: <FormatToolbarGlyph>≡</FormatToolbarGlyph>,
      onClick: applyCompactContractSpacing,
      help: {
        title: 'Интервалы между абзацами',
        steps: [
          'Без выделения: переключает весь договор (уплотнить ↔ обычные отступы).',
          'С выделенным текстом: только затронутые абзацы и заголовки разделов.',
          'Повторный клик по ≡ возвращает прежние отступы (≈6pt между абзацами).',
        ],
        note: 'Сохраните шаблон и проверьте печать. Для одного абзаца можно выделить его и нажать ≡.',
      },
    },
    {
      id: 'bold',
      title: 'Жирный (Ж)',
      icon: <FormatToolbarGlyph>Ж</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('bold'),
      isActive: inlineFormatActive.bold,
      ariaPressed: inlineFormatActive.bold,
    },
    {
      id: 'italic',
      title: 'Курсив (К)',
      icon: <FormatToolbarGlyph>К</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('italic'),
      isActive: inlineFormatActive.italic,
      ariaPressed: inlineFormatActive.italic,
    },
    {
      id: 'underline',
      title: 'Подчёркивание (Ч)',
      icon: <FormatToolbarGlyph>Ч</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('underline'),
      isActive: inlineFormatActive.underline,
      ariaPressed: inlineFormatActive.underline,
    },
    {
      id: 'uppercase',
      title: 'Верхний регистр (повторный клик — нижний регистр)',
      icon: <FormatToolbarGlyph>AA</FormatToolbarGlyph>,
      onClick: toggleUppercaseSelection,
    },
    {
      id: 'signatures',
      title: 'Подписи сторон',
      icon: <FormatToolbarSvgIcon icon={PencilSquareIcon} />,
      onClick: insertSignatureLines,
    },
    {
      id: 'signatures-act-handwritten',
      title: INSERT_BLOCK_TOOLTIP.signaturesActHandwritten.title,
      icon: <FormatToolbarGlyph>Пдп</FormatToolbarGlyph>,
      onClick: insertActHandwrittenCustomerSignatures,
      help: INSERT_BLOCK_TOOLTIP.signaturesActHandwritten,
    },
    {
      id: 'requisites',
      title: 'Реквизиты (готовый блок)',
      icon: <FormatToolbarSvgIcon icon={BuildingOffice2Icon} />,
      onClick: insertRequisitesTemplate,
    },
    {
      id: 'quote',
      title: INSERT_BLOCK_TOOLTIP.noteBlock.title,
      icon: <FormatToolbarSvgIcon icon={ChatBubbleBottomCenterTextIcon} />,
      onClick: insertQuoteBlock,
      help: INSERT_BLOCK_TOOLTIP.noteBlock,
    },
    {
      id: 'table-2x2',
      title: INSERT_BLOCK_TOOLTIP.tableSimple.title,
      icon: <FormatToolbarSvgIcon icon={TableCellsIcon} />,
      onClick: insertSimpleTable,
      help: INSERT_BLOCK_TOOLTIP.tableSimple,
    },
    {
      id: 'hr',
      title: 'Горизонтальный разделитель',
      icon: <FormatToolbarSvgIcon icon={MinusIcon} />,
      onClick: insertHorizontalRule,
    },
    {
      id: 'page-break',
      title: INSERT_BLOCK_TOOLTIP.pageBreak.title,
      icon: <FormatToolbarSvgIcon icon={ArrowsPointingOutIcon} />,
      onClick: insertPageBreak,
      help: INSERT_BLOCK_TOOLTIP.pageBreak,
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
                ref={createTemplateHelpWrapRef}
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
                {createTemplateHelpOpen &&
                !showArchivedTemplates &&
                createTemplateTooltipPos &&
                createTemplateHelpPortalReady &&
                typeof document !== 'undefined'
                  ? createPortal(
                      <div
                        id="templates-library-create-help"
                        role="tooltip"
                        className={`${styles.formatToolbarHelpTooltip} ${styles.formatToolbarHelpTooltipAlignEnd}`}
                        style={{
                          top: createTemplateTooltipPos.top,
                          left: createTemplateTooltipPos.left,
                        }}
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
                      </div>,
                      document.body
                    )
                  : null}
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
              onClick={toggleArchiveMode}
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
                  handleActiveLibraryKindChange(
                    e.currentTarget.value as ContractDocumentPackageKind
                  )
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
                    normalizeLibraryTemplateTabForPackageKind(
                      e.currentTarget.value,
                      activeLibraryKind
                    )
                  )
                }
              >
                {libraryTemplateTabIds.map((tab) => (
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
                  handlePreviewCustomerKindChange(
                    e.target.value as RepairTemplatePreviewCustomerKind
                  )
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
          {formatTools.map((tool) => {
            if (tool.id === 'spacing-contract-dense' && activeTemplateTab !== 'contract') {
              return null;
            }
            if (tool.id === 'spacing-contract-dense' && tool.help) {
              return (
                <FormatToolbarHelpTooltip
                  key={tool.id}
                  title={tool.help.title}
                  steps={tool.help.steps}
                  note={tool.help.note}
                  disabled={!isSuperAdmin}
                  onClick={tool.onClick}
                >
                  {tool.icon}
                </FormatToolbarHelpTooltip>
              );
            }
            if (tool.id === 'signatures') {
              const actSignaturesTool = formatTools.find(
                (t) => t.id === 'signatures-act-handwritten'
              );
              return (
                <Fragment key="cleanup-and-insert-toolbar">
                  {renderCleanupToolbar()}
                  <button
                    key="signatures"
                    type="button"
                    className={`${styles.formatBtn} ${tool.isActive ? styles.formatBtnActive : ''}`}
                    title={tool.title}
                    aria-label={tool.title}
                    aria-pressed={tool.ariaPressed}
                    onClick={tool.onClick}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isSuperAdmin}
                  >
                    {tool.icon}
                  </button>
                  {actSignaturesTool?.help ? (
                    <FormatToolbarHelpTooltip
                      key={actSignaturesTool.id}
                      title={actSignaturesTool.help.title}
                      steps={actSignaturesTool.help.steps}
                      note={actSignaturesTool.help.note}
                      disabled={!isSuperAdmin}
                      onClick={actSignaturesTool.onClick}
                    >
                      {actSignaturesTool.icon}
                    </FormatToolbarHelpTooltip>
                  ) : null}
                </Fragment>
              );
            }
            if (tool.id === 'signatures-act-handwritten') {
              return null;
            }
            if (tool.id === 'spacing-tight') {
              return (
                <Fragment key="list-toolbar">
                  {renderListToolbar()}
                  <button
                    key={tool.id}
                    type="button"
                    className={`${styles.formatBtn} ${tool.isActive ? styles.formatBtnActive : ''}`}
                    title={tool.title}
                    aria-label={tool.title}
                    aria-pressed={tool.ariaPressed}
                    onClick={tool.onClick}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isSuperAdmin}
                  >
                    {tool.icon}
                  </button>
                </Fragment>
              );
            }
            if (tool.id === 'table-2x2' && tool.help) {
              return (
                <Fragment key="table-toolbar">
                  <FormatToolbarHelpTooltip
                    title={tool.help.title}
                    steps={tool.help.steps}
                    note={tool.help.note}
                    disabled={!isSuperAdmin}
                    onClick={tool.onClick}
                  >
                    {tool.icon}
                  </FormatToolbarHelpTooltip>
                  {renderTableStructureToolbar()}
                </Fragment>
              );
            }
            if (tool.help) {
              return (
                <FormatToolbarHelpTooltip
                  key={tool.id}
                  title={tool.help.title}
                  steps={tool.help.steps}
                  note={tool.help.note}
                  disabled={!isSuperAdmin}
                  isActive={tool.isActive}
                  ariaPressed={tool.ariaPressed}
                  wideGlyph={tool.wideGlyph}
                  onClick={tool.onClick}
                >
                  {tool.icon}
                </FormatToolbarHelpTooltip>
              );
            }
            const formatButton = (
              <button
                key={tool.id}
                type="button"
                className={`${styles.formatBtn} ${tool.wideGlyph ? styles.formatBtnWideGlyph : ''} ${tool.isActive ? styles.formatBtnActive : ''}`}
                title={tool.title}
                aria-label={tool.title}
                aria-pressed={tool.ariaPressed}
                onClick={tool.onClick}
                onMouseDown={(e) => e.preventDefault()}
                disabled={!isSuperAdmin}
              >
                {tool.icon}
              </button>
            );
            if (tool.id !== 'bold') return formatButton;
            return (
              <span key={`${tool.id}-with-font-size`} className={styles.formatToolbarInlineGroup}>
                <div className={styles.formatFontSizeWrap} title={FONT_SIZE_TOOLTIP.note}>
                  <label
                    className={styles.formatFontSizeLabel}
                    htmlFor="templates-library-visual-font-size"
                  >
                    <span
                      className={styles.formatFontSizeLabelText}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      пт
                    </span>
                    <select
                      id="templates-library-visual-font-size"
                      className={styles.formatFontSizeSelect}
                      value={visualFontSizeControl.mixed ? '' : String(visualFontSizeControl.pt)}
                      disabled={!isSuperAdmin || editorMode !== 'visual'}
                      aria-label="Размер шрифта"
                      onMouseDown={() => {
                        captureVisualSelection();
                      }}
                      onChange={(e) => {
                        const next = Number.parseFloat(e.target.value);
                        if (!Number.isFinite(next)) return;
                        applyVisualFontSizeFromToolbar(next);
                      }}
                    >
                      {visualFontSizeControl.mixed ? (
                        <option value="" disabled>
                          —
                        </option>
                      ) : null}
                      {VISUAL_FONT_SIZE_PT_OPTIONS.map((pt) => (
                        <option key={pt} value={String(pt)}>
                          {Number.isInteger(pt) ? pt : pt.toString().replace('.', ',')}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {formatButton}
              </span>
            );
          })}
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
              onClick={togglePlaceholdersCollapsed}
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
              <div className={styles.templatesLibraryEditorHeadLeading}>
                {editorModeToggle}
                <div className={styles.templatesLibraryEditorHeadTools}>
                  <div
                    className={styles.templatesLibraryHistoryButtons}
                    role="group"
                    aria-label="История изменений шаблона"
                  >
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={!isSuperAdmin || !templateHistoryCanUndo}
                      onClick={handleTemplateUndo}
                      title="Отменить последнее изменение (Ctrl+Z). До 100 шагов в HTML и конструкторе."
                      style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                      aria-label="Отменить"
                    >
                      ↶
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      disabled={!isSuperAdmin || !templateHistoryCanRedo}
                      onClick={handleTemplateRedo}
                      title="Вернуть отменённое (Ctrl+Y). Работает в HTML и визуальном конструкторе."
                      style={{ padding: '2px 8px', minWidth: 32, lineHeight: 1 }}
                      aria-label="Вернуть"
                    >
                      ↷
                    </button>
                  </div>
                  {editorMode === 'visual' ? (
                    <TemplateEditorZoomControl
                      id="templates-library-visual-zoom"
                      value={visualZoomPct}
                      draft={visualZoomDraft}
                      disabled={!isSuperAdmin}
                      ariaLabel="Масштаб конструктора"
                      title="Масштаб конструктора на экране (не влияет на печать)"
                      onDraftChange={setVisualZoomDraft}
                      onCommit={commitVisualZoomDraft}
                      onStep={stepVisualZoom}
                    />
                  ) : null}
                </div>
              </div>
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
                  const next = e.target.value;
                  setHtml(next);
                  setVisualDraftHtml(next);
                  schedulePushTemplateHistoryFromHtml(next);
                }}
                disabled={!isSuperAdmin}
                tabIndex={editorMode === 'html' ? 0 : -1}
                onSelect={refreshInlineFormatActiveState}
                onKeyUp={refreshInlineFormatActiveState}
                onClick={refreshInlineFormatActiveState}
                onMouseUp={(e) => {
                  captureHtmlEditorHeight();
                  refreshInlineFormatActiveState();
                }}
                onTouchEnd={captureHtmlEditorHeight}
                onBlur={captureHtmlEditorHeight}
                style={{ height: htmlEditorHeightPx ? `${htmlEditorHeightPx}px` : undefined }}
              />
            </div>
            <div
              className={editorMode === 'visual' ? undefined : styles.editorPaneHidden}
              aria-hidden={editorMode !== 'visual'}
            >
              <div
                className={styles.templatesLibraryVisualEditorZoomHost}
                style={{
                  height: visualEditorHeightPx ? `${visualEditorHeightPx}px` : undefined,
                }}
              >
                <div
                  className={styles.templatesLibraryVisualEditorZoomInner}
                  style={{ zoom: `${visualZoomPct}%` }}
                >
                  <div
                    ref={visualEditorRef}
                    className={`${measurementFormStyles.textarea} ${styles.contractHtmlTextarea} ${styles.visualEditor} ${styles.visualEditorScrollable} ${styles.templatesLibraryVisualEditor}`}
                    contentEditable={isSuperAdmin && editorMode === 'visual'}
                    suppressContentEditableWarning
                    onPaste={handleVisualEditorPaste}
                    onKeyDown={handleVisualEditorKeyDown}
                    onInput={(e) => {
                      ensureTemplateDraftForEditing();
                      const next = (e.currentTarget as HTMLDivElement).innerHTML;
                      setVisualDraftHtml(next);
                      setHtml(next);
                      pushTemplateHistory(next);
                      captureVisualSelection();
                    }}
                    onKeyUp={captureVisualSelection}
                    onMouseUp={() => {
                      captureVisualSelection();
                      captureVisualEditorHeight();
                    }}
                    onFocus={captureVisualSelection}
                    onBlur={() => {
                      if (editorMode !== 'visual') return;
                      syncVisualEditorToHtmlState();
                      captureVisualEditorHeight();
                    }}
                    onTouchEnd={captureVisualEditorHeight}
                    style={{ whiteSpace: 'normal' }}
                  />
                </div>
              </div>
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
                <TemplateEditorZoomControl
                  id="templates-library-preview-zoom"
                  value={previewZoomPct}
                  draft={previewZoomDraft}
                  ariaLabel="Масштаб предпросмотра"
                  title="Масштаб предпросмотра на экране (не влияет на печать)"
                  onDraftChange={setPreviewZoomDraft}
                  onCommit={commitPreviewZoomDraft}
                  onStep={stepPreviewZoom}
                />
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
              const nextRaw = (templatesRes.items ?? []).map((it) =>
                normalizeContractTemplatePreset(it)
              );
              const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
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
