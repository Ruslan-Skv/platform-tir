/**
 * Выравнивание подписей в таблице реквизитов: реквизиты и подписи в отдельных строках,
 * подписи Подрядчик / Заказчик на одной горизонтали.
 */

const REQUISITES_TABLE_CLASS = 'contractRequisitesBlock';
const REQUISITES_ROW_CLASS = 'contractRequisitesRequisitesRow';
const SIGNATURES_ROW_CLASS = 'contractRequisitesSignaturesRow';

const SIGNATURE_TEXT_RE = /_{3,}\s*\//;

function normalizeCellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blockTextIsPartyHeader(text: string, party: 'ПОДРЯДЧИК' | 'ЗАКАЗЧИК'): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  if (new RegExp(`^${party}\\s*[:.]?\\s*$`, 'i').test(normalized)) return true;
  if (
    normalized.length <= party.length + 16 &&
    new RegExp(`\\b${party}\\b`, 'i').test(normalized)
  ) {
    return true;
  }
  return false;
}

/** Заголовок колонки в ячейке (первый абзац), а не упоминание «Подрядчик» в тексте пункта 1.1. */
function cellHtmlIsPartyHeader(cellHtml: string, party: 'ПОДРЯДЧИК' | 'ЗАКАЗЧИК'): boolean {
  const blockRe = /<(p|div|h[1-6]|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(cellHtml)) !== null) {
    if (blockTextIsPartyHeader(normalizeCellText(m[0]), party)) return true;
  }
  return blockTextIsPartyHeader(normalizeCellText(cellHtml), party);
}

function cellElementIsPartyHeader(
  cell: HTMLTableCellElement,
  party: 'ПОДРЯДЧИК' | 'ЗАКАЗЧИК'
): boolean {
  for (const el of cell.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li')) {
    if (blockTextIsPartyHeader(el.textContent ?? '', party)) return true;
  }
  return cellHtmlIsPartyHeader(cell.innerHTML, party);
}

function rowHtmlHasSeparatePartyHeaders(rowHtml: string): boolean {
  const tds = rowHtml.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? [];
  if (tds.length < 2) return false;
  let hasContractorHeader = false;
  let hasCustomerHeader = false;
  for (const td of tds) {
    const inner = td.replace(/^<td\b[^>]*>/i, '').replace(/<\/td>$/i, '');
    if (cellHtmlIsPartyHeader(inner, 'ПОДРЯДЧИК')) hasContractorHeader = true;
    if (cellHtmlIsPartyHeader(inner, 'ЗАКАЗЧИК')) hasCustomerHeader = true;
  }
  return hasContractorHeader && hasCustomerHeader;
}

/** Таблица блока «Реквизиты и подписи», а не любая таблица Word с «Подрядчик» в преамбуле. */
export function isRepairRequisitesSignaturesTableHtml(tableHtml: string): boolean {
  if (!tableHtml.includes('ПОДРЯДЧИК') || !tableHtml.includes('ЗАКАЗЧИК')) return false;

  const hasUnderscoreSlash = /_{4,}\s*\//.test(tableHtml);
  const hasMp = /м\s*\.\s*п/i.test(tableHtml);
  const hasPodpis = /подпись/i.test(tableHtml);
  const longUnderlineLines = (tableHtml.match(/_{10,}/g) ?? []).length;
  const hasSignatureMarkers =
    (hasMp && hasPodpis && hasUnderscoreSlash) ||
    longUnderlineLines >= 2 ||
    (hasUnderscoreSlash && /\bcontractRequisitesBlock\b/i.test(tableHtml));

  if (!hasSignatureMarkers) return false;

  return findPartyRowIndexStrict(tableHtml) >= 0;
}

/** Уже есть встроенные подписи в реквизитах (не дублировать contractPageSignatures в конце). */
export function htmlHasRepairEmbeddedRequisitesSignatures(html: string): boolean {
  if (/data-contract-signatures-embedded\s*=\s*(["'])1\1/i.test(html)) return true;
  if (new RegExp(`\\b${SIGNATURES_ROW_CLASS}\\b`).test(html)) return true;
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(html, from);
    if (!found) break;
    if (isRepairRequisitesSignaturesTableHtml(found.block)) return true;
    from = found.end;
  }
  return false;
}

function findNextTableBlock(
  html: string,
  from: number
): { start: number; end: number; block: string } | null {
  const lower = html.toLowerCase();
  const start = lower.indexOf('<table', from);
  if (start < 0) return null;
  const gt = html.indexOf('>', start);
  if (gt < 0) return null;
  let depth = 1;
  let pos = gt + 1;
  while (depth > 0 && pos < html.length) {
    const nextOpen = lower.indexOf('<table', pos);
    const nextClose = lower.indexOf('</table>', pos);
    if (nextClose < 0) return null;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 6;
    } else {
      depth--;
      pos = nextClose + 8;
    }
  }
  if (depth !== 0) return null;
  return { start, end: pos, block: html.slice(start, pos) };
}

function mergeTdClass(attrs: string): string {
  if (/\bcontractRequisitesCol\b/.test(attrs)) return attrs;
  if (/\bclass\s*=/.test(attrs)) {
    return attrs.replace(/class\s*=\s*(["'])([^"']*)\1/i, (_, q, classes) => {
      return `class=${q}${classes} contractRequisitesCol${q}`;
    });
  }
  return `${attrs} class="contractRequisitesCol"`;
}

function extractSplitFromTdHtml(inner: string): { body: string; signatures: string } {
  const trimmed = inner.trim();
  if (trimmed.includes('contractRequisitesColInner')) {
    const bodyMatch = trimmed.match(
      /<div[^>]*\bcontractRequisitesColBody\b[^>]*>([\s\S]*?)<\/div>/i
    );
    const sigMatch = trimmed.match(
      /<div[^>]*\bcontractRequisitesSignatures\b[^>]*>([\s\S]*?)<\/div>/i
    );
    return {
      body: bodyMatch?.[1]?.trim() ?? trimmed,
      signatures: sigMatch?.[1]?.trim() ?? '',
    };
  }

  const nodes: { html: string; text: string }[] = [];
  const blockRe = /<(p|div|h[1-6]|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(trimmed)) !== null) {
    if (m.index > lastEnd) {
      const between = trimmed.slice(lastEnd, m.index).trim();
      if (between) nodes.push({ html: between, text: between.replace(/<[^>]+>/g, '') });
    }
    nodes.push({ html: m[0], text: m[0].replace(/<[^>]+>/g, '') });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < trimmed.length) {
    const tail = trimmed.slice(lastEnd).trim();
    if (tail) nodes.push({ html: tail, text: tail.replace(/<[^>]+>/g, '') });
  }
  if (nodes.length === 0) {
    nodes.push({ html: trimmed, text: trimmed.replace(/<[^>]+>/g, '') });
  }

  let splitAt = -1;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (SIGNATURE_TEXT_RE.test(nodes[i].text)) {
      splitAt = i;
      break;
    }
  }
  if (splitAt < 0) {
    return { body: trimmed, signatures: '' };
  }
  return {
    body: nodes
      .slice(0, splitAt)
      .map((n) => n.html)
      .join('\n')
      .trim(),
    signatures: nodes
      .slice(splitAt)
      .map((n) => n.html)
      .join('\n')
      .trim(),
  };
}

function findPartyRowIndexStrict(tableHtml: string): number {
  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    if (rowHtmlHasSeparatePartyHeaders(m[0])) return m.index;
  }
  return -1;
}

function transformRequisitesTableToTwoRows(tableHtml: string): string {
  if (tableHtml.includes(SIGNATURES_ROW_CLASS)) return tableHtml;

  const rowStart = findPartyRowIndexStrict(tableHtml);
  if (rowStart < 0) return tableHtml;

  const rowMatch = tableHtml.slice(rowStart).match(/^<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  if (!rowMatch) return tableHtml;
  const rowHtml = rowMatch[0];
  const rowEnd = rowStart + rowHtml.length;

  const tdMatches = [...rowHtml.matchAll(/<td(\b[^>]*)>([\s\S]*?)<\/td>/gi)];
  if (tdMatches.length < 2) return tableHtml;

  const partyTds = tdMatches.filter((td) => {
    const inner = td[2] ?? '';
    return cellHtmlIsPartyHeader(inner, 'ПОДРЯДЧИК') || cellHtmlIsPartyHeader(inner, 'ЗАКАЗЧИК');
  });
  const cells = partyTds.length >= 2 ? partyTds.slice(0, 2) : tdMatches.slice(0, 2);

  const splits = cells.map(([, attrs, inner]) => ({
    attrs: mergeTdClass(attrs),
    ...extractSplitFromTdHtml(inner),
  }));

  const row1 = `<tr class="${REQUISITES_ROW_CLASS}">${splits
    .map(
      ({ attrs, body }) => `<td${attrs}><div class="contractRequisitesColBody">${body}</div></td>`
    )
    .join('')}</tr>`;
  const row2 = `<tr class="${SIGNATURES_ROW_CLASS}">${splits
    .map(
      ({ attrs, signatures }) =>
        `<td${attrs}><div class="contractRequisitesSignatures">${signatures || '&nbsp;'}</div></td>`
    )
    .join('')}</tr>`;

  let openTag = tableHtml.match(/^<table\b[^>]*>/i)?.[0] ?? '<table>';
  if (!/\bcontractRequisitesBlock\b/i.test(openTag)) {
    if (/\bclass\s*=/i.test(openTag)) {
      openTag = openTag.replace(/class\s*=\s*(["'])([^"']*)\1/i, (_, q, cls) => {
        const t = cls.trim();
        return `class=${q}${t ? `${t} ` : ''}${REQUISITES_TABLE_CLASS}${q}`;
      });
    } else {
      openTag = openTag.replace(/<table\b/i, `<table class="${REQUISITES_TABLE_CLASS}"`);
    }
  }

  const result = `${tableHtml.slice(0, rowStart)}${row1}${row2}${tableHtml.slice(rowEnd)}`;
  return result.replace(/^<table\b[^>]*>/i, openTag);
}

function findPartyRowStrict(table: HTMLTableElement): HTMLTableRowElement | null {
  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells);
    if (cells.length < 2) continue;
    const contractorCell = cells.find((c) => cellElementIsPartyHeader(c, 'ПОДРЯДЧИК'));
    const customerCell = cells.find((c) => cellElementIsPartyHeader(c, 'ЗАКАЗЧИК'));
    if (!contractorCell || !customerCell || contractorCell === customerCell) continue;
    const nestedPartyTable = cells.some((c) => {
      const nested = c.querySelector('table');
      return nested ? findPartyRowStrict(nested) !== null : false;
    });
    if (nestedPartyTable) continue;
    return row;
  }
  return null;
}

function extractSplitFromTdElement(td: HTMLTableCellElement): {
  body: HTMLDivElement;
  signatures: HTMLDivElement;
} {
  const body = td.ownerDocument.createElement('div');
  body.className = 'contractRequisitesColBody';
  const signatures = td.ownerDocument.createElement('div');
  signatures.className = 'contractRequisitesSignatures';

  const inner = td.querySelector(':scope > .contractRequisitesColInner');
  if (inner) {
    const b = inner.querySelector('.contractRequisitesColBody');
    const s = inner.querySelector('.contractRequisitesSignatures');
    if (b) while (b.firstChild) body.appendChild(b.firstChild);
    if (s) while (s.firstChild) signatures.appendChild(s.firstChild);
    return { body, signatures };
  }

  const nodes = Array.from(td.childNodes);
  let splitAt = -1;
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (SIGNATURE_TEXT_RE.test(nodes[i].textContent ?? '')) {
      splitAt = i;
      break;
    }
  }
  if (splitAt < 0) {
    nodes.forEach((n) => body.appendChild(n));
  } else {
    nodes.slice(0, splitAt).forEach((n) => body.appendChild(n));
    nodes.slice(splitAt).forEach((n) => signatures.appendChild(n));
  }
  return { body, signatures };
}

function transformTableToTwoRowsDom(table: HTMLTableElement): void {
  if (table.querySelector(`tr.${SIGNATURES_ROW_CLASS}`)) return;

  const partyRow = findPartyRowStrict(table);
  if (!partyRow) return;

  let cells = Array.from(partyRow.cells);
  if (cells.length > 2) {
    const p = cells.find((c) => cellElementIsPartyHeader(c, 'ПОДРЯДЧИК'));
    const z = cells.find((c) => cellElementIsPartyHeader(c, 'ЗАКАЗЧИК'));
    if (p && z) cells = [p, z];
    else cells = cells.slice(0, 2);
  }

  const splits = cells.map((cell) => ({
    style: cell.getAttribute('style'),
    className: cell.className,
    ...extractSplitFromTdElement(cell),
  }));

  table.classList.add(REQUISITES_TABLE_CLASS);

  const doc = table.ownerDocument;
  const row1 = doc.createElement('tr');
  row1.className = REQUISITES_ROW_CLASS;
  const row2 = doc.createElement('tr');
  row2.className = SIGNATURES_ROW_CLASS;

  splits.forEach(({ style, className, body, signatures }) => {
    const colClass = className.includes('contractRequisitesCol')
      ? className
      : `${className} contractRequisitesCol`.trim();

    const td1 = doc.createElement('td');
    td1.className = colClass;
    if (style) td1.setAttribute('style', style);
    td1.appendChild(body);
    row1.appendChild(td1);

    const td2 = doc.createElement('td');
    td2.className = colClass;
    if (style) td2.setAttribute('style', style);
    if (!signatures.hasChildNodes()) {
      signatures.innerHTML = '&nbsp;';
    }
    td2.appendChild(signatures);
    row2.appendChild(td2);
  });

  partyRow.replaceWith(row1);
  row1.after(row2);
}

function alignWithDom(html: string): string {
  const doc = new DOMParser().parseFromString(
    `<div id="__requisites_align_root">${html}</div>`,
    'text/html'
  );
  const root = doc.getElementById('__requisites_align_root');
  if (!root) return html;

  const tables = Array.from(root.querySelectorAll('table'));
  for (const table of tables) {
    if (!isRepairRequisitesSignaturesTableHtml(table.outerHTML)) continue;
    transformTableToTwoRowsDom(table);
  }
  return root.innerHTML;
}

function alignWithString(html: string): string {
  if (!html.includes('ПОДРЯДЧИК') || !html.includes('ЗАКАЗЧИК')) return html;
  let out = html;
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(out, from);
    if (!found) break;
    const { start, end, block } = found;
    if (isRepairRequisitesSignaturesTableHtml(block)) {
      const newBlock = transformRequisitesTableToTwoRows(block);
      out = out.slice(0, start) + newBlock + out.slice(end);
      from = start + newBlock.length;
    } else {
      from = end;
    }
  }
  return out;
}

/** Подписи Подрядчик / Заказчик на одной горизонтали (превью и печать). */
export function alignContractRequisitesBlockSignatures(html: string): string {
  if (!html.includes('ПОДРЯДЧИК') || !html.includes('ЗАКАЗЧИК')) return html;
  if (typeof DOMParser !== 'undefined') {
    try {
      return alignWithDom(html);
    } catch {
      return alignWithString(html);
    }
  }
  return alignWithString(html);
}

/** Стили для вставки в printDocument и превью договора. */
export const CONTRACT_REQUISITES_LAYOUT_CSS = `
  .contractRequisitesBlock {
    width: 100%;
    border-collapse: collapse;
  }
  .contractRequisitesBlock tr.contractRequisitesRequisitesRow > td,
  .contractRequisitesBlock tr.contractRequisitesSignaturesRow > td,
  .contractRequisitesBlock > tbody > tr > td.contractRequisitesCol,
  .contractRequisitesBlock > tr > td.contractRequisitesCol {
    vertical-align: top;
  }
  .contractRequisitesBlock tr.contractRequisitesSignaturesRow > td {
    padding-top: 14pt;
  }
  .contractRequisitesBlock .contractRequisitesSignatures p {
    margin: 0;
  }
  .contractRequisitesBlock .contractRequisitesSignatures p + p {
    margin-top: 2pt;
  }
`.trim();

const REQUISITES_COL_TD_BASE =
  'width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong)';
const REQUISITES_COL_TD_CUSTOMER = 'width: 50%; vertical-align: top; padding: 8px 0 8px 10px';

/** Готовая таблица «Реквизиты и подписи» для вставки в редактор / библиотеку. */
export function buildRepairContractRequisitesInsertHtml(options?: {
  embeddedSignatures?: boolean;
}): string {
  const dataAttr = options?.embeddedSignatures ? ' data-contract-signatures-embedded="1"' : '';
  return `<h2 style="text-align: center; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<table class="contractRequisitesBlock"${dataAttr} style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr class="${REQUISITES_ROW_CLASS}">
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_BASE}">
      <div class="contractRequisitesColBody">
        <p style="text-align: center; margin: 0 0 8pt;">ПОДРЯДЧИК</p>
        <p style="margin: 0 0 4pt;">{{executor.companyName}}</p>
        <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
        <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
        <p style="margin: 0 0 4pt;">Юр. адрес: {{executor.legalAddress}}</p>
        <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
        <p style="margin: 0 0 8pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      </div>
    </td>
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_CUSTOMER}">
      <div class="contractRequisitesColBody">
        <p style="text-align: center; margin: 0 0 8pt;">ЗАКАЗЧИК</p>
        {{customer.requisitesHtml|plain}}
      </div>
    </td>
  </tr>
  <tr class="${SIGNATURES_ROW_CLASS}">
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_BASE}">
      <div class="contractRequisitesSignatures">
        <p style="margin: 0;">___________________ / {{executor.directorName}}</p>
        <p style="margin: 0; font-size: 9pt;">м.п.</p>
      </div>
    </td>
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_CUSTOMER}">
      <div class="contractRequisitesSignatures">
        <p style="margin: 0;">___________________ / {{customer.signatureName|plain}}</p>
        <p style="margin: 0; font-size: 9pt;">подпись</p>
      </div>
    </td>
  </tr>
</table>`.trim();
}
