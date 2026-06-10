/**
 * Выравнивание подписей в таблице реквизитов: реквизиты и подписи в отдельных строках,
 * подписи Подрядчик / Заказчик на одной горизонтали.
 */

const REQUISITES_TABLE_CLASS = 'contractRequisitesBlock';
const REQUISITES_ROW_CLASS = 'contractRequisitesRequisitesRow';
const SIGNATURES_ROW_CLASS = 'contractRequisitesSignaturesRow';

const SIGNATURE_TEXT_RE = /_{3,}\s*\//;

type RequisitesPartyRole = 'contractor' | 'customer';

const CONTRACTOR_PARTY_LABELS = ['ПОДРЯДЧИК', 'ИСПОЛНИТЕЛЬ'] as const;
const CUSTOMER_PARTY_LABELS = ['ЗАКАЗЧИК'] as const;

function partyLabels(role: RequisitesPartyRole): readonly string[] {
  return role === 'contractor' ? CONTRACTOR_PARTY_LABELS : CUSTOMER_PARTY_LABELS;
}

/** \\b в JS не работает с кириллицей — иначе «ИСПОЛНИТЕЛЬ»/«ЗАКАЗЧИК» не находятся. */
function textIncludesWholePartyLabel(text: string, label: string): boolean {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])${escaped}(?:[^\\p{L}\\p{N}_]|$)`, 'iu').test(text);
}

function htmlIncludesPartyLabel(html: string, role: RequisitesPartyRole): boolean {
  const labels = partyLabels(role);
  const plain = html.replace(/<[^>]+>/g, ' ');
  return labels.some((label) => textIncludesWholePartyLabel(plain, label));
}

function normalizeCellText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blockTextIsPartyHeader(text: string, role: RequisitesPartyRole): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  for (const label of partyLabels(role)) {
    if (new RegExp(`^${label}\\s*[:.]?\\s*$`, 'i').test(normalized)) return true;
    if (normalized.length <= label.length + 20 && textIncludesWholePartyLabel(normalized, label)) {
      return true;
    }
  }
  return false;
}

/** Заголовок колонки в ячейке (первый абзац), а не упоминание «Подрядчик» в тексте пункта 1.1. */
function cellHtmlIsPartyHeader(cellHtml: string, role: RequisitesPartyRole): boolean {
  const blockRe = /<(p|div|h[1-6]|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(cellHtml)) !== null) {
    if (blockTextIsPartyHeader(normalizeCellText(m[0]), role)) return true;
  }
  return blockTextIsPartyHeader(normalizeCellText(cellHtml), role);
}

function cellElementIsPartyHeader(cell: HTMLTableCellElement, role: RequisitesPartyRole): boolean {
  for (const el of cell.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, strong, b, span')) {
    if (blockTextIsPartyHeader(el.textContent ?? '', role)) return true;
  }
  return cellHtmlIsPartyHeader(cell.innerHTML, role);
}

/** Заголовок стороны в ячейке или во вложенной таблице Word (две колонки — два вложенных table). */
function cellHasPartyHeaderDeep(cell: HTMLTableCellElement, role: RequisitesPartyRole): boolean {
  if (cellElementIsPartyHeader(cell, role)) return true;
  for (const nested of cell.querySelectorAll('table')) {
    const text = nested.textContent ?? '';
    if (partyLabels(role).some((label) => textIncludesWholePartyLabel(text, label))) {
      return true;
    }
  }
  return false;
}

function tdHtmlHasPartyHeaderDeep(tdHtml: string, role: RequisitesPartyRole): boolean {
  if (cellHtmlIsPartyHeader(tdHtml, role)) return true;
  const nestedTables = tdHtml.match(/<table\b[\s\S]*?<\/table>/gi) ?? [];
  for (const nested of nestedTables) {
    if (htmlIncludesPartyLabel(nested, role)) return true;
  }
  return partyLabels(role).some((label) => textIncludesWholePartyLabel(tdHtml, label));
}

function rowHtmlHasSeparatePartyHeaders(rowHtml: string): boolean {
  const tds = rowHtml.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? [];
  if (tds.length < 2) return false;
  let hasContractorHeader = false;
  let hasCustomerHeader = false;
  for (const td of tds) {
    const inner = td.replace(/^<td\b[^>]*>/i, '').replace(/<\/td>$/i, '');
    if (tdHtmlHasPartyHeaderDeep(inner, 'contractor')) hasContractorHeader = true;
    if (tdHtmlHasPartyHeaderDeep(inner, 'customer')) hasCustomerHeader = true;
  }
  return hasContractorHeader && hasCustomerHeader;
}

/** Таблица блока «Реквизиты и подписи», а не любая таблица Word с «Подрядчик» в преамбуле. */
export function isPackageRequisitesSignaturesTableHtml(tableHtml: string): boolean {
  if (!htmlIncludesPartyLabel(tableHtml, 'customer')) return false;
  if (!htmlIncludesPartyLabel(tableHtml, 'contractor')) return false;

  const hasUnderscoreSlash = /_{4,}\s*\//.test(tableHtml);
  const hasMp = /м\s*\.\s*п/i.test(tableHtml);
  const hasPodpis = /подпись/i.test(tableHtml);
  const longUnderlineLines = (tableHtml.match(/_{10,}/g) ?? []).length;
  const hasSignatureMarkers =
    (hasMp && hasPodpis && hasUnderscoreSlash) ||
    longUnderlineLines >= 2 ||
    (hasUnderscoreSlash && /\bcontractRequisitesBlock\b/i.test(tableHtml)) ||
    (hasUnderscoreSlash && longUnderlineLines >= 1);

  if (!hasSignatureMarkers) return false;

  if (findPartyRowIndexStrict(tableHtml) >= 0) return true;

  return /\bРЕКВИЗИТ[\s\S]{0,80}ПОДПИС/i.test(tableHtml);
}

/** Уже есть встроенные подписи в реквизитах (не дублировать contractPageSignatures в конце). */
export function htmlHasEmbeddedRequisitesSignatures(html: string): boolean {
  if (/data-contract-signatures-embedded\s*=\s*(["'])1\1/i.test(html)) return true;
  if (new RegExp(`\\b${SIGNATURES_ROW_CLASS}\\b`).test(html)) return true;
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(html, from);
    if (!found) break;
    if (isPackageRequisitesSignaturesTableHtml(found.block)) return true;
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
  rowRe.lastIndex = 0;
  while ((m = rowRe.exec(tableHtml)) !== null) {
    const tds = m[0].match(/<t[dh]\b[^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
    if (tds.length < 2) continue;
    let hasContractor = false;
    let hasCustomer = false;
    for (const td of tds) {
      const inner = td.replace(/^<t[dh]\b[^>]*>/i, '').replace(/<\/t[dh]>$/i, '');
      if (tdHtmlHasPartyHeaderDeep(inner, 'contractor')) hasContractor = true;
      if (tdHtmlHasPartyHeaderDeep(inner, 'customer')) hasCustomer = true;
    }
    if (hasContractor && hasCustomer) return m.index;
  }
  return -1;
}

function mergeHeaderAndDataRowsInTableHtml(tableHtml: string): string {
  const rowStart = findPartyRowIndexStrict(tableHtml);
  if (rowStart < 0) return tableHtml;

  const rowMatch = tableHtml.slice(rowStart).match(/^<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  if (!rowMatch) return tableHtml;
  const rowHtml = rowMatch[0];
  const rowEnd = rowStart + rowHtml.length;

  const headerTds = [...rowHtml.matchAll(/<td(\b[^>]*)>([\s\S]*?)<\/td>/gi)];
  if (headerTds.length < 2) return tableHtml;
  const headerHasSig = headerTds.some((td) =>
    SIGNATURE_TEXT_RE.test(normalizeCellText(td[2] ?? ''))
  );
  if (headerHasSig) return tableHtml;

  const nextMatch = tableHtml.slice(rowEnd).match(/^\s*<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  if (!nextMatch) return tableHtml;
  const dataRow = nextMatch[0];
  const dataTds = [...dataRow.matchAll(/<td(\b[^>]*)>([\s\S]*?)<\/td>/gi)];
  if (dataTds.length < 2) return tableHtml;

  const partyHeaderTds = headerTds.filter((td) => {
    const inner = td[2] ?? '';
    return cellHtmlIsPartyHeader(inner, 'contractor') || cellHtmlIsPartyHeader(inner, 'customer');
  });
  const headerCells =
    partyHeaderTds.length >= 2 ? partyHeaderTds.slice(0, 2) : headerTds.slice(0, 2);

  const mergedRow = `<tr>${headerCells
    .map((td, i) => {
      const attrs = td[1] ?? '';
      const headerInner = (td[2] ?? '').trim();
      const dataInner = (dataTds[i]?.[2] ?? '').trim();
      const merged = [headerInner, dataInner].filter(Boolean).join('\n');
      return `<td${attrs}>${merged}</td>`;
    })
    .join('')}</tr>`;

  const dataRowEnd = rowEnd + nextMatch[0].length;
  return tableHtml.slice(0, rowStart) + mergedRow + tableHtml.slice(dataRowEnd);
}

function transformRequisitesTableToTwoRows(tableHtml: string): string {
  if (tableHtml.includes(SIGNATURES_ROW_CLASS)) return tableHtml;

  let working = mergeHeaderAndDataRowsInTableHtml(tableHtml);

  const rowStart = findPartyRowIndexStrict(working);
  if (rowStart < 0) return tableHtml;

  const rowMatch = working.slice(rowStart).match(/^<tr\b[^>]*>[\s\S]*?<\/tr>/i);
  if (!rowMatch) return tableHtml;
  const rowHtml = rowMatch[0];
  const rowEnd = rowStart + rowHtml.length;

  const tdMatches = [...rowHtml.matchAll(/<td(\b[^>]*)>([\s\S]*?)<\/td>/gi)];
  if (tdMatches.length < 2) return tableHtml;

  const partyTds = tdMatches.filter((td) => {
    const inner = td[2] ?? '';
    return (
      tdHtmlHasPartyHeaderDeep(inner, 'contractor') || tdHtmlHasPartyHeaderDeep(inner, 'customer')
    );
  });
  const cells = partyTds.length >= 2 ? partyTds.slice(0, 2) : tdMatches.slice(0, 2);

  const splits = cells.map(([, attrs, inner]) => ({
    attrs: mergeTdClass(attrs),
    ...extractSplitFromTdHtml(inner),
  }));

  const hasSignatures = splits.some((s) => SIGNATURE_TEXT_RE.test(s.signatures));
  if (!hasSignatures) return tableHtml;

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

  let openTag = working.match(/^<table\b[^>]*>/i)?.[0] ?? '<table>';
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

  const result = `${working.slice(0, rowStart)}${row1}${row2}${working.slice(rowEnd)}`;
  return result.replace(/^<table\b[^>]*>/i, openTag);
}

function findPartyRowStrict(table: HTMLTableElement): HTMLTableRowElement | null {
  for (const row of Array.from(table.rows)) {
    const cells = Array.from(row.cells);
    if (cells.length < 2) continue;
    const contractorCell = cells.find((c) => cellHasPartyHeaderDeep(c, 'contractor'));
    const customerCell = cells.find((c) => cellHasPartyHeaderDeep(c, 'customer'));
    if (!contractorCell || !customerCell || contractorCell === customerCell) continue;
    return row;
  }
  for (const row of Array.from(table.rows)) {
    if (row.cells.length < 2) continue;
    const hasContractor = Array.from(row.cells).some((c) =>
      cellHasPartyHeaderDeep(c, 'contractor')
    );
    const hasCustomer = Array.from(row.cells).some((c) => cellHasPartyHeaderDeep(c, 'customer'));
    if (hasContractor && hasCustomer) return row;
  }
  return null;
}

type ResolvedRequisitesCells = {
  contractorCell: HTMLTableCellElement;
  customerCell: HTMLTableCellElement;
  hostRow: HTMLTableRowElement;
  rowsToRemove: HTMLTableRowElement[];
};

function pickContractorCustomerCells(
  row: HTMLTableRowElement
): [HTMLTableCellElement, HTMLTableCellElement] | null {
  const cells = Array.from(row.cells);
  const contractor = cells.find((c) => cellHasPartyHeaderDeep(c, 'contractor'));
  const customer = cells.find((c) => cellHasPartyHeaderDeep(c, 'customer'));
  if (contractor && customer && contractor !== customer) return [contractor, customer];
  if (cells.length >= 2) return [cells[0]!, cells[1]!];
  return null;
}

function cellHasSignatureContent(cell: HTMLTableCellElement): boolean {
  if (SIGNATURE_TEXT_RE.test(cell.textContent ?? '')) return true;
  return findLastSignatureBlockInSubtree(cell) !== null;
}

function mergeCellContents(target: HTMLTableCellElement, source: HTMLTableCellElement): void {
  while (source.firstChild) {
    target.appendChild(source.firstChild);
  }
}

/** Слияние строки заголовков (ИСПОЛНИТЕЛЬ | ЗАКАЗЧИК) со строкой реквизитов — типичный экспорт Word. */
function resolveRequisitesPartyCells(table: HTMLTableElement): ResolvedRequisitesCells | null {
  const headerRow = findPartyRowStrict(table);
  if (!headerRow) {
    for (const row of Array.from(table.rows)) {
      const picked = pickContractorCustomerCells(row);
      if (!picked) continue;
      const [contractorCell, customerCell] = picked;
      if (cellHasSignatureContent(contractorCell) && cellHasSignatureContent(customerCell)) {
        return { contractorCell, customerCell, hostRow: row, rowsToRemove: [] };
      }
    }
    return null;
  }

  const picked = pickContractorCustomerCells(headerRow);
  if (!picked) return null;
  const [contractorCell, customerCell] = picked;
  const rowsToRemove: HTMLTableRowElement[] = [];

  if (!cellHasSignatureContent(contractorCell) && !cellHasSignatureContent(customerCell)) {
    const rows = Array.from(table.rows);
    const headerIdx = rows.indexOf(headerRow);
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const dataPicked = pickContractorCustomerCells(rows[i]!);
      if (!dataPicked) continue;
      mergeCellContents(contractorCell, dataPicked[0]);
      mergeCellContents(customerCell, dataPicked[1]);
      rowsToRemove.push(rows[i]!);
      break;
    }
  }

  return { contractorCell, customerCell, hostRow: headerRow, rowsToRemove };
}

function findLastSignatureBlockInSubtree(root: ParentNode): Element | null {
  const blocks = Array.from(root.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6'));
  const matches = blocks.filter((el) => SIGNATURE_TEXT_RE.test((el.textContent ?? '').trim()));
  if (matches.length === 0) return null;
  const leaves = matches.filter(
    (el) => !matches.some((other) => other !== el && el.contains(other))
  );
  return leaves[leaves.length - 1] ?? matches[matches.length - 1];
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

  const signatureBlock = findLastSignatureBlockInSubtree(td);
  if (signatureBlock) {
    const doc = td.ownerDocument;
    const marker = doc.createComment('contract-requisites-split');
    signatureBlock.parentNode?.insertBefore(marker, signatureBlock);
    while (td.firstChild && td.firstChild !== marker) {
      body.appendChild(td.firstChild);
    }
    if (marker.parentNode) marker.parentNode.removeChild(marker);
    while (td.firstChild) {
      signatures.appendChild(td.firstChild);
    }
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

function applyTwoRowSignaturesLayout(
  table: HTMLTableElement,
  resolved: ResolvedRequisitesCells
): boolean {
  const cells = [resolved.contractorCell, resolved.customerCell];
  const splits = cells.map((cell) => ({
    style: cell.getAttribute('style'),
    className: cell.className,
    ...extractSplitFromTdElement(cell),
  }));

  const hasSignatures = splits.some((s) => SIGNATURE_TEXT_RE.test(s.signatures.textContent ?? ''));
  if (!hasSignatures) return false;

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

  resolved.hostRow.replaceWith(row1);
  row1.after(row2);
  return true;
}

function wrapCellContentInFlexColumn(
  doc: Document,
  cell: HTMLTableCellElement,
  body: HTMLDivElement,
  signatures: HTMLDivElement
): void {
  cell.innerHTML = '';
  if (!cell.classList.contains('contractRequisitesCol')) {
    cell.classList.add('contractRequisitesCol');
  }
  const inner = doc.createElement('div');
  inner.className = 'contractRequisitesColInner';
  inner.appendChild(body);
  if (!signatures.hasChildNodes()) {
    signatures.innerHTML = '&nbsp;';
  }
  inner.appendChild(signatures);
  cell.appendChild(inner);
}

/** Одна строка таблицы: подписи внизу колонки (колонки одной высоты). */
function ensureFlexSignatureAlignmentDom(
  table: HTMLTableElement,
  resolved?: ResolvedRequisitesCells | null
): void {
  if (table.querySelector(`tr.${SIGNATURES_ROW_CLASS}`)) return;

  const ctx = resolved ?? resolveRequisitesPartyCells(table);
  if (!ctx) return;

  if (!resolved) {
    for (const row of ctx.rowsToRemove) {
      row.remove();
    }
  }

  table.classList.add(REQUISITES_TABLE_CLASS);
  const doc = table.ownerDocument;

  for (const cell of [ctx.contractorCell, ctx.customerCell]) {
    if (cell.querySelector(':scope > .contractRequisitesColInner')) continue;
    const { body, signatures } = extractSplitFromTdElement(cell);
    wrapCellContentInFlexColumn(doc, cell, body, signatures);
  }
}

function processRequisitesTableDom(table: HTMLTableElement): void {
  if (!isPackageRequisitesSignaturesTableHtml(table.outerHTML)) return;
  if (table.querySelector(`tr.${SIGNATURES_ROW_CLASS}`)) return;

  const resolved = resolveRequisitesPartyCells(table);
  if (!resolved) return;

  for (const row of resolved.rowsToRemove) {
    row.remove();
  }

  if (!applyTwoRowSignaturesLayout(table, resolved)) {
    ensureFlexSignatureAlignmentDom(table, resolved);
  }
}

function pickInnermostRequisitesTables(root: ParentNode): HTMLTableElement[] {
  const candidates = Array.from(root.querySelectorAll('table')).filter((table) =>
    isPackageRequisitesSignaturesTableHtml(table.outerHTML)
  );
  if (candidates.length === 0) return [];

  const candidateSet = new Set(candidates);
  const innermost = candidates.filter((table) => {
    for (const nested of table.querySelectorAll('table')) {
      if (nested !== table && candidateSet.has(nested)) return false;
    }
    return true;
  });

  return innermost.length > 0 ? innermost : candidates;
}

function alignWithDom(html: string): string {
  const doc = new DOMParser().parseFromString(
    `<div id="__requisites_align_root">${html}</div>`,
    'text/html'
  );
  const root = doc.getElementById('__requisites_align_root');
  if (!root) return html;

  for (const table of pickInnermostRequisitesTables(root)) {
    processRequisitesTableDom(table);
  }
  return root.innerHTML;
}

function alignWithString(html: string): string {
  if (!htmlIncludesPartyLabel(html, 'customer') || !htmlIncludesPartyLabel(html, 'contractor')) {
    return html;
  }
  let out = html;
  let from = 0;
  for (;;) {
    const found = findNextTableBlock(out, from);
    if (!found) break;
    const { start, end, block } = found;
    if (isPackageRequisitesSignaturesTableHtml(block)) {
      const newBlock = transformRequisitesTableToTwoRows(block);
      out = out.slice(0, start) + newBlock + out.slice(end);
      from = start + newBlock.length;
    } else {
      from = end;
    }
  }
  return out;
}

function unwrapElementKeepChildren(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function stripBoldFromElementStyle(el: HTMLElement): void {
  const style = el.getAttribute('style');
  if (!style) return;
  const cleaned = style
    .replace(/\bfont-weight\s*:\s*(?:bold|bolder|[6-9]00)\s*;?/gi, '')
    .replace(/;\s*;/g, ';')
    .replace(/^[\s;]+|[\s;]+$/g, '')
    .trim();
  if (cleaned) el.setAttribute('style', cleaned);
  else el.removeAttribute('style');
}

function normalizeRequisitesBlockTypographyDom(root: ParentNode): void {
  for (const block of root.querySelectorAll(`.${REQUISITES_TABLE_CLASS}`)) {
    for (const el of block.querySelectorAll('strong, b, em, i')) {
      unwrapElementKeepChildren(el);
    }
    for (const el of block.querySelectorAll<HTMLElement>('[style]')) {
      stripBoldFromElementStyle(el);
    }
    for (const body of block.querySelectorAll(
      '.contractRequisitesColBody, .contractRequisitesColInner'
    )) {
      if (body instanceof HTMLElement) {
        body.style.fontWeight = 'normal';
      }
    }
  }
}

function normalizeRequisitesBlockTypographyString(html: string): string {
  if (!html.includes(REQUISITES_TABLE_CLASS)) return html;
  return html.replace(
    new RegExp(`(<table\\b[^>]*\\b${REQUISITES_TABLE_CLASS}\\b[\\s\\S]*?</table>)`, 'gi'),
    (tableHtml) =>
      tableHtml
        .replace(/<\/?(?:strong|b|em|i)\b[^>]*>/gi, '')
        .replace(/\bfont-weight\s*:\s*(?:bold|bolder|[6-9]00)\s*;?/gi, '')
  );
}

/** Реквизиты в блоке — обычное начертание (не жирный заказчик из &lt;strong&gt;&lt;em&gt; договора). */
export function normalizeRequisitesBlockTypography(html: string): string {
  if (!html.includes(REQUISITES_TABLE_CLASS)) return html;
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(
        `<div id="__requisites_typo_root">${html}</div>`,
        'text/html'
      );
      const root = doc.getElementById('__requisites_typo_root');
      if (!root) return normalizeRequisitesBlockTypographyString(html);
      normalizeRequisitesBlockTypographyDom(root);
      return root.innerHTML;
    } catch {
      return normalizeRequisitesBlockTypographyString(html);
    }
  }
  return normalizeRequisitesBlockTypographyString(html);
}

/** Подписи Подрядчик / Заказчик на одной горизонтали (превью и печать). */
export function alignContractRequisitesBlockSignatures(html: string): string {
  if (!htmlIncludesPartyLabel(html, 'customer') || !htmlIncludesPartyLabel(html, 'contractor')) {
    return html;
  }
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
    table-layout: fixed;
  }
  .contractRequisitesBlock tr.contractRequisitesRequisitesRow > td,
  .contractRequisitesBlock tr.contractRequisitesSignaturesRow > td,
  .contractRequisitesBlock > tbody > tr > td.contractRequisitesCol,
  .contractRequisitesBlock > tr > td.contractRequisitesCol {
    vertical-align: top;
  }
  .contractRequisitesBlock tr.contractRequisitesRequisitesRow {
    height: 1px;
  }
  .contractRequisitesBlock tr.contractRequisitesRequisitesRow > td.contractRequisitesCol {
    height: 100%;
  }
  .contractRequisitesBlock .contractRequisitesColInner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 100%;
    box-sizing: border-box;
  }
  .contractRequisitesBlock .contractRequisitesColBody {
    flex: 1 1 auto;
  }
  .contractRequisitesBlock .contractRequisitesSignatures {
    flex: 0 0 auto;
    margin-top: auto;
    padding-top: 14pt;
  }
  .contractRequisitesBlock tr.contractRequisitesSignaturesRow > td {
    padding-top: 14pt;
    vertical-align: top;
  }
  .contractRequisitesBlock tr.contractRequisitesSignaturesRow .contractRequisitesSignatures {
    margin-top: 0;
    padding-top: 0;
  }
  .contractRequisitesBlock .contractRequisitesSignatures p {
    margin: 0;
  }
  .contractRequisitesBlock .contractRequisitesSignatures p + p {
    margin-top: 2pt;
  }
  .contractRequisitesBlock strong,
  .contractRequisitesBlock b,
  .contractRequisitesBlock em,
  .contractRequisitesBlock i {
    font-weight: normal !important;
    font-style: normal !important;
  }
  .contractRequisitesBlock .contractRequisitesColBody,
  .contractRequisitesBlock .contractRequisitesColBody p,
  .contractRequisitesBlock .contractRequisitesColBody div {
    font-weight: normal !important;
  }
`.trim();

const REQUISITES_COL_TD_BASE =
  'width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong)';
const REQUISITES_COL_TD_CUSTOMER = 'width: 50%; vertical-align: top; padding: 8px 0 8px 10px';

const REQUISITES_BODY_P_STYLE = 'margin: 0 0 4pt; font-weight: normal;';
const REQUISITES_HEADER_P_STYLE = 'text-align: center; margin: 0 0 8pt; font-weight: normal;';

/** Готовая таблица «Реквизиты и подписи» для вставки в редактор / библиотеку. */
export function buildPackageContractRequisitesInsertHtml(options?: {
  embeddedSignatures?: boolean;
}): string {
  const embeddedSignatures = options?.embeddedSignatures !== false;
  const dataAttr = embeddedSignatures ? ' data-contract-signatures-embedded="1"' : '';
  return `<h2 style="text-align: center; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<table class="contractRequisitesBlock"${dataAttr} style="width: 100%; border-collapse: collapse; margin-top: 8pt; table-layout: fixed;">
  <tr class="${REQUISITES_ROW_CLASS}">
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_BASE}">
      <div class="contractRequisitesColBody" style="font-weight: normal;">
        <p style="${REQUISITES_HEADER_P_STYLE}">ИСПОЛНИТЕЛЬ</p>
        <p style="${REQUISITES_BODY_P_STYLE}">{{executor.companyName}}</p>
        <p style="${REQUISITES_BODY_P_STYLE}">{{executor.innKppRegLine}}</p>
        <p style="${REQUISITES_BODY_P_STYLE}">E-mail: {{executor.email}}</p>
        <p style="${REQUISITES_BODY_P_STYLE}">Юр. адрес: {{executor.legalAddress}}</p>
        <p style="${REQUISITES_BODY_P_STYLE}">Адрес для корреспонденции: {{executor.actualAddress}}</p>
        <p style="${REQUISITES_BODY_P_STYLE} white-space: pre-wrap;">{{executor.bankDetails}}</p>
      </div>
    </td>
    <td class="contractRequisitesCol" style="${REQUISITES_COL_TD_CUSTOMER}">
      <div class="contractRequisitesColBody" style="font-weight: normal;">
        <p style="${REQUISITES_HEADER_P_STYLE}">ЗАКАЗЧИК</p>
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

/** Блок для кнопки «Реквизиты» в панели инструментов (подписи на одной линии, без жирного). */
export function buildPackageContractRequisitesInsertHtmlForToolbar(): string {
  return normalizeRequisitesBlockTypography(
    alignContractRequisitesBlockSignatures(
      buildPackageContractRequisitesInsertHtml({ embeddedSignatures: true })
    )
  );
}
