/** Многоуровневая нумерация договора (1.1, 1.1.1) — как в Word, через ol/li + CSS-счётчики. */

export const CONTRACT_LEGAL_LIST_CLASS = 'contractLegalList';

const LEADING_CLAUSE_NUMBER_RE = /^\s*\d+(?:\.\d+)*\.?\s*/;

export function stripLeadingClauseNumber(text: string): string {
  return text.replace(LEADING_CLAUSE_NUMBER_RE, '').trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildContractLegalListHtml(lines: string[], section: string): string {
  const sec = escapeHtml(section);
  const items = lines
    .map((line) => stripLeadingClauseNumber(line))
    .filter(Boolean)
    .map((line) => `  <li data-section="${sec}">${escapeHtml(line || 'Текст пункта')}</li>`)
    .join('\n');
  return `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="${sec}">\n${items}\n</ol>`;
}

export function detectSectionNumber(editor: HTMLElement, fromNode: Node | null): string {
  let node: Node | null = fromNode && editor.contains(fromNode) ? fromNode : null;
  while (node && node !== editor) {
    if (node instanceof HTMLElement) {
      const list = node.closest?.(`.${CONTRACT_LEGAL_LIST_CLASS}`);
      if (list instanceof HTMLOListElement) {
        const section = list.getAttribute('data-section');
        if (section) return section;
      }
      if (node.tagName === 'H1' || node.tagName === 'H2') {
        const m = (node.textContent ?? '').trim().match(/^(\d+)\s*[.)]/);
        if (m) return m[1];
      }
    }
    node = node.parentNode;
  }

  const headings = Array.from(editor.querySelectorAll('h1, h2'));
  for (let i = headings.length - 1; i >= 0; i -= 1) {
    const m = (headings[i].textContent ?? '').trim().match(/^(\d+)\s*[.)]/);
    if (m) return m[1];
  }
  return '1';
}

export type ContractLegalListContext = {
  rootOl: HTMLOListElement;
  li: HTMLLIElement;
  depth: 1 | 2;
  section: string;
};

function findRootContractLegalList(li: HTMLLIElement): HTMLOListElement | null {
  const parentOl = li.parentElement;
  if (
    !(parentOl instanceof HTMLOListElement) ||
    !parentOl.classList.contains(CONTRACT_LEGAL_LIST_CLASS)
  ) {
    return null;
  }

  let root: HTMLOListElement = parentOl;
  for (;;) {
    const parentLi = root.parentElement;
    if (!(parentLi instanceof HTMLLIElement)) break;
    const outerOl: HTMLOListElement | null = parentLi.closest(`ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    if (!(outerOl instanceof HTMLOListElement) || outerOl === root) break;
    root = outerOl;
  }
  return root;
}

export function getContractLegalListContext(
  editor: HTMLElement,
  node: Node | null
): ContractLegalListContext | null {
  if (!node || !editor.contains(node)) return null;

  const li = (node instanceof Element ? node : node.parentElement)?.closest('li');
  if (!(li instanceof HTMLLIElement)) return null;

  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement)) return null;

  const rootOl = findRootContractLegalList(li);
  if (!rootOl) return null;

  const depth: 1 | 2 = parentOl === rootOl ? 1 : 2;

  const section = rootOl.getAttribute('data-section') ?? detectSectionNumber(editor, node);

  return { rootOl, li, depth, section };
}

function ensureSectionOnList(ol: HTMLOListElement, section: string): void {
  ol.classList.add(CONTRACT_LEGAL_LIST_CLASS);
  ol.setAttribute('data-section', section);
}

function stampSectionOnLi(li: HTMLLIElement, section: string): void {
  li.setAttribute('data-section', section);
}

function createList(section: string): HTMLOListElement {
  const ol = document.createElement('ol');
  ensureSectionOnList(ol, section);
  return ol;
}

function createListItem(text: string, section: string): HTMLLIElement {
  const li = document.createElement('li');
  stampSectionOnLi(li, section);
  li.textContent = stripLeadingClauseNumber(text) || 'Текст пункта';
  return li;
}

/** Синхронизирует data-section на ol и всех li (для CSS ::before). */
export function syncContractLegalListSection(rootOl: HTMLOListElement, section: string): void {
  ensureSectionOnList(rootOl, section);
  rootOl.querySelectorAll('li').forEach((node) => {
    if (node instanceof HTMLLIElement) stampSectionOnLi(node, section);
  });
  rootOl.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (node instanceof HTMLOListElement) ensureSectionOnList(node, section);
  });
}

function placeCaretInLi(li: HTMLLIElement, atEnd = true): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (li.firstChild?.nodeType === Node.TEXT_NODE) {
    const textNode = li.firstChild;
    const len = textNode.textContent?.length ?? 0;
    range.setStart(textNode, atEnd ? len : 0);
  } else {
    const text = document.createTextNode('');
    li.appendChild(text);
    range.setStart(text, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function splitLiAtSelection(li: HTMLLIElement, range: Range): HTMLLIElement | null {
  if (range.collapsed || !li.contains(range.commonAncestorContainer)) return null;

  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(li);
  afterRange.setStart(range.endContainer, range.endOffset);
  const afterText = afterRange.toString().trim();
  if (!afterText) return null;

  const newLi = document.createElement('li');
  const section = li.getAttribute('data-section');
  if (section) stampSectionOnLi(newLi, section);
  newLi.appendChild(afterRange.extractContents());
  li.parentElement?.insertBefore(newLi, li.nextSibling);
  return newLi;
}

function exitListToParagraph(li: HTMLLIElement, parentOl: HTMLOListElement): void {
  const parent = parentOl.parentElement;
  li.remove();

  const p = document.createElement('p');
  p.setAttribute('style', 'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;');
  p.textContent = '';

  if (parentOl.children.length === 0) {
    parent?.insertBefore(p, parentOl);
    parentOl.remove();
  } else {
    parent?.insertBefore(p, parentOl.nextSibling);
  }

  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(p);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Вставка / продолжение списка (кнопки 1.1 и 1.1.1). */
export function applyContractLegalListInVisualEditor(
  editor: HTMLElement,
  targetDepth: 1 | 2,
  options?: { placeholder?: string }
): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  const placeholder = options?.placeholder ?? 'Текст пункта';
  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);

  if (ctx) {
    const { rootOl, li, depth, section } = ctx;
    const parentOl = li.parentElement;
    if (!(parentOl instanceof HTMLOListElement)) return;

    if (targetDepth === 2 && depth === 1) {
      let innerOl = li.querySelector(`:scope > ol.${CONTRACT_LEGAL_LIST_CLASS}`);
      if (!(innerOl instanceof HTMLOListElement)) {
        innerOl = createList(section);
        li.appendChild(innerOl);
      }
      const text = range.collapsed ? placeholder : stripLeadingClauseNumber(range.toString());
      if (!range.collapsed) range.deleteContents();
      const newLi = createListItem(text, section);
      innerOl.appendChild(newLi);
      placeCaretInLi(newLi);
      return;
    }

    if (targetDepth === 1 && depth === 2) {
      const outerLi = parentOl.parentElement;
      if (outerLi instanceof HTMLLIElement && rootOl.contains(outerLi)) {
        const text = range.collapsed ? placeholder : stripLeadingClauseNumber(range.toString());
        if (!range.collapsed) range.deleteContents();
        const newLi = createListItem(text, section);
        rootOl.insertBefore(newLi, outerLi.nextSibling);
        li.remove();
        if (parentOl.children.length === 0) parentOl.remove();
        placeCaretInLi(newLi);
        return;
      }
    }

    const text = range.collapsed
      ? placeholder
      : stripLeadingClauseNumber(range.toString()) || placeholder;
    if (!range.collapsed) range.deleteContents();
    splitLiAtSelection(li, range);
    const newLi = createListItem(text, section);
    parentOl.insertBefore(newLi, li.nextSibling);
    placeCaretInLi(newLi);
    return;
  }

  const section = detectSectionNumber(editor, range.commonAncestorContainer);
  const lines = collectLinesFromRange(range);

  if (!range.collapsed && lines.length > 1) {
    insertLegalListAtRange(range, section, lines, targetDepth, placeholder);
    return;
  }

  const text = range.collapsed
    ? placeholder
    : (lines[0] ?? stripLeadingClauseNumber(range.toString())) || placeholder;
  if (!range.collapsed) range.deleteContents();

  const ol = createList(section);
  const li = createListItem(text, section);
  ol.appendChild(li);

  if (targetDepth === 2) {
    const innerOl = createList(section);
    const innerLi = createListItem(placeholder, section);
    li.textContent = '';
    innerOl.appendChild(innerLi);
    li.appendChild(innerOl);
    range.insertNode(ol);
    placeCaretInLi(innerLi);
  } else {
    range.insertNode(ol);
    placeCaretInLi(li);
  }
}

/** Tab / Shift+Tab — уровень вложенности. */
export function changeContractLegalListLevel(
  editor: HTMLElement,
  direction: 'indent' | 'outdent'
): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const ctx = getContractLegalListContext(editor, sel.getRangeAt(0).commonAncestorContainer);
  if (!ctx) return false;

  const { rootOl, li, depth, section } = ctx;

  if (direction === 'indent' && depth === 1) {
    const prev = li.previousElementSibling;
    if (!(prev instanceof HTMLLIElement)) return false;
    let innerOl = prev.querySelector(`:scope > ol.${CONTRACT_LEGAL_LIST_CLASS}`);
    if (!(innerOl instanceof HTMLOListElement)) {
      innerOl = createList(section);
      prev.appendChild(innerOl);
    }
    innerOl.appendChild(li);
    placeCaretInLi(li);
    return true;
  }

  if (direction === 'outdent' && depth === 2) {
    const outerLi = li.parentElement?.parentElement;
    if (!(outerLi instanceof HTMLLIElement)) return false;
    rootOl.insertBefore(li, outerLi.nextSibling);
    const innerOl = li.parentElement;
    if (innerOl instanceof HTMLOListElement && innerOl.children.length === 0) {
      innerOl.remove();
    }
    placeCaretInLi(li);
    return true;
  }

  return false;
}

/** Enter — новый пункт; пустой пункт выходит из списка. */
export function handleContractLegalListEnter(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);
  if (!ctx) return false;

  const { li, depth, section } = ctx;
  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement)) return false;

  const liText = (li.textContent ?? '').replace(/\u200B/g, '').trim();
  if (!liText) {
    if (depth === 2) {
      const outerLi = parentOl.parentElement;
      li.remove();
      if (parentOl.children.length === 0) parentOl.remove();
      if (outerLi instanceof HTMLLIElement) {
        placeCaretInLi(outerLi);
      }
    } else {
      exitListToParagraph(li, parentOl);
    }
    return true;
  }

  const split = splitLiAtSelection(li, range);
  if (split) {
    placeCaretInLi(split, false);
  } else {
    const newLi = createListItem('', ctx.section);
    parentOl.insertBefore(newLi, li.nextSibling);
    placeCaretInLi(newLi, false);
  }
  return true;
}

function collectLinesFromRange(range: Range): string[] {
  if (range.collapsed) return [];

  const fragment = range.cloneContents();
  const blocks = fragment.querySelectorAll('p, div, li, h1, h2, h3, h4');
  if (blocks.length > 0) {
    return Array.from(blocks)
      .map((el) => stripLeadingClauseNumber(el.textContent ?? ''))
      .filter((line) => line.length > 0);
  }

  return range
    .toString()
    .split(/\r?\n/)
    .map((line) => stripLeadingClauseNumber(line))
    .filter(Boolean);
}

function insertLegalListAtRange(
  range: Range,
  section: string,
  lines: string[],
  targetDepth: 1 | 2,
  placeholder: string
): void {
  const ol = createList(section);
  const items = lines.length > 0 ? lines : [placeholder];

  if (targetDepth === 2 && items.length === 1) {
    const outerLi = document.createElement('li');
    const innerOl = createList(section);
    innerOl.appendChild(createListItem(items[0], section));
    outerLi.appendChild(innerOl);
    ol.appendChild(outerLi);
    range.deleteContents();
    range.insertNode(ol);
    placeCaretInLi(innerOl.firstElementChild as HTMLLIElement);
    return;
  }

  items.forEach((line) => ol.appendChild(createListItem(line, section)));
  range.deleteContents();
  range.insertNode(ol);
  const lastLi = ol.lastElementChild;
  if (lastLi instanceof HTMLLIElement) placeCaretInLi(lastLi);
}

export function isNodeInsideContractLegalList(editor: HTMLElement, node: Node | null): boolean {
  return getContractLegalListContext(editor, node) !== null;
}
