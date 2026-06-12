import { detectSectionNumber, getContractLegalListContext } from './contractLegalList';

/** Пункт-заглушка: 2 пустые строки для рукописных замечаний (без номера, счётчик не сдвигается). */
export const CONTRACT_REMARK_BLANK_LINES_CLASS = 'contractRemarkBlankLines';

export const CONTRACT_REMARK_BLANK_LINE_ROW_CLASS = 'contractRemarkBlankLine';

export const CONTRACT_REMARK_BLANK_LINES_COUNT = 2;

/** Минимальные inline-стили; линия — в CSS (border-bottom). */
const REMARK_BLANK_LINE_STYLE = 'margin: 0; padding: 0;';

export const REMARK_BLANK_LINES_TOOLTIP = {
  title: '2 пустые строки (замечания)',
  steps: [
    'Поставьте курсор в пункт договорного списка (1., 1.1., 2.3. …), после которого нужно место для замечаний.',
    'Нажмите кнопку — в том же списке появятся 2 строки с горизонтальной линией для записи замечаний.',
    'Курсор окажется в конце блока; Enter — следующий пункт списка (нумерация не сбивается).',
    'Нужно больше места — нажмите кнопку ещё раз (+2 строки).',
  ],
  note: 'Не вставляйте обычные абзацы между пунктами списка — из-за них слетает нумерация. Используйте эту кнопку.',
} as const;

export function isContractRemarkBlankLinesLi(li: HTMLLIElement): boolean {
  return li.classList.contains(CONTRACT_REMARK_BLANK_LINES_CLASS);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContractRemarkBlankLinesHtml(section = '1'): string {
  const sec = escapeHtml(section);
  const rows = Array.from(
    { length: CONTRACT_REMARK_BLANK_LINES_COUNT },
    () =>
      `<p class="${CONTRACT_REMARK_BLANK_LINE_ROW_CLASS}" style="${REMARK_BLANK_LINE_STYLE}">\u200b</p>`
  ).join('');
  return `<li class="${CONTRACT_REMARK_BLANK_LINES_CLASS}" data-section="${sec}" data-blank-lines="${CONTRACT_REMARK_BLANK_LINES_COUNT}">${rows}</li>`;
}

function createRemarkBlankLinesLi(section: string, doc: Document): HTMLLIElement {
  const wrap = doc.createElement('div');
  wrap.innerHTML = buildContractRemarkBlankLinesHtml(section);
  const li = wrap.firstElementChild;
  if (!(li instanceof HTMLLIElement)) {
    const fallback = doc.createElement('li');
    fallback.className = CONTRACT_REMARK_BLANK_LINES_CLASS;
    fallback.setAttribute('data-section', section);
    fallback.setAttribute('data-blank-lines', String(CONTRACT_REMARK_BLANK_LINES_COUNT));
    for (let i = 0; i < CONTRACT_REMARK_BLANK_LINES_COUNT; i += 1) {
      const p = doc.createElement('p');
      p.className = CONTRACT_REMARK_BLANK_LINE_ROW_CLASS;
      p.setAttribute('style', REMARK_BLANK_LINE_STYLE);
      p.appendChild(doc.createTextNode('\u200b'));
      fallback.appendChild(p);
    }
    return fallback;
  }
  return li;
}

/** Курсор в конец блока (после последней линии) — далее Enter или «1.» для следующего пункта. */
export function placeCaretAtEndOfRemarkBlankLines(li: HTMLLIElement): void {
  const sel = window.getSelection();
  if (!sel) return;

  const lines = li.querySelectorAll(`.${CONTRACT_REMARK_BLANK_LINE_ROW_CLASS}`);
  const lastLine = lines[lines.length - 1] as HTMLElement | undefined;

  const range = document.createRange();
  if (lastLine) {
    const lastText = Array.from(lastLine.childNodes).find((n) => n.nodeType === Node.TEXT_NODE) as
      | Text
      | undefined;
    if (lastText) {
      range.setStart(lastText, lastText.length);
    } else {
      const tail = lastLine.ownerDocument.createTextNode('\u200b');
      lastLine.appendChild(tail);
      range.setStart(tail, tail.length);
    }
  } else {
    range.selectNodeContents(li);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
  try {
    li.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch {
    // ignore scroll errors in tests
  }
}

function insertBlankLinesInList(
  parentOl: HTMLOListElement,
  afterLi: HTMLLIElement | null,
  section: string
): void {
  const doc = parentOl.ownerDocument;
  const blankLi = createRemarkBlankLinesLi(section, doc);
  if (afterLi) {
    parentOl.insertBefore(blankLi, afterLi.nextSibling);
  } else {
    parentOl.appendChild(blankLi);
  }
  placeCaretAtEndOfRemarkBlankLines(blankLi);
}

/**
 * Вставляет 2 пустые строки в текущий договорный список (тот же ol), не прерывая нумерацию.
 */
export function insertContractRemarkBlankLinesInVisualEditor(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const anchorEl =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  const existingBlank = anchorEl?.closest(
    `li.${CONTRACT_REMARK_BLANK_LINES_CLASS}`
  ) as HTMLLIElement | null;

  if (existingBlank instanceof HTMLLIElement && editor.contains(existingBlank)) {
    const parentOl = existingBlank.parentElement;
    if (!(parentOl instanceof HTMLOListElement)) return false;
    const section = existingBlank.getAttribute('data-section') ?? '1';
    insertBlankLinesInList(parentOl, existingBlank, section);
    return true;
  }

  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);
  if (ctx) {
    const { li, section } = ctx;
    const parentOl = li.parentElement;
    if (!(parentOl instanceof HTMLOListElement)) return false;
    insertBlankLinesInList(parentOl, li, section);
    return true;
  }

  return false;
}

export function detectSectionForRemarkBlankLines(editor: HTMLElement | null): string {
  if (!editor) return '1';
  const sel = window.getSelection();
  const node = sel?.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
  return detectSectionNumber(editor, node);
}
