import {
  CONTRACT_SIGN_CUSTOMER_SLASH_CLASS,
  CONTRACT_SIGN_FIO_LINE_CLASS,
  CONTRACT_SIGN_NAME_TEXT_CLASS,
  CONTRACT_SIGN_SIGNATURE_LINE_CLASS,
  CONTRACT_SIGN_SLASH_ROW_CLASS,
  CONTRACT_SIGN_TABLE_SIGN_ROW_CLASS,
  buildContractActHandwrittenCustomerSignaturesHtml,
} from './contractTemplateInsertBlocks';

const HANDWRITTEN_SIGN_TABLE_SELECTOR =
  'table[data-contract-signatures-handwritten-customer="1"], table.signTableActHandwritten';

const LEGACY_SIGNATURE_WRAPPER_SELECTOR = '.signTableActRight, table.signTableActLayout';

const EXECUTOR_NAME_PLACEHOLDER_RE = /\{\{executor\.directorName(?:\|plain)?\}\}/;

function htmlIncludesLegacyActSignatureMarkup(html: string): boolean {
  return /signTableActHandwritten|signTableActLayout|signTableActRight|data-contract-signatures-handwritten-customer/i.test(
    html
  );
}

function findHandwrittenSignTable(root: ParentNode): HTMLTableElement | null {
  const tables = [...root.querySelectorAll<HTMLTableElement>(HANDWRITTEN_SIGN_TABLE_SELECTOR)];
  if (tables.length === 0) return null;
  return tables[tables.length - 1] ?? null;
}

function unwrapLegacyActSignatureWrappers(root: ParentNode): boolean {
  const wrappers = [...root.querySelectorAll<HTMLElement>(LEGACY_SIGNATURE_WRAPPER_SELECTOR)];
  for (const wrapper of wrappers) {
    const inner =
      findHandwrittenSignTable(wrapper) ??
      wrapper.querySelector<HTMLTableElement>('table.signTable');
    if (inner) {
      wrapper.replaceWith(inner.cloneNode(true));
    } else {
      wrapper.remove();
    }
    return true;
  }

  for (const cell of [
    ...root.querySelectorAll<HTMLTableCellElement>(
      'td.signTableActLayoutSpacer, td.signTableActLayoutBody'
    ),
  ]) {
    const inner =
      findHandwrittenSignTable(cell) ?? cell.querySelector<HTMLTableElement>('table.signTable');
    const layout = cell.closest('table.signTableActLayout');
    if (inner && layout) {
      layout.replaceWith(inner.cloneNode(true));
      return true;
    }
  }

  const orphanLayouts = [...root.querySelectorAll('table.signTableActLayout')];
  if (orphanLayouts.length > 0) {
    orphanLayouts.forEach((table) => table.remove());
    return true;
  }

  return false;
}

function renameLegacySlashRowClass(cell: HTMLTableCellElement): void {
  cell.querySelectorAll(`.${CONTRACT_SIGN_CUSTOMER_SLASH_CLASS}`).forEach((el) => {
    el.classList.remove(CONTRACT_SIGN_CUSTOMER_SLASH_CLASS);
    el.classList.add(CONTRACT_SIGN_SLASH_ROW_CLASS);
  });
}

function buildSlashSignRow(doc: Document, afterSlash: Node): HTMLSpanElement {
  const wrap = doc.createElement('span');
  wrap.className = CONTRACT_SIGN_SLASH_ROW_CLASS;
  const signatureLine = doc.createElement('span');
  signatureLine.className = CONTRACT_SIGN_SIGNATURE_LINE_CLASS;
  signatureLine.textContent = '\u00A0';
  wrap.append(signatureLine, doc.createTextNode('/'), afterSlash);
  return wrap;
}

function upgradeExecutorSignCell(executorCell: HTMLTableCellElement): void {
  renameLegacySlashRowClass(executorCell);
  const existing = executorCell.querySelector(
    `.${CONTRACT_SIGN_SLASH_ROW_CLASS} .${CONTRACT_SIGN_NAME_TEXT_CLASS}`
  );
  if (existing) return;

  const doc = executorCell.ownerDocument;
  const nameSpan = doc.createElement('span');
  nameSpan.className = CONTRACT_SIGN_NAME_TEXT_CLASS;

  const placeholderMatch = executorCell.innerHTML.match(EXECUTOR_NAME_PLACEHOLDER_RE);
  if (placeholderMatch) {
    nameSpan.textContent = placeholderMatch[0];
  } else {
    const text = executorCell.textContent ?? '';
    const slashIdx = text.lastIndexOf('/');
    nameSpan.textContent = slashIdx >= 0 ? text.slice(slashIdx + 1).trim() : text.trim();
  }

  executorCell.textContent = '';
  executorCell.append(buildSlashSignRow(doc, nameSpan));
}

function upgradeCustomerSignCell(customerCell: HTMLTableCellElement): void {
  renameLegacySlashRowClass(customerCell);
  if (
    customerCell.querySelector(`.${CONTRACT_SIGN_SLASH_ROW_CLASS} .${CONTRACT_SIGN_FIO_LINE_CLASS}`)
  ) {
    return;
  }

  const doc = customerCell.ownerDocument;
  const fioLine = doc.createElement('span');
  fioLine.className = CONTRACT_SIGN_FIO_LINE_CLASS;
  fioLine.textContent = '\u00A0';
  customerCell.textContent = '';
  customerCell.append(buildSlashSignRow(doc, fioLine));
}

function upgradeSignRow(table: HTMLTableElement): void {
  const headerRow = table.querySelector('tr');
  const signRow = table.querySelectorAll('tr')[1];
  if (!signRow) return;

  signRow.classList.add(CONTRACT_SIGN_TABLE_SIGN_ROW_CLASS);
  const cells = signRow.querySelectorAll('td');
  if (cells[0]) upgradeExecutorSignCell(cells[0]);
  if (cells[1]) upgradeCustomerSignCell(cells[1]);

  if (headerRow && signRow.previousElementSibling !== headerRow) {
    // порядок строк не трогаем
  }
}

function ensureCanonicalHandwrittenSignTable(table: HTMLTableElement): void {
  table.classList.add('signTable', 'signTableActHandwritten');
  table.setAttribute('data-contract-signatures-handwritten-customer', '1');
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  upgradeSignRow(table);

  for (const nested of [
    ...table.querySelectorAll<HTMLTableElement>(HANDWRITTEN_SIGN_TABLE_SELECTOR),
  ]) {
    if (nested !== table) nested.remove();
  }
}

/** Убирает устаревшие обёртки (50% ширины) и выносит таблицу подписей на всю ширину листа. */
export function normalizeContractActHandwrittenSignaturesInHtml(html: string): string {
  if (!htmlIncludesLegacyActSignatureMarkup(html)) return html;

  if (typeof DOMParser === 'undefined') {
    return normalizeContractActHandwrittenSignaturesString(html);
  }

  try {
    const doc = new DOMParser().parseFromString(`<div id="__sig_root">${html}</div>`, 'text/html');
    const root = doc.getElementById('__sig_root');
    if (!root) return html;

    while (unwrapLegacyActSignatureWrappers(root)) {
      // повторяем, пока есть вложенные обёртки
    }

    const tables = [...root.querySelectorAll<HTMLTableElement>(HANDWRITTEN_SIGN_TABLE_SELECTOR)];
    if (tables.length === 0) {
      return root.innerHTML;
    }

    for (const table of tables) {
      ensureCanonicalHandwrittenSignTable(table);
    }

    return root.innerHTML;
  } catch {
    return normalizeContractActHandwrittenSignaturesString(html);
  }
}

/** Запасной путь без DOMParser (тесты, редкие окружения). */
export function normalizeContractActHandwrittenSignaturesString(html: string): string {
  if (!htmlIncludesLegacyActSignatureMarkup(html)) return html;

  let out = html;
  const canonical = buildContractActHandwrittenCustomerSignaturesHtml();

  if (/signTableActLayout|signTableActRight/i.test(out)) {
    out = out.replace(
      /<div[^>]*class="[^"]*signTableActRight[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      canonical
    );
    out = out.replace(
      /<table[^>]*class="[^"]*signTableActLayout[^"]*"[^>]*>[\s\S]*?<\/table>/gi,
      (chunk) =>
        chunk.includes('data-contract-signatures-handwritten-customer') ||
        chunk.includes('signTableActHandwritten')
          ? canonical
          : chunk
    );
  }

  if (
    /_________________\/|contractSignCustomerSlash/i.test(out) &&
    !out.includes(CONTRACT_SIGN_SLASH_ROW_CLASS)
  ) {
    out = out.replace(
      /<table[^>]*class="[^"]*signTableActHandwritten[^"]*"[^>]*>[\s\S]*?<\/table>/i,
      canonical
    );
  }

  return out;
}
