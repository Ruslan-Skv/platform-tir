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

function buildPrintStylesheet(marginFooter?: PrintMarginFooterNames): string {
  const pageBlock = marginFooter
    ? buildMarginFooterPageRule(marginFooter)
    : `@page { margin: 16mm; size: A4; }`;

  return `${pageBlock}
  html, body { margin: 0; padding: 0; font-family: "Times New Roman", Times, serif; color: #111; }
  .docPrint { font-size: 12pt; line-height: 1.42; }
  .docPrint a { color: #111 !important; text-decoration: none; }
  .docPrint h1 { font-size: 14pt; text-align: center; margin: 0 0 12pt; }
  .docPrint h2 { font-size: 12pt; margin: 14pt 0 6pt; }
  .docPrint p { margin: 0 0 8pt; }
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

  const styles = buildPrintStylesheet(options?.marginFooter);

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
