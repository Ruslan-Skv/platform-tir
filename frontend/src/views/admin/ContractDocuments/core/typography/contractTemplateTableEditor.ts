/** Редактирование HTML-таблиц в шаблоне договора (визуальный режим и HTML-источник). */
import { CONTRACT_LEGAL_LIST_CLASS } from './contractLegalList';

export function findTableCellInEditor(
  editor: HTMLElement,
  selection: Selection | null
): HTMLTableCellElement | null {
  if (!selection || selection.rangeCount === 0) return null;
  const anchor = selection.anchorNode;
  if (!anchor) return null;
  return findTableCellFromNode(editor, anchor);
}

function findTableCellFromNode(editor: HTMLElement, node: Node): HTMLTableCellElement | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const cell = element?.closest('td, th');
  if (cell instanceof HTMLTableCellElement && editor.contains(cell)) return cell;
  return null;
}

/** Ячейка таблицы для действия панели: текущее выделение или последнее сохранённое в редакторе. */
export function resolveTableCellForEditorAction(
  editor: HTMLElement,
  selection: Selection | null,
  savedRange: Range | null
): HTMLTableCellElement | null {
  const fromSelection = findTableCellInEditor(editor, selection);
  if (fromSelection) return fromSelection;

  if (!savedRange || !editor.contains(savedRange.commonAncestorContainer)) return null;

  const cell = findTableCellFromNode(editor, savedRange.commonAncestorContainer);
  if (!cell) return null;

  selection?.removeAllRanges();
  selection?.addRange(savedRange.cloneRange());
  return cell;
}

export function findHtmlTableRange(
  html: string,
  cursor: number
): { start: number; end: number } | null {
  const lower = html.toLowerCase();
  const before = lower.slice(0, Math.max(0, cursor));
  const openIdx = before.lastIndexOf('<table');
  if (openIdx < 0) return null;
  const closeTag = '</table>';
  const closeIdx = lower.indexOf(closeTag, cursor);
  if (closeIdx < 0) return null;
  return { start: openIdx, end: closeIdx + closeTag.length };
}

export function isCursorInsideHtmlTable(html: string, cursor: number): boolean {
  return findHtmlTableRange(html, cursor) !== null;
}

function getTableRowIndexFromLocalOffset(tableHtml: string, localOffset: number): number {
  const before = tableHtml.slice(0, Math.max(0, localOffset));
  const opens = before.match(/<tr\b/gi);
  return Math.max(0, (opens?.length ?? 1) - 1);
}

function getTableColIndexFromLocalOffset(tableHtml: string, localOffset: number): number {
  const rowMatches = [...tableHtml.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
  const rowIdx = getTableRowIndexFromLocalOffset(tableHtml, localOffset);
  const rowMatch = rowMatches[rowIdx];
  if (!rowMatch || rowMatch.index == null) return 0;
  const beforeInRow = tableHtml.slice(rowMatch.index, localOffset);
  const opens = beforeInRow.match(/<t[dh]\b/gi);
  return Math.max(0, (opens?.length ?? 1) - 1);
}

function cloneEmptyTableCell(ref: HTMLTableCellElement): HTMLTableCellElement {
  const tag = ref.tagName.toLowerCase() === 'th' ? 'th' : 'td';
  const cell = document.createElement(tag);
  const style = ref.getAttribute('style');
  if (style) cell.setAttribute('style', style);
  const colspan = ref.getAttribute('colspan');
  if (colspan) cell.setAttribute('colspan', colspan);
  cell.innerHTML = '\u00a0';
  return cell;
}

const CLAUSE_NUMBER_RE = /^\d+(?:\.\d+)+\.?$/;

function getContractClauseNumber(row: HTMLTableRowElement): string | null {
  const raw = (row.cells[0]?.textContent ?? '').trim().replace(/\.$/, '');
  return CLAUSE_NUMBER_RE.test(raw) ? raw : null;
}

/** «3.2. Заказчик…» в конце ячейки после импорта Word — выносим в отдельную строку. */
export function peelEmbeddedTrailingSectionHeaderHtml(
  cellHtml: string,
  clauseNumber: string
): { keptHtml: string; headerText: string | null } {
  const match = cellHtml.match(
    /((?:<br\s*\/?>\s*)+)(\d+(?:\.\d+)*\.\s+[^<\n]+?)\s*(?:<br\s*\/?>\s*)*$/i
  );
  if (!match) return { keptHtml: cellHtml, headerText: null };

  const headerText = match[2].trim();
  const headerNum = headerText.match(/^(\d+(?:\.\d+)*)\./)?.[1]?.replace(/\.$/, '');
  const currentNum = clauseNumber.replace(/\.$/, '');
  if (!headerNum || headerNum === currentNum) {
    return { keptHtml: cellHtml, headerText: null };
  }
  if (!/^\d+(?:\.\d+)*\.\s+[А-ЯA-ZЁ]/u.test(headerText)) {
    return { keptHtml: cellHtml, headerText: null };
  }

  const keptHtml = cellHtml.slice(0, cellHtml.length - match[0].length).trimEnd();
  return { keptHtml: keptHtml || '\u00a0', headerText };
}

function peelEmbeddedTrailingSectionHeaderFromRow(row: HTMLTableRowElement): string | null {
  const clauseNumber = getContractClauseNumber(row);
  if (!clauseNumber || row.cells.length < 2) return null;
  const contentCell = row.cells[1];
  const { keptHtml, headerText } = peelEmbeddedTrailingSectionHeaderHtml(
    contentCell.innerHTML,
    clauseNumber
  );
  if (!headerText) return null;
  contentCell.innerHTML = keptHtml;
  return headerText;
}

function createSectionHeaderRow(
  clauseRow: HTMLTableRowElement,
  headerText: string
): HTMLTableRowElement {
  const row = document.createElement('tr');
  const numCell = clauseRow.cells[0]?.cloneNode(false) as HTMLTableCellElement | undefined;
  if (numCell) {
    numCell.innerHTML = '\u00a0';
    row.appendChild(numCell);
  }
  const contentTemplate = clauseRow.cells[1] ?? clauseRow.cells[0];
  const contentCell = contentTemplate.cloneNode(false) as HTMLTableCellElement;
  contentCell.innerHTML = headerText;
  row.appendChild(contentCell);
  return row;
}

function resolveFocusCellForNewRow(
  clauseRow: HTMLTableRowElement | null,
  newRow: HTMLTableRowElement,
  activeColIndex: number
): HTMLTableCellElement | null {
  if (clauseRow && getContractClauseNumber(clauseRow)) {
    return newRow.cells[0] ?? null;
  }
  return newRow.cells[activeColIndex] ?? newRow.cells[0] ?? null;
}

const APPENDIX_LIST_ITEM_RE = /^\d+\.?\s*Приложение\s*№/i;

function isPlainNumberedListOl(ol: Element): ol is HTMLOListElement {
  return ol instanceof HTMLOListElement && !ol.classList.contains(CONTRACT_LEGAL_LIST_CLASS);
}

function findPlainOlFromNode(
  cell: HTMLTableCellElement,
  node: Node | null
): HTMLOListElement | null {
  let current: Node | null = node;
  while (current && current !== cell) {
    if (current instanceof HTMLOListElement && isPlainNumberedListOl(current)) return current;
    current = current.parentNode;
  }
  return null;
}

function cloneListItemFromReference(refLi: HTMLLIElement | null): HTMLLIElement {
  const li = document.createElement('li');
  if (refLi) {
    const spacing = refLi.getAttribute('data-contract-paragraph-spacing');
    if (spacing) li.setAttribute('data-contract-paragraph-spacing', spacing);
    const style = refLi.getAttribute('style');
    if (style) li.setAttribute('style', style);
  } else {
    li.setAttribute('data-contract-paragraph-spacing', 'normal');
    li.style.margin = '0 0 5pt';
    li.style.lineHeight = '1.32';
  }
  li.innerHTML = '\u00a0';
  return li;
}

/** В ячейке с обычным `<ol>` (не договорным) добавляет пункт списка вместо новой строки таблицы. */
export function tryInsertNumberedListItemInCell(
  cell: HTMLTableCellElement,
  selection: Selection | null
): HTMLLIElement | null {
  const anchor = selection?.anchorNode ?? null;
  if (!anchor || !cell.contains(anchor)) return null;

  const ol = findPlainOlFromNode(cell, anchor);
  if (!ol) return null;

  let anchorLi: HTMLLIElement | null = null;
  let node: Node | null = anchor;
  while (node && node !== ol) {
    if (node instanceof HTMLLIElement) anchorLi = node;
    node = node.parentNode;
  }

  const newLi = cloneListItemFromReference(anchorLi ?? ol.querySelector<HTMLLIElement>('li'));
  if (anchorLi?.parentElement === ol) {
    anchorLi.after(newLi);
  } else {
    ol.appendChild(newLi);
  }
  return newLi;
}

function findPlainOlInRow(row: HTMLTableRowElement): HTMLOListElement | null {
  for (const cell of Array.from(row.cells)) {
    const ol = cell.querySelector(`ol:not(.${CONTRACT_LEGAL_LIST_CLASS})`);
    if (ol instanceof HTMLOListElement) return ol;
  }
  return null;
}

function isEmptyTableCellText(cell: HTMLTableCellElement): boolean {
  return (cell.textContent ?? '').replace(/\u00a0/g, ' ').trim() === '';
}

function stripLeadingListNumberHtml(html: string): string {
  return html.replace(/^(\s|&nbsp;|&#160;|<br\s*\/?>)*\d+\.?\s*/i, '').trim() || '\u00a0';
}

function isOrphanAppendixListRow(row: HTMLTableRowElement): HTMLTableCellElement | null {
  if (getContractClauseNumber(row)) return null;
  if (row.cells.length < 2) return null;
  if (!isEmptyTableCellText(row.cells[0])) return null;

  const contentCell = row.cells[1];
  const text = (contentCell.textContent ?? '').replace(/\u00a0/g, ' ').trim();
  if (!APPENDIX_LIST_ITEM_RE.test(text)) return null;
  return contentCell;
}

/** Сливает «оторванные» пункты приложений (отдельная `<tr>` после `<ol>`) обратно в список. */
export function repairOrphanAppendixListRowsInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;
  for (const table of root.querySelectorAll('table')) {
    for (let i = table.rows.length - 1; i >= 1; i--) {
      const row = table.rows[i];
      const contentCell = isOrphanAppendixListRow(row);
      if (!contentCell) continue;

      const ol = findPlainOlInRow(table.rows[i - 1]);
      if (!ol) continue;

      const refLi = ol.querySelector<HTMLLIElement>('li:last-child');
      const li = cloneListItemFromReference(refLi);
      li.innerHTML = stripLeadingListNumberHtml(contentCell.innerHTML);
      ol.appendChild(li);
      row.remove();
    }
  }
}

/** «+стр» / Ctrl+Enter: пункт `<ol>` в ячейке или новая строка таблицы. */
export function insertTableRowOrListItemBelowCell(
  cell: HTMLTableCellElement,
  selection: Selection | null
): HTMLElement | null {
  const listItem = tryInsertNumberedListItemInCell(cell, selection);
  if (listItem) return listItem;
  return addTableRowBelowCell(cell);
}

/** Добавляет пустую строку под строкой с указанной ячейкой. Возвращает ячейку для фокуса. */
export function addTableRowBelowCell(cell: HTMLTableCellElement): HTMLTableCellElement | null {
  const row = cell.closest('tr');
  if (!row) return null;

  const peeledHeader = peelEmbeddedTrailingSectionHeaderFromRow(row);

  const newRow = row.cloneNode(true) as HTMLTableRowElement;
  for (const c of Array.from(newRow.cells)) {
    c.innerHTML = '\u00a0';
  }

  row.after(newRow);

  if (peeledHeader) {
    newRow.after(createSectionHeaderRow(row, peeledHeader));
  }

  return resolveFocusCellForNewRow(row, newRow, cell.cellIndex);
}

/** Добавляет столбец справа от столбца указанной ячейки. */
export function addTableColumnAfterCell(cell: HTMLTableCellElement): HTMLTableCellElement | null {
  const table = cell.closest('table');
  if (!table) return null;
  const colIndex = cell.cellIndex;
  const focusRow = cell.closest('tr');
  let focusCell: HTMLTableCellElement | null = null;
  for (const row of Array.from(table.rows)) {
    const ref = row.cells[colIndex];
    if (!ref) continue;
    const neu = cloneEmptyTableCell(ref);
    ref.after(neu);
    if (row === focusRow) focusCell = neu;
  }
  return focusCell;
}

export function focusEditorCaret(editor: HTMLElement, target: HTMLElement | null): void {
  if (!target || !editor.contains(target)) return;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(true);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
  editor.focus();
}

export function focusTableCell(editor: HTMLElement, cell: HTMLTableCellElement | null): void {
  focusEditorCaret(editor, cell);
}

function resolveCellForHtmlTable(table: HTMLTableElement, tableHtml: string, localOffset: number) {
  const rowIdx = getTableRowIndexFromLocalOffset(tableHtml, localOffset);
  const row = table.rows[rowIdx] ?? table.rows[table.rows.length - 1];
  if (!row) return null;
  const colIdx = Math.min(
    getTableColIndexFromLocalOffset(tableHtml, localOffset),
    Math.max(0, row.cells.length - 1)
  );
  return row.cells[colIdx] ?? row.cells[0] ?? null;
}

export function addTableRowInHtml(html: string, cursor: number): string | null {
  const range = findHtmlTableRange(html, cursor);
  if (!range) return null;
  const tableHtml = html.slice(range.start, range.end);
  const host = document.createElement('div');
  host.innerHTML = tableHtml;
  const table = host.querySelector('table');
  if (!table) return null;
  const cell = resolveCellForHtmlTable(table, tableHtml, cursor - range.start);
  if (!cell || !insertTableRowOrListItemBelowCell(cell, null)) return null;
  repairOrphanAppendixListRowsInDom(host);
  return html.slice(0, range.start) + host.innerHTML + html.slice(range.end);
}

export function addTableColumnInHtml(html: string, cursor: number): string | null {
  const range = findHtmlTableRange(html, cursor);
  if (!range) return null;
  const tableHtml = html.slice(range.start, range.end);
  const host = document.createElement('div');
  host.innerHTML = tableHtml;
  const table = host.querySelector('table');
  if (!table) return null;
  const cell = resolveCellForHtmlTable(table, tableHtml, cursor - range.start);
  if (!cell || !addTableColumnAfterCell(cell)) return null;
  return html.slice(0, range.start) + host.innerHTML + html.slice(range.end);
}
