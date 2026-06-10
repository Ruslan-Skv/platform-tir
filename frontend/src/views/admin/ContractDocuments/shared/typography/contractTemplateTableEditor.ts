/** Редактирование HTML-таблиц в шаблоне договора (визуальный режим и HTML-источник). */

export function findTableCellInEditor(
  editor: HTMLElement,
  selection: Selection | null
): HTMLTableCellElement | null {
  if (!selection || selection.rangeCount === 0) return null;
  const anchor = selection.anchorNode;
  if (!anchor) return null;
  const element =
    anchor.nodeType === Node.ELEMENT_NODE ? (anchor as Element) : anchor.parentElement;
  const cell = element?.closest('td, th');
  if (cell instanceof HTMLTableCellElement && editor.contains(cell)) return cell;
  return null;
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
  cell.innerHTML = '\u00a0';
  return cell;
}

/** Добавляет строку под строкой с указанной ячейкой. Возвращает ячейку для фокуса. */
export function addTableRowBelowCell(cell: HTMLTableCellElement): HTMLTableCellElement | null {
  const row = cell.closest('tr');
  if (!row) return null;
  const newRow = row.cloneNode(true) as HTMLTableRowElement;
  for (const c of Array.from(newRow.cells)) {
    c.innerHTML = '\u00a0';
  }
  row.after(newRow);
  const colIndex = cell.cellIndex;
  return newRow.cells[colIndex] ?? newRow.cells[0] ?? null;
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

export function focusTableCell(editor: HTMLElement, cell: HTMLTableCellElement | null): void {
  if (!cell || !editor.contains(cell)) return;
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
  editor.focus();
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
  if (!cell || !addTableRowBelowCell(cell)) return null;
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
