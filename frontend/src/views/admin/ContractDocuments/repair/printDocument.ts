import { CONTRACT_DENSE_SPACING_CSS } from './contractTemplateCompactSpacing';
import { normalizeContractHeaderCustomerTypography } from './contractTemplateHeader';
import { repairContractTemplateStructureInDom } from './contractTemplateStructure';
import {
  clearNestedFontSizeInsideHeading,
  normalizeContractTitleInDom,
} from './contractTemplateTitle';
import { alignContractRequisitesBlockSignatures } from './repairContractRequisitesLayout';
import { CONTRACT_REQUISITES_LAYOUT_CSS } from './repairContractRequisitesLayout';

/** Имена для нижнего колонтитула каждой страницы при печати (CSS @page margin box, Chrome 131+). */
export type PrintMarginFooterNames = {
  contractorSignatory: string;
  customerName: string;
};

export type PrintDocumentOptions = {
  /**
   * Нижнее поле страницы (не тело документа): подписи по центру, «N / M» справа (Chrome ≥ 131).
   * В диалоге печати отключите «Колонтитулы», чтобы не дублировать URL/дату.
   */
  marginFooter?: PrintMarginFooterNames;
  /** ПКО: уменьшенные межстрочные интервалы и отступы (~−20% по высоте). */
  cashOrderCompact?: boolean;
  /** Договор: уменьшенный кегль основного текста при печати (10pt вместо 12pt). */
  contractCompact?: boolean;
};

const MARGIN_FOOTER_MAX_EACH = 44;

function truncateOneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/** Экранирование для фрагмента внутри CSS `content: "…"`. */
function cssDoubleQuotedStringFragment(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r\n|\n|\r/g, ' ')
    .replace(/[;{}]/g, ' ');
}

/**
 * Подписи — в `@bottom-center`, номера — в `@bottom-right`: в одном длинном `content`
 * счётчики иногда не отображаются в Chromium (см. примеры с отдельными margin boxes).
 */
function buildMarginFooterPageRule(names: PrintMarginFooterNames): string {
  const c = cssDoubleQuotedStringFragment(
    truncateOneLine(names.contractorSignatory, MARGIN_FOOTER_MAX_EACH)
  );
  const u = cssDoubleQuotedStringFragment(
    truncateOneLine(names.customerName, MARGIN_FOOTER_MAX_EACH)
  );
  return `
  @page {
    margin: 16mm 16mm 28mm 16mm;
    size: A4;
    @bottom-center {
      content: "Подрядчик ______________ / ${c}     Заказчик ______________ / ${u}";
      font-size: 7pt;
      font-family: "Times New Roman", Times, serif;
      color: #111;
      text-align: center;
      vertical-align: top;
      line-height: 1.25;
    }
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-size: 7pt;
      font-family: "Times New Roman", Times, serif;
      color: #111;
      text-align: right;
      vertical-align: top;
      line-height: 1.25;
    }
  }
`;
}

/** Из данных пакета ремонта (после merge с fallback для превью). */
export function pickPrintMarginFooterNames(data: unknown): PrintMarginFooterNames {
  const empty = { contractorSignatory: '____________', customerName: '____________' };
  if (!data || typeof data !== 'object') return empty;
  const root = data as Record<string, unknown>;
  const execObj = root.executor;
  const custObj = root.customer;
  const exec =
    execObj && typeof execObj === 'object'
      ? String((execObj as Record<string, unknown>).directorName ?? '').trim()
      : '';
  const cust =
    custObj && typeof custObj === 'object'
      ? String((custObj as Record<string, unknown>).fullName ?? '').trim()
      : '';
  return {
    contractorSignatory: exec || empty.contractorSignatory,
    customerName: cust || empty.customerName,
  };
}

const CASH_ORDER_COMPACT_PRINT_CSS = `
  .docPrintCashOrderCompact .docPrint {
    font-size: 9.5pt;
    line-height: 1.12;
  }
  .docPrintCashOrderCompact .docPrint h1 {
    font-size: 11pt;
    margin: 0 0 8pt;
  }
  .docPrintCashOrderCompact .docPrint h2 {
    font-size: 9.5pt;
    margin: 8pt 0 4pt;
  }
  .docPrintCashOrderCompact .docPrint p {
    margin: 0 0 5pt;
  }
  .docPrintCashOrderCompact .docPrint table {
    font-size: 9pt;
    line-height: 1.1;
  }
  .docPrintCashOrderCompact .docPrint td,
  .docPrintCashOrderCompact .docPrint th {
    padding-top: 1pt;
    padding-bottom: 1pt;
    line-height: 1.1;
  }
  .docPrintCashOrderCompact .WordSection1 table.MsoNormalTable {
    border-collapse: collapse !important;
  }
  .docPrintCashOrderCompact .WordSection1 table.MsoNormalTable td,
  .docPrintCashOrderCompact .WordSection1 table.MsoNormalTable th {
    padding: 0 0.5pt !important;
    font-size: 9pt !important;
    line-height: 1.08 !important;
    vertical-align: top !important;
  }
  .docPrintCashOrderCompact .WordSection1 p.MsoNormal,
  .docPrintCashOrderCompact .WordSection1 p {
    margin: 0 !important;
    font-size: 9pt !important;
    line-height: 1.1 !important;
  }
  .docPrintCashOrderCompact .WordSection1 tr[style*="height"] {
    height: auto !important;
  }
  @media print {
    .docPrintCashOrderCompact .docPrint p {
      margin: 0 0 4pt !important;
    }
    .docPrintCashOrderCompact .docPrint h1 {
      margin: 0 0 7pt !important;
    }
    .docPrintCashOrderCompact .docPrint h2 {
      margin: 6pt 0 3pt !important;
    }
  }
`;

const CONTRACT_COMPACT_BODY_PT = '10pt';
/** Как в конструкторе шаблонов (H1 / H2 / H3). */
const CONTRACT_COMPACT_H1_PT = '14pt';
const CONTRACT_COMPACT_H2_PT = '12pt';
const CONTRACT_COMPACT_H3_PT = '11pt';

/** Договор: плотнее по кеглю (≈10pt). Селекторы покрывают Word (.WordSection1) без .docPrint. */
const CONTRACT_COMPACT_PRINT_CSS = `
  body.contractPrintCompact,
  .docPrintContractCompact,
  .docPrint.docPrintContractCompact {
    font-size: ${CONTRACT_COMPACT_BODY_PT} !important;
    line-height: 1.32 !important;
  }
  body.contractPrintCompact .docPrintContractCompact p:not([style*='font-size']),
  body.contractPrintCompact .docPrintContractCompact div:not([style*='font-size']),
  body.contractPrintCompact .docPrintContractCompact td:not([style*='font-size']),
  body.contractPrintCompact .docPrintContractCompact th:not([style*='font-size']),
  body.contractPrintCompact .docPrintContractCompact li:not([style*='font-size']),
  body.contractPrintCompact .docPrintContractCompact font,
  .docPrint.docPrintContractCompact p:not([style*='font-size']),
  .docPrint.docPrintContractCompact div:not([style*='font-size']),
  .docPrint.docPrintContractCompact td:not([style*='font-size']),
  .docPrint.docPrintContractCompact th:not([style*='font-size']),
  .docPrint.docPrintContractCompact li:not([style*='font-size']),
  .docPrint.docPrintContractCompact font {
    font-size: ${CONTRACT_COMPACT_BODY_PT} !important;
    line-height: 1.32 !important;
  }
  body.contractPrintCompact .docPrintContractCompact h1,
  .docPrint.docPrintContractCompact h1 {
    font-size: ${CONTRACT_COMPACT_H1_PT} !important;
    line-height: 1.28 !important;
    margin: 0 0 10pt !important;
  }
  body.contractPrintCompact .docPrintContractCompact h2,
  .docPrint.docPrintContractCompact h2 {
    font-size: ${CONTRACT_COMPACT_H2_PT} !important;
    line-height: 1.28 !important;
    margin: 11pt 0 5pt !important;
  }
  body.contractPrintCompact .docPrintContractCompact h3,
  .docPrint.docPrintContractCompact h3 {
    font-size: ${CONTRACT_COMPACT_H3_PT} !important;
    line-height: 1.28 !important;
    margin: 11pt 0 5pt !important;
    text-align: center !important;
    font-weight: bold !important;
  }
  body.contractPrintCompact .docPrintContractCompact h1 *,
  body.contractPrintCompact .docPrintContractCompact h2 *,
  body.contractPrintCompact .docPrintContractCompact h3 *,
  .docPrint.docPrintContractCompact h1 *,
  .docPrint.docPrintContractCompact h2 *,
  .docPrint.docPrintContractCompact h3 * {
    font-size: inherit !important;
  }
  body.contractPrintCompact .docPrintContractCompact p,
  .docPrint.docPrintContractCompact p {
    margin: 0 0 6pt !important;
  }
  body.contractPrintCompact .docPrintContractCompact ol.contractLegalList[data-section],
  .docPrint.docPrintContractCompact ol.contractLegalList[data-section] {
    list-style: none !important;
    margin: 0 0 6pt !important;
    padding: 0 !important;
    counter-reset: contract-clause !important;
  }
  body.contractPrintCompact .docPrintContractCompact ol.contractLegalList[data-section] > li,
  .docPrint.docPrintContractCompact ol.contractLegalList[data-section] > li {
    position: relative !important;
    margin: 0 0 5pt !important;
    padding: 0 0 0 1.45cm !important;
    text-align: justify !important;
    counter-increment: contract-clause !important;
  }
  body.contractPrintCompact .docPrintContractCompact ol.contractLegalList > li[data-section]::before,
  .docPrint.docPrintContractCompact ol.contractLegalList > li[data-section]::before {
    content: attr(data-section) '.' counter(contract-clause) '.' !important;
    position: absolute !important;
    left: 0 !important;
    width: 1.35cm !important;
    text-align: right !important;
  }
  body.contractPrintCompact
    .docPrintContractCompact
    ol.contractLegalList[data-section]
    > li
    > ol.contractLegalList[data-section],
  .docPrint.docPrintContractCompact
    ol.contractLegalList[data-section]
    > li
    > ol.contractLegalList[data-section] {
    counter-reset: contract-subclause !important;
    margin: 3pt 0 0 !important;
    padding: 0 !important;
  }
  body.contractPrintCompact
    .docPrintContractCompact
    ol.contractLegalList[data-section]
    > li
    > ol.contractLegalList[data-section]
    > li,
  .docPrint.docPrintContractCompact
    ol.contractLegalList[data-section]
    > li
    > ol.contractLegalList[data-section]
    > li {
    counter-increment: contract-subclause !important;
    padding-left: 1.85cm !important;
  }
  body.contractPrintCompact
    .docPrintContractCompact
    ol.contractLegalList
    > li
    > ol.contractLegalList
    > li[data-section]::before,
  .docPrint.docPrintContractCompact
    ol.contractLegalList
    > li
    > ol.contractLegalList
    > li[data-section]::before {
    content: attr(data-section) '.' counter(contract-clause) '.' counter(contract-subclause) '.'
      !important;
    position: absolute !important;
    left: 0 !important;
    width: 1.85cm !important;
    text-align: right !important;
  }
`;

function stripTypographyFromInlineStyle(style: string, keepFontSize = false): string {
  let next = style
    .replace(/\b(?:font-family|mso-(?:ascii|hansi|cs|fareast)-font-family)\s*:\s*[^;]+;?/gi, '')
    .replace(/\bmso-(?:bidi-)?font-size\s*:\s*[^;]+;?/gi, '');
  if (!keepFontSize) {
    next = next.replace(/\bfont-size\s*:\s*[^;]+;?/gi, '');
  }
  return next
    .replace(/;\s*;/g, ';')
    .replace(/^[\s;]+|[\s;]+$/g, '')
    .trim();
}

export type ContractCompactTypographyOptions = {
  /** Сохранять font-size на H1–H6 (кнопки заголовков в конструкторе). */
  preserveHeadingFontSizes?: boolean;
  /** Сохранять font-size на абзацах, span и т.д. (кегль «пт» в конструкторе). */
  preserveInlineFontSizes?: boolean;
};

function shouldKeepElementFontSize(
  el: HTMLElement,
  options?: ContractCompactTypographyOptions
): boolean {
  if (options?.preserveInlineFontSizes) return true;
  if (!options?.preserveHeadingFontSizes) return false;
  return /^H[1-6]$/i.test(el.tagName);
}

function cleanElementInlineTypography(
  el: HTMLElement,
  options?: ContractCompactTypographyOptions
): void {
  const styleAttr = el.getAttribute('style');
  if (!styleAttr) return;
  const cleaned = stripTypographyFromInlineStyle(styleAttr, shouldKeepElementFontSize(el, options));
  if (cleaned) el.setAttribute('style', cleaned);
  else el.removeAttribute('style');
}

/** Убирает кегль Word внутри H1–H3 (вложенные span/font), чтобы не перебивали 14/12/11 pt. */
function clearNestedFontSizeInsideHeadings(root: ParentNode): void {
  root.querySelectorAll('h1, h2, h3').forEach((heading) => {
    clearNestedFontSizeInsideHeading(heading);
  });
}

/** Убирает inline font-family (Word); font-size — по опциям (Tt сбрасывает, превью/печать — сохраняют кегль конструктора). */
export function prepareContractHtmlForCompactPrint(
  html: string,
  options?: ContractCompactTypographyOptions
): string {
  const preserveInlineFontSizes = Boolean(options?.preserveInlineFontSizes);
  const preserveHeadingFontSizes = Boolean(
    options?.preserveHeadingFontSizes ?? options?.preserveInlineFontSizes
  );
  const compactOptions: ContractCompactTypographyOptions = {
    preserveHeadingFontSizes,
    preserveInlineFontSizes,
  };

  if (typeof window !== 'undefined') {
    const container = window.document.createElement('div');
    container.innerHTML = html || '';
    for (const el of container.querySelectorAll<HTMLElement>('[style]')) {
      cleanElementInlineTypography(el, compactOptions);
    }
    clearNestedFontSizeInsideHeadings(container);
    return container.innerHTML
      .replace(/\s*style\s*=\s*(["'])\s*\1/gi, '')
      .replace(/\sface\s*=\s*(["'])[^"']*\1/gi, '')
      .replace(/\sface\s*=\s*[^\s>]+/gi, '');
  }

  const withoutTypography = html.replace(
    /\bstyle\s*=\s*(["'])([\s\S]*?)\1/gi,
    (_match, quote: string, style: string) => {
      const cleaned = stripTypographyFromInlineStyle(style, preserveInlineFontSizes);
      if (!cleaned) return '';
      return `style=${quote}${cleaned}${quote}`;
    }
  );
  return withoutTypography
    .replace(/\s*style\s*=\s*(["'])\s*\1/gi, '')
    .replace(/\sface\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\sface\s*=\s*[^\s>]+/gi, '');
}

/** Предпросмотр в админке: сброс Word-стилей, кегли из конструктора (пт, H1–H3) сохраняются. */
export function prepareContractHtmlForScreenPreview(html: string): string {
  return markDocPrintContractCompact(html, {
    preserveHeadingFontSizes: true,
    preserveInlineFontSizes: true,
  });
}

function addDocPrintContractCompactClassToHtml(html: string): string {
  if (!/\bdocPrint\b/i.test(html)) {
    return `<div class="docPrint docPrintContractCompact">${html}</div>`;
  }
  let marked = html.replace(
    /\bclass\s*=\s*(["'])([\s\S]*?\bdocPrint\b[\s\S]*?)\1/gi,
    (_match, quote: string, classes: string) => {
      if (/\bdocPrintContractCompact\b/i.test(classes)) return _match;
      return `class=${quote}${classes.trim()} docPrintContractCompact${quote}`;
    }
  );
  if (!/\bdocPrintContractCompact\b/i.test(marked)) {
    marked = `<div class="docPrint docPrintContractCompact">${marked}</div>`;
  }
  return marked;
}

function markDocPrintContractCompact(
  html: string,
  options?: ContractCompactTypographyOptions
): string {
  const prepared = prepareContractHtmlForCompactPrint(html, options);
  const marked = addDocPrintContractCompactClassToHtml(prepared);

  if (typeof window !== 'undefined') {
    const container = window.document.createElement('div');
    container.innerHTML = marked;
    repairContractTemplateStructureInDom(container);
    normalizeContractTitleInDom(container);
    return normalizeContractHeaderCustomerTypography(
      alignContractRequisitesBlockSignatures(container.innerHTML)
    );
  }
  return marked;
}

function getContractPrintRoot(doc: Document): HTMLElement {
  return (
    doc.querySelector<HTMLElement>('.docPrint.docPrintContractCompact') ??
    doc.querySelector<HTMLElement>('.docPrintContractCompact') ??
    doc.querySelector<HTMLElement>('.docPrint') ??
    doc.body
  );
}

/** Принудительный кегль в окне печати (перебивает mso-* и inline font-size из Word). */
function applyContractCompactFontSizesInPrintDocument(doc: Document): void {
  doc.body.classList.add('contractPrintCompact');
  const root = getContractPrintRoot(doc);
  root.classList.add('docPrintContractCompact');
  if (!/\bdocPrint\b/.test(root.className)) {
    root.classList.add('docPrint');
  }

  const setSize = (el: HTMLElement, size: string) => {
    el.style.setProperty('font-size', size, 'important');
  };

  root.querySelectorAll<HTMLElement>('h1').forEach((el) => setSize(el, CONTRACT_COMPACT_H1_PT));
  root.querySelectorAll<HTMLElement>('h2').forEach((el) => setSize(el, CONTRACT_COMPACT_H2_PT));
  root.querySelectorAll<HTMLElement>('h3').forEach((el) => setSize(el, CONTRACT_COMPACT_H3_PT));
  clearNestedFontSizeInsideHeadings(root);
  normalizeContractTitleInDom(root);

  const all = root.querySelectorAll<HTMLElement>('*');
  all.forEach((el) => {
    if (/^H[1-3]$/i.test(el.tagName)) return;
    if (el.style.fontSize) return;
    setSize(el, CONTRACT_COMPACT_BODY_PT);
  });
  setSize(root, CONTRACT_COMPACT_BODY_PT);
}

function buildPrintStylesheet(
  marginFooter?: PrintMarginFooterNames,
  cashOrderCompact?: boolean,
  contractCompact?: boolean
): string {
  const pageBlock = marginFooter
    ? buildMarginFooterPageRule(marginFooter)
    : `@page { margin: 16mm; size: A4; }`;

  const cashOrderBlock = cashOrderCompact ? CASH_ORDER_COMPACT_PRINT_CSS : '';
  const contractBlock = contractCompact
    ? `${CONTRACT_COMPACT_PRINT_CSS}\n${CONTRACT_DENSE_SPACING_CSS}`
    : '';

  return `${pageBlock}
  html, body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; color: #111; }
  .docPrint { font-size: 12pt; line-height: 1.42; }
  .docPrint a { color: #111 !important; text-decoration: none; }
  .docPrint h1 { font-size: 14pt; text-align: center; margin: 0 0 12pt; font-weight: bold; }
  .docPrint h2 { font-size: 12pt; margin: 14pt 0 6pt; text-align: center; font-weight: bold; }
  .docPrint h3 { font-size: 11pt; margin: 14pt 0 6pt; text-align: center; font-weight: bold; }
  .docPrint.repairQuestionnairePrint h1,
  .docPrint.repairQuestionnairePrint h2,
  .docPrint.repairQuestionnairePrint strong,
  .docPrint.repairQuestionnairePrint th {
    font-weight: normal;
  }
  .docPrint p { margin: 0 0 8pt; }
  .docPrint .repairAddendumHeaderBlock { margin: 0 0 10pt; }
  .docPrint h1.repairAddendumHeaderTitle { margin: 0 0 4pt; }
  .docPrint .repairAddendumHeaderSub {
    margin: 0 0 12pt;
    text-align: center;
    font-size: 12pt;
    line-height: 1.35;
    font-weight: normal;
  }
  .docPrint .repairAddendumMetaRow {
    display: grid;
    grid-template-columns: 1fr auto;
    width: 100%;
    align-items: baseline;
    margin: 0 0 14pt;
    font-size: 12pt;
  }
  .docPrint .repairAddendumMetaDate { text-align: left; }
  .docPrint .repairAddendumMetaCity { text-align: right; }
  .docPrint h2.repairAddendumEstimateHeading { text-align: center; }
  .docPrint .estimateA4DocPrintEmbed { line-height: 1.32; color: #111; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4CategorySection { margin-bottom: 6pt; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Meta { margin: 0 0 6pt; color: #333; line-height: 1.35; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Room { margin-bottom: 10pt; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4RoomHeader {
    display: flex; justify-content: space-between; align-items: baseline; gap: 10pt;
    margin-bottom: 3pt; font-weight: 700; line-height: 1.25;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table {
    width: 100%; border-collapse: collapse; table-layout: fixed;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th,
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td {
    border: 1px solid #9ca3af; padding: 2pt 5pt; text-align: left; vertical-align: top;
    line-height: 1.28; overflow-wrap: break-word; word-break: break-word;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(1),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(1) { width: 3%; text-align: center; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(2),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(2) { width: 52%; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(3),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(3) { width: 6%; text-align: right; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(4),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(4) { width: 9%; text-align: right; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(5),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(5) { width: 12%; text-align: right; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th:nth-child(6),
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table td:nth-child(6) { width: 18%; text-align: right; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Table th {
    background: #f9fafb; font-weight: 700; padding-top: 3pt; padding-bottom: 3pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder th:nth-child(1),
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder td:nth-child(1) {
    width: 5%; text-align: center;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder th:nth-child(2),
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder td:nth-child(2) {
    width: 48%;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder th:nth-child(3),
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder td:nth-child(3) {
    width: 18%; text-align: right;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder th:nth-child(4),
  .docPrint .estimateA4DocPrintEmbed .estimateA4TableWorkOrder td:nth-child(4) {
    width: 29%; text-align: right;
  }
  /* Итоговый заказ-наряд: плотность как на вкладке (≈11px), не общий docPrint 12pt */
  .docPrint .repairFinalWorkOrderPrint {
    font-size: 8.25pt;
    line-height: 1.2;
  }
  .docPrint .repairFinalWorkOrderPrint p {
    margin: 0 0 2pt;
    line-height: 1.2;
  }
  .docPrint .repairFinalWorkOrderPrint .repairFinalWorkOrderPrintMeta {
    margin: 0 0 7pt;
  }
  .docPrint .repairFinalWorkOrderPrint h4,
  .docPrint .repairFinalWorkOrderPrint .estimateA4Title {
    margin: 0 0 3pt;
    font-size: 9pt;
    line-height: 1.2;
    font-weight: 700;
    text-align: center;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4CategorySection {
    margin-bottom: 4pt;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4Meta {
    margin: 0 0 3pt;
    font-size: 8pt;
    line-height: 1.2;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4Room {
    margin-bottom: 7pt;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4RoomHeader {
    margin-bottom: 2pt;
    font-size: 8.25pt;
    line-height: 1.15;
    gap: 6pt;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4TableWorkOrder th,
  .docPrint .repairFinalWorkOrderPrint .estimateA4TableWorkOrder td {
    padding: 1pt 4pt;
    font-size: 8.25pt;
    line-height: 1.15;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4TableWorkOrder th {
    padding-top: 1pt;
    padding-bottom: 1pt;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4Total {
    margin: 4pt 0 0;
    font-size: 8.5pt;
    line-height: 1.2;
  }
  .docPrint .repairFinalWorkOrderPrint .estimateA4Empty {
    margin: 0;
    font-size: 8.25pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Summary {
    margin-top: 5pt; border-top: 1px solid #d1d5db; padding-top: 6pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SummaryTitle { margin: 0 0 3pt; font-size: 11pt; line-height: 1.25; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SummaryList {
    list-style: none; margin: 0; padding: 0; display: grid; gap: 2pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SummaryList li {
    display: flex; justify-content: space-between; gap: 10pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Total {
    margin: 10pt 0 0; font-size: 12pt; line-height: 1.3; text-align: right;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4DiscountMeta {
    margin: 6pt 0 0; font-size: 10.5pt; line-height: 1.3; text-align: right; color: #444;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4Signatures {
    margin-top: 12pt; page-break-inside: avoid; break-inside: avoid;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturesTable { width: 100%; border-collapse: collapse; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturesCellLeft,
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturesCellRight {
    width: 50%; vertical-align: bottom;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturesCellLeft { padding-right: 10pt; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturesCellRight { padding-left: 10pt; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignaturePartyLine { margin: 0 0 4pt; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4SignNote { margin: 0; font-size: 9pt; color: #333; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4HandwritingNote {
    margin-top: 14pt; page-break-inside: avoid; break-inside: avoid;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4HandwritingNoteLabel { margin: 0 0 5pt; font-weight: 600; line-height: 1.25; }
  .docPrint .estimateA4DocPrintEmbed .estimateA4HandwritingLines {
    display: flex; flex-direction: column; gap: 5pt;
  }
  .docPrint .estimateA4DocPrintEmbed .estimateA4HandwritingLine {
    min-height: 1.1em; border-bottom: 1px solid #111;
  }
  .signTable { width: 100%; border-collapse: collapse; margin-top: 18pt; }
  .signTable td { width: 50%; vertical-align: bottom; padding: 6pt; }
  .estimatePre {
    white-space: pre-wrap;
    font-family: inherit;
    background: #f9fafb;
    padding: 10pt;
    border: 1px solid #e5e7eb;
    margin: 0;
  }
  .contractRequisitesBlock strong,
  .contractRequisitesBlock b,
  .contractRequisitesBlock em,
  .contractRequisitesBlock i,
  .contractRequisitesBlock .contractRequisitesColBody,
  .contractRequisitesBlock .contractRequisitesColBody p,
  .contractRequisitesBlock .contractRequisitesColBody div {
    font-weight: normal !important;
    font-style: normal !important;
  }
  ${CONTRACT_REQUISITES_LAYOUT_CSS}
  .contractPageSignatures {
    width: 100%;
    color: #111 !important;
    visibility: visible !important;
  }
  .contractPageSignatures td {
    vertical-align: bottom !important;
    color: #111 !important;
  }
  .estimateRoomsEmbed {
    page-break-inside: auto;
    break-inside: auto;
  }
  @media print {
    .docPrint p {
      margin: 0 0 6pt !important;
    }
    .docPrint h2 {
      margin: 10pt 0 5pt !important;
    }
    .estimateRoomsEmbed {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .estimateRoomsEmbed table,
    .estimateRoomsEmbed tbody {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .estimateRoomsEmbed tbody tr {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .docPrint table {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .docPrint tr {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .contractRequisitesBlock {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .contractPageSignatures {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .docPrint .estimateA4DocPrintEmbed .estimateA4Table th,
    .docPrint .estimateA4DocPrintEmbed .estimateA4Table td {
      border: 1px solid #111 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .docPrint .estimateA4DocPrintEmbed .estimateA4Table th {
      background: #f3f4f6 !important;
    }
    .docPrint .repairFinalWorkOrderPrint p {
      margin: 0 0 2pt !important;
    }
    .docPrint .repairFinalWorkOrderPrint .estimateA4TableWorkOrder th,
    .docPrint .repairFinalWorkOrderPrint .estimateA4TableWorkOrder td {
      padding: 1pt 4pt !important;
      line-height: 1.15 !important;
    }
  }
  .docPrint.docPrintWordCompact .WordSection1 table.MsoNormalTable {
    border-collapse: collapse !important;
  }
  .docPrint.docPrintWordCompact .WordSection1 table.MsoNormalTable td,
  .docPrint.docPrintWordCompact .WordSection1 table.MsoNormalTable th {
    padding: 0 0.5pt !important;
    line-height: 1.06 !important;
    vertical-align: top !important;
  }
  .docPrint.docPrintWordCompact .WordSection1 p.MsoNormal,
  .docPrint.docPrintWordCompact .WordSection1 p {
    margin: 0 !important;
    line-height: 1.06 !important;
  }
  .docPrint.docPrintWordCompact .WordSection1 tr[style*="height"] {
    height: auto !important;
  }
  .docPrint .WordSection1 table.MsoNormalTable td.koTearGuideCell {
    width: 11pt !important;
    max-width: 11pt !important;
    min-width: 8pt !important;
    padding-left: 0 !important;
    padding-right: 1pt !important;
    box-sizing: border-box !important;
  }
  .docPrint .WordSection1 table.MsoNormalTable td.koTearGuideCell span {
    letter-spacing: 0.12em !important;
    font-size: 8pt !important;
  }
  .docPrint .WordSection1 table.MsoNormalTable td.koTearGuideCell + td {
    width: 4pt !important;
    max-width: 5pt !important;
    min-width: 3pt !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    box-sizing: border-box !important;
  }
${cashOrderBlock}
${contractBlock}
`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attachPrintWindowCloseHandlers(w: Window): void {
  w.addEventListener(
    'afterprint',
    () => {
      window.setTimeout(() => {
        try {
          if (!w.closed) w.close();
        } catch {
          /* окно уже недоступно */
        }
      }, 150);
    },
    { once: true }
  );

  window.setTimeout(() => {
    try {
      if (!w.closed) w.close();
    } catch {
      /* ignore */
    }
  }, 120_000);
}

/** Полный HTML-документ с теми же стилями, что и окно печати. */
export function buildPrintableHtmlDocument(
  innerHtml: string,
  documentTitle: string,
  options?: PrintDocumentOptions
): string {
  const titleInner = documentTitle.trim() === '' ? '&#8203;' : escapeHtml(documentTitle);
  const styles = buildPrintStylesheet(
    options?.marginFooter,
    options?.cashOrderCompact,
    options?.contractCompact
  );
  const printBody = options?.contractCompact
    ? markDocPrintContractCompact(innerHtml, {
        preserveHeadingFontSizes: true,
        preserveInlineFontSizes: true,
      })
    : innerHtml;
  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>${titleInner}</title>
<style>${styles}</style></head><body>${printBody}</body></html>`;
}

function sanitizeDownloadFileName(fileName: string, extension: 'html' | 'pdf' = 'html'): string {
  const trimmed = fileName.trim().replace(/\.(html?|pdf)$/i, '');
  const withExt = `${trimmed}.${extension}`;
  const safe = withExt.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/\s+/g, '_');
  return safe || `document.${extension}`;
}

async function waitForDocumentImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );
}

/** Скачать HTML на компьютер (открыть в браузере, увеличить масштаб, отсканировать QR). */
export function downloadDocumentHtml(
  innerHtml: string,
  documentTitle: string,
  downloadFileName: string,
  options?: PrintDocumentOptions
): void {
  const fullHtml = buildPrintableHtmlDocument(innerHtml, documentTitle, options);
  const blob = new Blob(['\uFEFF', fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeDownloadFileName(downloadFileName);
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Скачать PDF (рендер того же HTML, что и при печати). Только в браузере. */
export async function downloadDocumentPdf(
  innerHtml: string,
  documentTitle: string,
  downloadFileName: string,
  options?: PrintDocumentOptions
): Promise<void> {
  const fullHtml = buildPrintableHtmlDocument(innerHtml, documentTitle, options);
  const fileName = sanitizeDownloadFileName(downloadFileName, 'pdf');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;visibility:hidden;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error('Не удалось подготовить PDF');
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  await new Promise<void>((resolve) => {
    const finish = () => requestAnimationFrame(() => resolve());
    if (doc.readyState === 'complete') {
      finish();
      return;
    }
    iframe.addEventListener('load', () => finish(), { once: true });
  });

  if (doc.fonts?.ready) {
    try {
      await doc.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  await waitForDocumentImages(doc);

  const html2pdf = (await import('html2pdf.js')).default;

  try {
    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          windowWidth: doc.documentElement.scrollWidth,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(doc.body)
      .save();
  } finally {
    iframe.remove();
  }
}

/**
 * Отдельное окно + синхронный `print()` из клика (сохраняется user activation).
 * При `options.marginFooter` нижний колонтитул с номером страницы задаётся через CSS @page (Chrome 131+);
 * чтобы убрать строку с URL из превью печати, отключите встроенные «Колонтитулы» в настройках печати Chrome.
 */
export function printDocumentHtml(
  innerHtml: string,
  documentTitle: string,
  options?: PrintDocumentOptions
): void {
  const w = window.open('', '_blank');
  if (!w) {
    window.alert('Разрешите всплывающие окна для печати этого документа.');
    return;
  }

  w.document.open();
  w.document.write(buildPrintableHtmlDocument(innerHtml, documentTitle, options));
  w.document.close();

  if (options?.contractCompact) {
    try {
      applyContractCompactFontSizesInPrintDocument(w.document);
    } catch {
      /* fallback: только CSS */
    }
  }

  try {
    if (typeof window.location?.origin === 'string' && window.location.origin !== 'null') {
      const path = window.location.pathname || '/';
      w.history.replaceState(null, '', `${window.location.origin}${path}`);
    }
  } catch {
    /* opaque origin */
  }

  attachPrintWindowCloseHandlers(w);
  try {
    w.focus();
    w.print();
  } catch {
    try {
      w.close();
    } catch {
      /* ignore */
    }
  }
}
