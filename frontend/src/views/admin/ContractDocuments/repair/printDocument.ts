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

function buildPrintStylesheet(
  marginFooter?: PrintMarginFooterNames,
  cashOrderCompact?: boolean
): string {
  const pageBlock = marginFooter
    ? buildMarginFooterPageRule(marginFooter)
    : `@page { margin: 16mm; size: A4; }`;

  const cashOrderBlock = cashOrderCompact ? CASH_ORDER_COMPACT_PRINT_CSS : '';

  return `${pageBlock}
  html, body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; color: #111; }
  .docPrint { font-size: 12pt; line-height: 1.42; }
  .docPrint a { color: #111 !important; text-decoration: none; }
  .docPrint h1 { font-size: 14pt; text-align: center; margin: 0 0 12pt; }
  .docPrint h2 { font-size: 12pt; margin: 14pt 0 6pt; }
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
  .contractRequisitesBlock em {
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

  const titleInner = documentTitle.trim() === '' ? '&#8203;' : escapeHtml(documentTitle);

  const styles = buildPrintStylesheet(options?.marginFooter, options?.cashOrderCompact);

  w.document.open();
  w.document
    .write(`<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"/><title>${titleInner}</title>
<style>${styles}</style></head><body>${innerHtml}</body></html>`);
  w.document.close();

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
