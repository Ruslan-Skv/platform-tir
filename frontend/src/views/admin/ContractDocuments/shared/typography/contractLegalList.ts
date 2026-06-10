import {
  CONTRACT_REMARK_BLANK_LINES_CLASS,
  CONTRACT_REMARK_BLANK_LINE_ROW_CLASS,
} from './contractTemplateRemarkBlankLines';

/**
 * Многоуровневая нумерация договора через ol/li + CSS-счётчики.
 * clause: пункты 1, 2, 3…; подпункты 1.1, 1.2…
 * section: под раздел H2 «2.» — пункты 2.1, 2.2… (договорные главы).
 */

export const CONTRACT_LEGAL_LIST_CLASS = 'contractLegalList';

export const CONTRACT_LEGAL_LIST_NUMBERING_CLAUSE = 'clause';
export const CONTRACT_LEGAL_LIST_NUMBERING_SECTION = 'section';
export const CONTRACT_LEGAL_LIST_NUMBERING_ATTR = 'data-numbering';

/** Устаревший маркер в старых шаблонах; новые пункты создаются пустыми. */
export const CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER = 'Текст пункта';

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

function directLiChildren(ol: HTMLOListElement): HTMLLIElement[] {
  return Array.from(ol.children).filter((n): n is HTMLLIElement => n instanceof HTMLLIElement);
}

function firstNestedContractLegalOl(li: HTMLLIElement): HTMLOListElement | null {
  for (const child of li.children) {
    if (child instanceof HTMLOListElement && child.classList.contains(CONTRACT_LEGAL_LIST_CLASS)) {
      return child;
    }
  }
  return null;
}

export function detectContractLegalListNumbering(section: string): 'clause' | 'section' {
  return parseContractLegalSectionNumber(section) > 1
    ? CONTRACT_LEGAL_LIST_NUMBERING_SECTION
    : CONTRACT_LEGAL_LIST_NUMBERING_CLAUSE;
}

export function buildContractLegalListHtml(lines: string[], section: string): string {
  const sec = escapeHtml(section);
  const numbering = detectContractLegalListNumbering(section);
  const itemLines = lines
    .map((line) => stripLeadingClauseNumber(line))
    .filter((line) => line.length > 0);
  const items = (itemLines.length > 0 ? itemLines : [''])
    .map((line) => `  <li data-section="${sec}">${escapeHtml(line)}</li>`)
    .join('\n');
  return `<ol class="${CONTRACT_LEGAL_LIST_CLASS}" data-section="${sec}" ${CONTRACT_LEGAL_LIST_NUMBERING_ATTR}="${numbering}">\n${items}\n</ol>`;
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

/** Текст пункта без вложенных ol/ul (иначе Enter в пустом подпункте «видит» соседей). */
export function getContractLegalLiDirectText(li: HTMLLIElement): string {
  let text = '';
  for (const node of li.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      continue;
    }
    if (node instanceof HTMLElement) {
      const tag = node.tagName;
      if (tag === 'OL' || tag === 'UL') continue;
      text += node.textContent ?? '';
    }
  }
  return text.replace(/\u200B/g, '').trim();
}

export function isContractLegalListPlaceholderText(text: string): boolean {
  return stripLeadingClauseNumber(text) === CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER;
}

export function isContractLegalLiEffectivelyEmpty(li: HTMLLIElement): boolean {
  if (li.classList.contains(CONTRACT_REMARK_BLANK_LINES_CLASS)) return false;
  const direct = getContractLegalLiDirectText(li);
  return direct.length === 0 || direct === CONTRACT_LEGAL_LIST_ITEM_PLACEHOLDER;
}

/** Внешний ol.contractLegalList (не ближайший — у вложенных подпунктов он тоже с классом). */
function findRootContractLegalList(li: HTMLLIElement): HTMLOListElement | null {
  let root: HTMLOListElement | null = null;
  let node: Node | null = li.parentElement;
  while (node) {
    if (node instanceof HTMLOListElement && node.classList.contains(CONTRACT_LEGAL_LIST_CLASS)) {
      root = node;
    }
    node = node.parentElement;
  }
  return root;
}

function ensureContractLegalListOlChain(li: HTMLLIElement, rootOl: HTMLOListElement): void {
  const section = rootOl.getAttribute('data-section') ?? '1';
  let ol: HTMLOListElement | null =
    li.parentElement instanceof HTMLOListElement ? li.parentElement : null;
  while (ol && rootOl.contains(ol)) {
    ensureSectionOnList(ol, section);
    if (ol === rootOl) break;
    const parentLi = ol.parentElement;
    ol =
      parentLi instanceof HTMLLIElement
        ? parentLi.parentElement instanceof HTMLOListElement
          ? parentLi.parentElement
          : null
        : null;
  }
}

export function getContractLegalListContext(
  editor: HTMLElement,
  node: Node | null
): ContractLegalListContext | null {
  if (!node || !editor.contains(node)) return null;

  const li = (node instanceof Element ? node : node.parentElement)?.closest('li');
  if (!(li instanceof HTMLLIElement)) return null;

  const rootOl = findRootContractLegalList(li);
  if (!rootOl || !editor.contains(rootOl)) return null;

  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement) || !rootOl.contains(parentOl)) return null;

  ensureContractLegalListOlChain(li, rootOl);

  const depth: 1 | 2 = parentOl === rootOl ? 1 : 2;
  const section = rootOl.getAttribute('data-section') ?? detectSectionNumber(editor, node);

  return { rootOl, li, depth, section };
}

function ensureSectionOnList(
  ol: HTMLOListElement,
  section: string,
  numbering?: 'clause' | 'section'
): void {
  ol.classList.add(CONTRACT_LEGAL_LIST_CLASS);
  ol.setAttribute('data-section', section);
  const mode = numbering ?? detectContractLegalListNumbering(section);
  ol.setAttribute(CONTRACT_LEGAL_LIST_NUMBERING_ATTR, mode);
}

function ensureNestedListInheritsFromParent(
  innerOl: HTMLOListElement,
  parentRootOl: HTMLOListElement
): void {
  const section = parentRootOl.getAttribute('data-section') ?? '1';
  const numbering = parentRootOl.getAttribute(CONTRACT_LEGAL_LIST_NUMBERING_ATTR) as
    | 'clause'
    | 'section'
    | null;
  ensureSectionOnList(innerOl, section, numbering ?? detectContractLegalListNumbering(section));
}

function stampSectionOnLi(li: HTMLLIElement, section: string): void {
  li.setAttribute('data-section', section);
}

function createList(section: string, numbering?: 'clause' | 'section'): HTMLOListElement {
  const ol = document.createElement('ol');
  ensureSectionOnList(ol, section, numbering);
  return ol;
}

function createListItem(text: string, section: string): HTMLLIElement {
  const li = document.createElement('li');
  stampSectionOnLi(li, section);
  const stripped = stripLeadingClauseNumber(text);
  if (stripped) {
    li.textContent = stripped;
  }
  return li;
}

/** Синхронизирует data-section на ol и всех li (для CSS ::before). */
export function syncContractLegalListSection(rootOl: HTMLOListElement, section: string): void {
  const numbering =
    (rootOl.getAttribute(CONTRACT_LEGAL_LIST_NUMBERING_ATTR) as 'clause' | 'section' | null) ??
    detectContractLegalListNumbering(section);
  ensureSectionOnList(rootOl, section, numbering);
  rootOl.querySelectorAll('li').forEach((node) => {
    if (node instanceof HTMLLIElement) stampSectionOnLi(node, section);
  });
  rootOl.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (node instanceof HTMLOListElement) ensureSectionOnList(node, section, numbering);
  });
}

function stripTrailingBreaksFromLi(li: HTMLLIElement): void {
  while (li.lastChild) {
    if (li.lastChild instanceof HTMLBRElement) {
      li.lastChild.remove();
      continue;
    }
    if (li.lastChild.nodeType === Node.TEXT_NODE && !(li.lastChild.textContent ?? '').trim()) {
      li.lastChild.remove();
      continue;
    }
    break;
  }
}

function placeCaretInLi(li: HTMLLIElement, atEnd = true): void {
  const sel = window.getSelection();
  if (!sel) return;

  let textNode: Text | null = null;
  for (const node of li.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) textNode = node as Text;
  }
  if (!textNode) {
    textNode = document.createTextNode('');
    li.appendChild(textNode);
  }

  const range = document.createRange();
  const offset = atEnd ? (textNode.textContent?.length ?? 0) : 0;
  range.setStart(textNode, offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function isCaretAtEndOfLi(li: HTMLLIElement, range: Range): boolean {
  if (!li.contains(range.commonAncestorContainer)) return false;
  const probe = document.createRange();
  probe.selectNodeContents(li);
  probe.setStart(range.endContainer, range.endOffset);
  const tail = probe.toString().replace(/\u200B/g, '');
  return tail.trim().length === 0;
}

function isCaretInsideTable(node: Node | null): boolean {
  if (!node) return false;
  const el = node instanceof Element ? node : node.parentElement;
  return Boolean(el?.closest('table'));
}

/** Хвост пункта после курсора содержит таблицу/вложенный список — не переносить в новый 1.3. */
function tailAfterCaretHasBlockContent(li: HTMLLIElement, range: Range): boolean {
  if (!li.contains(range.commonAncestorContainer)) return false;
  const probe = document.createRange();
  probe.selectNodeContents(li);
  probe.setStart(range.endContainer, range.endOffset);
  const fragment = probe.cloneContents();
  return Boolean(fragment.querySelector('table, ol, ul'));
}

function insertEmptyListItemAfter(
  parentOl: HTMLOListElement,
  afterLi: HTMLLIElement,
  section: string,
  range?: Range
): HTMLLIElement {
  if (range && isCaretAtEndOfLi(afterLi, range)) {
    stripTrailingBreaksFromLi(afterLi);
  }
  const newLi = createListItem('', section);
  parentOl.insertBefore(newLi, afterLi.nextSibling);
  placeCaretInLi(newLi, false);
  try {
    newLi.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  } catch {
    // ignore scroll errors in non-DOM environments
  }
  return newLi;
}

function splitLiAtSelection(li: HTMLLIElement, range: Range): HTMLLIElement | null {
  if (range.collapsed || !li.contains(range.commonAncestorContainer)) return null;
  if (isCaretInsideTable(range.commonAncestorContainer)) return null;
  if (tailAfterCaretHasBlockContent(li, range)) return null;

  const afterRange = range.cloneRange();
  afterRange.selectNodeContents(li);
  afterRange.setStart(range.endContainer, range.endOffset);
  const afterText = afterRange.toString().trim();
  if (!afterText) return null;

  const newLi = document.createElement('li');
  const section = li.getAttribute('data-section');
  if (section) stampSectionOnLi(newLi, section);
  newLi.appendChild(afterRange.extractContents());
  if (newLi.querySelector('table, ol, ul')) {
    newLi.remove();
    return null;
  }
  li.parentElement?.insertBefore(newLi, li.nextSibling);
  return newLi;
}

function focusParagraph(p: HTMLParagraphElement): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(p);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
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

  focusParagraph(p);
}

function exitListToParagraphAfterRoot(rootOl: HTMLOListElement): void {
  const p = document.createElement('p');
  p.setAttribute('style', 'text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;');
  p.textContent = '';
  rootOl.parentElement?.insertBefore(p, rootOl.nextSibling);
  focusParagraph(p);
}

function parseContractLegalSectionNumber(section: string): number {
  const n = Number.parseInt(section, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Следующий пункт верхнего уровня (2., 3. …) в том же списке. */
export function insertNextContractLegalRootClause(ctx: ContractLegalListContext): void {
  const { rootOl, li, depth, section } = ctx;
  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement)) return;

  const anchorLi = depth === 2 ? parentOl.parentElement : li;
  if (!(anchorLi instanceof HTMLLIElement) || !rootOl.contains(anchorLi)) return;

  const newLi = createListItem('', section);
  rootOl.insertBefore(newLi, anchorLi.nextSibling);
  placeCaretInLi(newLi, false);
}

/** Удалить пустой/служебный пункт 1.x и вернуть курсор в предыдущий пункт или за список. */
function removeEmptyRootListItem(ctx: ContractLegalListContext): boolean {
  const { rootOl, li } = ctx;
  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement) || parentOl !== rootOl) return false;
  if (!isContractLegalLiEffectivelyEmpty(li)) return false;

  const prev = li.previousElementSibling;
  li.remove();

  if (parentOl.children.length === 0) {
    exitListToParagraphAfterRoot(rootOl);
    return true;
  }
  if (prev instanceof HTMLLIElement) {
    placeCaretInLi(prev, true);
    return true;
  }
  const first = parentOl.firstElementChild;
  if (first instanceof HTMLLIElement) {
    placeCaretInLi(first, false);
    return true;
  }
  return true;
}

/** Вставка / продолжение списка (кнопки 1.1 и 1.1.1). */
export function applyContractLegalListInVisualEditor(
  editor: HTMLElement,
  targetDepth: 1 | 2,
  _options?: { placeholder?: string }
): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);

  if (ctx) {
    const { rootOl, li, depth, section } = ctx;
    const parentOl = li.parentElement;
    if (!(parentOl instanceof HTMLOListElement)) return;

    if (targetDepth === 2 && depth === 1) {
      let innerOl = firstNestedContractLegalOl(li);
      if (!(innerOl instanceof HTMLOListElement)) {
        innerOl = createList(section);
        ensureNestedListInheritsFromParent(innerOl, rootOl);
        li.appendChild(innerOl);
      }
      const text = range.collapsed ? '' : stripLeadingClauseNumber(range.toString());
      if (!range.collapsed) range.deleteContents();
      const newLi = createListItem(text, section);
      innerOl.appendChild(newLi);
      placeCaretInLi(newLi);
      return;
    }

    if (targetDepth === 1 && depth === 2) {
      const outerLi = parentOl.parentElement;
      if (outerLi instanceof HTMLLIElement && rootOl.contains(outerLi)) {
        const text = range.collapsed ? '' : stripLeadingClauseNumber(range.toString());
        if (!range.collapsed) range.deleteContents();
        const newLi = createListItem(text, section);
        rootOl.insertBefore(newLi, outerLi.nextSibling);
        li.remove();
        if (parentOl.children.length === 0) parentOl.remove();
        placeCaretInLi(newLi);
        return;
      }
    }

    const text = range.collapsed ? '' : stripLeadingClauseNumber(range.toString());
    if (!range.collapsed) range.deleteContents();
    splitLiAtSelection(li, range);
    const newLi = createListItem(text, section);
    parentOl.insertBefore(newLi, li.nextSibling);
    placeCaretInLi(newLi);
    return;
  }

  const section = detectSectionNumber(editor, range.commonAncestorContainer);
  const numbering = detectContractLegalListNumbering(section);
  const lines = collectLinesFromRange(range);

  if (!range.collapsed && lines.length > 1) {
    insertLegalListAtRange(range, section, lines, targetDepth, numbering);
    return;
  }

  const text = range.collapsed ? '' : (lines[0] ?? stripLeadingClauseNumber(range.toString()));
  if (!range.collapsed) range.deleteContents();

  const ol = createList(section, numbering);
  const li = createListItem(text, section);
  ol.appendChild(li);

  if (targetDepth === 2) {
    const innerOl = createList(section, numbering);
    ensureNestedListInheritsFromParent(innerOl, ol);
    const innerLi = createListItem('', section);
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

function promoteContractLegalListItemToRootLevel(ctx: ContractLegalListContext): boolean {
  const { rootOl, li } = ctx;
  const innerOl = li.parentElement;
  if (!(innerOl instanceof HTMLOListElement) || innerOl === rootOl) return false;

  const outerLi = innerOl.parentElement;
  if (!(outerLi instanceof HTMLLIElement) || !rootOl.contains(outerLi)) return false;

  rootOl.insertBefore(li, outerLi.nextSibling);
  if (innerOl.children.length === 0) innerOl.remove();
  placeCaretInLi(li);
  return true;
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

  const { li, depth, section } = ctx;

  if (li.classList.contains(CONTRACT_REMARK_BLANK_LINES_CLASS)) {
    return false;
  }

  if (direction === 'indent' && depth === 1) {
    const parentOl = li.parentElement;
    const rootOl = findRootContractLegalList(li);
    const prev = li.previousElementSibling;
    if (!(prev instanceof HTMLLIElement)) return false;

    if (
      parentOl instanceof HTMLOListElement &&
      rootOl &&
      parentOl === rootOl &&
      looksLikeActRootSectionTwo(getContractLegalLiDirectText(li))
    ) {
      return false;
    }

    const prevInner = firstNestedContractLegalOl(prev);
    if (
      parentOl instanceof HTMLOListElement &&
      rootOl &&
      parentOl === rootOl &&
      prevInner &&
      directLiChildren(prevInner).length > 0
    ) {
      return false;
    }

    let innerOl = prevInner;
    if (!(innerOl instanceof HTMLOListElement)) {
      const rootOl = findRootContractLegalList(li);
      innerOl = createList(section);
      if (rootOl) ensureNestedListInheritsFromParent(innerOl, rootOl);
      prev.appendChild(innerOl);
    }
    innerOl.appendChild(li);
    placeCaretInLi(li);
    return true;
  }

  if (direction === 'outdent' && depth === 2) {
    return promoteContractLegalListItemToRootLevel(ctx);
  }

  if (direction === 'outdent' && depth === 1) {
    const parentOl = li.parentElement;
    if (parentOl instanceof HTMLOListElement && parentOl.children.length <= 1) {
      return false;
    }
    return removeEmptyRootListItem(ctx);
  }

  return false;
}

/** Курсор в начале редактируемой части пункта (без учёта вложенных ol/ul). */
function isCaretAtStartOfDirectLiContent(li: HTMLLIElement, range: Range): boolean {
  if (!li.contains(range.commonAncestorContainer)) return false;

  for (const node of li.childNodes) {
    if (node instanceof HTMLOListElement || node instanceof HTMLUListElement) {
      if (node.contains(range.commonAncestorContainer)) {
        return false;
      }
      continue;
    }
    const inNode =
      node === range.commonAncestorContainer ||
      (node instanceof HTMLElement && node.contains(range.commonAncestorContainer));
    if (!inNode) continue;

    const probe = document.createRange();
    if (node.nodeType === Node.TEXT_NODE) {
      probe.setStart(node, 0);
      probe.setEnd(range.startContainer, range.startOffset);
    } else if (node instanceof HTMLElement) {
      probe.selectNodeContents(node);
      probe.setEnd(range.startContainer, range.startOffset);
    } else {
      continue;
    }
    return probe.toString().replace(/\u200B/g, '').length === 0;
  }

  const probe = document.createRange();
  probe.setStart(li, 0);
  probe.setEnd(range.startContainer, range.startOffset);
  return probe.toString().replace(/\u200B/g, '').length === 0;
}

/** Enter — новый пункт; пустой подпункт поднимает уровень или выходит из списка. */
export function handleContractLegalListEnter(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);
  if (!ctx) return false;

  const { li, depth } = ctx;
  const parentOl = li.parentElement;
  if (!(parentOl instanceof HTMLOListElement)) return false;

  if (li.classList.contains(CONTRACT_REMARK_BLANK_LINES_CLASS)) {
    insertEmptyListItemAfter(parentOl, li, ctx.section, range);
    return true;
  }

  if (isContractLegalLiEffectivelyEmpty(li)) {
    if (depth === 2) {
      const { rootOl } = ctx;
      const outerLi = parentOl.parentElement;
      const prev = li.previousElementSibling;
      const isLastInNested = li.nextElementSibling === null;

      li.remove();
      if (parentOl.children.length === 0) parentOl.remove();

      if (isLastInNested) {
        exitListToParagraphAfterRoot(rootOl);
      } else if (prev instanceof HTMLLIElement) {
        placeCaretInLi(prev, true);
      } else if (outerLi instanceof HTMLLIElement) {
        placeCaretInLi(outerLi, false);
      }
      return true;
    }
    exitListToParagraph(li, parentOl);
    return true;
  }

  if (isCaretInsideTable(range.commonAncestorContainer)) {
    insertEmptyListItemAfter(parentOl, li, ctx.section, range);
    return true;
  }

  const split = splitLiAtSelection(li, range);
  if (split) {
    placeCaretInLi(split, false);
  } else {
    insertEmptyListItemAfter(parentOl, li, ctx.section, range);
  }
  return true;
}

/** Shift+Enter — следующий пункт верхнего уровня (2., 3. …) в том же списке. */
export function handleContractLegalListShiftEnter(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);
  if (!ctx) return false;

  insertNextContractLegalRootClause(ctx);
  return true;
}

/** Backspace: пустой пункт 1.x — удалить; подпункт — поднять уровень. */
export function handleContractLegalListBackspace(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const ctx = getContractLegalListContext(editor, range.commonAncestorContainer);
  if (!ctx) return false;

  const { li, depth, rootOl } = ctx;

  if (li.classList.contains(CONTRACT_REMARK_BLANK_LINES_CLASS)) {
    const parentOl = li.parentElement;
    li.remove();
    const focus =
      (parentOl?.querySelector(
        `li.${CONTRACT_REMARK_BLANK_LINES_CLASS}`
      ) as HTMLLIElement | null) ??
      (parentOl?.querySelector(
        `li:not(.${CONTRACT_REMARK_BLANK_LINES_CLASS})`
      ) as HTMLLIElement | null);
    if (focus) {
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(focus);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    return true;
  }

  if (depth === 2) {
    if (isContractLegalLiEffectivelyEmpty(li) && isCaretAtStartOfDirectLiContent(li, range)) {
      return promoteContractLegalListItemToRootLevel(ctx);
    }
    return false;
  }

  if (isContractLegalLiEffectivelyEmpty(li)) {
    const parentOl = li.parentElement;
    if (
      parentOl instanceof HTMLOListElement &&
      parentOl === rootOl &&
      parentOl.children.length <= 1
    ) {
      return false;
    }
    return removeEmptyRootListItem(ctx);
  }

  if (isCaretAtStartOfDirectLiContent(li, range)) {
    if (!isContractLegalLiEffectivelyEmpty(li)) {
      return false;
    }
    const prev = li.previousElementSibling;
    if (prev instanceof HTMLLIElement) {
      placeCaretInLi(prev, true);
      return true;
    }
  }

  return false;
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
  numbering?: 'clause' | 'section'
): void {
  const ol = createList(section, numbering);
  const items = lines.length > 0 ? lines : [''];

  if (targetDepth === 2 && items.length === 1) {
    const outerLi = document.createElement('li');
    const innerOl = createList(section, numbering);
    ensureNestedListInheritsFromParent(innerOl, ol);
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

const TEMPLATE_EDITOR_FRAGMENT_COMMENT_RE = /StartFragment|EndFragment/i;

function stripTemplateEditorFragmentComments(root: ParentNode): void {
  const doc = root.ownerDocument ?? document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const toRemove: Comment[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node instanceof Comment && TEMPLATE_EDITOR_FRAGMENT_COMMENT_RE.test(node.data)) {
      toRemove.push(node);
    }
  }
  toRemove.forEach((c) => c.remove());
}

function flattenInvalidHeadingNesting(root: HTMLElement): void {
  root.querySelectorAll('h2').forEach((h2) => {
    const h3 = h2.querySelector(':scope > h3');
    if (!h3) return;
    const h2Text = (h2.textContent ?? '').replace(/\s+/g, ' ').trim();
    const h3Text = (h3.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (h2Text && h3Text && h2Text === h3Text) {
      h2.replaceWith(h3.cloneNode(true));
    }
  });
}

function introTextFromListItem(li: HTMLLIElement, legalOl: HTMLOListElement): string {
  const parts: string[] = [];
  for (const node of li.childNodes) {
    if (node === legalOl) continue;
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) parts.push(t);
      continue;
    }
    if (node instanceof HTMLElement && node.tagName !== 'OL' && node.tagName !== 'UL') {
      const t = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (t) parts.push(t);
    }
  }
  return parts.join(' ').trim();
}

const ACT_INTRO_LINE_RE = /Исполнитель передал|Заказчик принял/i;
const ACT_SECTION2_LINE_RE = /При приёмке|установлено:/i;

function isActIntroLineText(text: string): boolean {
  return ACT_INTRO_LINE_RE.test(text.replace(/\s+/g, ' ').trim());
}

function looksLikeActRootSectionTwo(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 0 && ACT_SECTION2_LINE_RE.test(t);
}

/**
 * Только плоский акт из Word (1 + 1.1 + 1.2 в одном ol) или явный intro из абзаца.
 * Не сливает готовые разделы 1 и 2 с подпунктами.
 */
function ensureIntroItemWithNestedSubclauses(legalOl: HTMLOListElement, intro?: string): void {
  const introNorm = (intro ?? '').replace(/\s+/g, ' ').trim();
  const items = directLiChildren(legalOl);
  if (items.length === 0) return;

  const hasExplicitIntro = introNorm.length > 0;

  if (!hasExplicitIntro) {
    if (items.length !== 3) return;
    if (items.some((item) => firstNestedContractLegalOl(item))) return;
    if (!isActIntroLineText(getContractLegalLiDirectText(items[0]))) return;
  } else {
    if (items.length === 1 && firstNestedContractLegalOl(items[0])) {
      const direct = getContractLegalLiDirectText(items[0]).replace(/\s+/g, ' ').trim();
      if (direct.includes(introNorm) || isActIntroLineText(direct)) return;
    }
    if (items.length > 1 && items.some((item) => firstNestedContractLegalOl(item))) return;
  }

  let introText = introNorm;
  let subItems = [...items];

  if (!introText) {
    const firstText = getContractLegalLiDirectText(items[0]).replace(/\s+/g, ' ').trim();
    if (!isActIntroLineText(firstText)) return;
    introText = firstText;
    subItems = items.slice(1);
  } else {
    const firstText = getContractLegalLiDirectText(items[0]).replace(/\s+/g, ' ').trim();
    if (
      firstText === introText ||
      firstText.startsWith(introText) ||
      (firstText && introText && firstText.includes(introNorm))
    ) {
      subItems = items.slice(1);
    }
  }

  if (!introText || subItems.length === 0) return;

  const section = legalOl.getAttribute('data-section') ?? '1';
  const numbering =
    (legalOl.getAttribute(CONTRACT_LEGAL_LIST_NUMBERING_ATTR) as 'clause' | 'section' | null) ??
    detectContractLegalListNumbering(section);

  const innerOl = legalOl.ownerDocument.createElement('ol');
  ensureSectionOnList(innerOl, section, numbering);
  subItems.forEach((item) => innerOl.appendChild(item));

  const introLi = legalOl.ownerDocument.createElement('li');
  stampSectionOnLi(introLi, section);
  introLi.appendChild(legalOl.ownerDocument.createTextNode(introText));
  introLi.appendChild(innerOl);

  for (const child of directLiChildren(legalOl)) {
    child.remove();
  }
  legalOl.appendChild(introLi);
}

function isLikelyListIntroParagraph(text: string): boolean {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 160) return false;
  if (/^Мы,\s/i.test(t) || /^Настоящий\s/i.test(t) || /^Стороны\s/i.test(t)) return false;
  return /Исполнитель передал|Заказчик принял/i.test(t);
}

/** Абзац «Исполнитель передал…» перед списком → пункт 1.1 (не длинная преамбула «Мы, …»). */
function absorbIntroParagraphBeforeLegalList(root: HTMLElement): void {
  root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (!(node instanceof HTMLOListElement)) return;
    const legalOl = node;

    let prev = legalOl.previousElementSibling;
    while (prev instanceof HTMLParagraphElement && !(prev.textContent ?? '').trim()) {
      prev.remove();
      prev = legalOl.previousElementSibling;
    }
    if (!(prev instanceof HTMLParagraphElement)) return;

    const text = (prev.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (!isLikelyListIntroParagraph(text)) return;

    ensureIntroItemWithNestedSubclauses(legalOl, text);
    prev.remove();
  });
}

function ensureContractLegalListNumberingAttrs(root: HTMLElement): void {
  root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (!(node instanceof HTMLOListElement)) return;
    if (node.getAttribute(CONTRACT_LEGAL_LIST_NUMBERING_ATTR)) return;
    const section = node.getAttribute('data-section') ?? '1';
    ensureSectionOnList(node, section);
  });
}

/** Плоский список «ввод + 1.1 + 1.2» (три соседних li) → один пункт 1 с подпунктами. */
function restructureFlatActStyleList(root: HTMLElement): void {
  root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (!(node instanceof HTMLOListElement)) return;
    if (node.parentElement instanceof HTMLLIElement) return;
    const items = directLiChildren(node);
    if (items.length !== 3) return;
    if (items.some((item) => firstNestedContractLegalOl(item))) return;
    if (!isActIntroLineText(getContractLegalLiDirectText(items[0]))) return;
    ensureIntroItemWithNestedSubclauses(node);
  });
}

/**
 * Починка: пункт 2 с подпунктами ошибочно вложили в пункт 1 (Tab / старая нормализация).
 */
function repairMergedActRootSections(root: HTMLElement): void {
  root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
    if (!(node instanceof HTMLOListElement)) return;
    if (node.parentElement instanceof HTMLLIElement) return;

    const items = directLiChildren(node);
    if (items.length !== 1) return;

    const sectionOne = items[0];
    const olUnderOne = firstNestedContractLegalOl(sectionOne);
    if (!olUnderOne) return;

    for (const candidate of [...directLiChildren(olUnderOne)]) {
      if (!looksLikeActRootSectionTwo(getContractLegalLiDirectText(candidate))) continue;
      if (!firstNestedContractLegalOl(candidate)) continue;
      node.appendChild(candidate);

      const olUnderTwo = firstNestedContractLegalOl(candidate);
      if (!olUnderTwo) continue;

      const sub = directLiChildren(olUnderTwo);
      if (sub.length < 2) continue;

      const firstText = getContractLegalLiDirectText(sub[0]);
      const secondText = getContractLegalLiDirectText(sub[1]);
      const firstBelongsToSectionOne =
        /ПВХ|Спецификац/i.test(firstText) && /Монтаж|Счёт-заказ/i.test(secondText);
      if (!firstBelongsToSectionOne) continue;

      sub.slice(0, 2).forEach((item) => olUnderOne.appendChild(item));
    }
  });
}

function removeEmptyContractLegalLists(root: HTMLElement): void {
  let removed = true;
  while (removed) {
    removed = false;
    root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`).forEach((node) => {
      if (!(node instanceof HTMLOListElement)) return;
      if (node.children.length > 0) return;
      if (node.parentElement instanceof HTMLLIElement) return;
      node.remove();
      removed = true;
    });
  }
}

/** Снимает обёртку «обычный ol > li > ol.contractLegalList» (ломает курсор и нумерацию). */
function unwrapNestedContractLegalLists(root: HTMLElement): void {
  const nested = Array.from(root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS}`)).filter(
    (legalOl) => {
      const parentLi = legalOl.parentElement;
      if (!(parentLi instanceof HTMLLIElement)) return false;
      const outerOl = parentLi.parentElement;
      return (
        outerOl instanceof HTMLOListElement &&
        !outerOl.classList.contains(CONTRACT_LEGAL_LIST_CLASS)
      );
    }
  );

  for (const legalOl of nested) {
    const parentLi = legalOl.parentElement as HTMLLIElement;
    const outerOl = parentLi.parentElement as HTMLOListElement;
    const container = outerOl.parentElement;
    if (!container) continue;

    const intro = introTextFromListItem(parentLi, legalOl);
    legalOl.remove();
    container.insertBefore(legalOl, outerOl);
    outerOl.remove();

    if (intro) {
      ensureIntroItemWithNestedSubclauses(legalOl, intro);
    }
  }
}

/** Убирает устаревший «Текст пункта» из сохранённых шаблонов. */
function upgradeRemarkBlankLineRows(root: HTMLElement): void {
  root
    .querySelectorAll(
      `li.${CONTRACT_REMARK_BLANK_LINES_CLASS} p.${CONTRACT_REMARK_BLANK_LINE_ROW_CLASS}`
    )
    .forEach((node) => {
      if (!(node instanceof HTMLParagraphElement)) return;
      const text = (node.textContent ?? '').replace(/\u200B/g, '').trim();
      if (!text || text === '') {
        node.textContent = '\u200b';
      }
      const brOnly = node.querySelector(':scope > br') && !text;
      if (brOnly) {
        node.textContent = '\u200b';
      }
    });
}

function stripLegacyPlaceholderFromLegalListItems(root: HTMLElement): void {
  root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS} li`).forEach((node) => {
    if (!(node instanceof HTMLLIElement)) return;
    if (firstNestedContractLegalOl(node)) return;
    if (!isContractLegalListPlaceholderText(getContractLegalLiDirectText(node))) return;
    node.textContent = '';
  });
}

function removeEmptyContractLegalListItems(root: HTMLElement): void {
  let removed = true;
  while (removed) {
    removed = false;
    root.querySelectorAll(`ol.${CONTRACT_LEGAL_LIST_CLASS} li`).forEach((node) => {
      if (!(node instanceof HTMLLIElement)) return;
      if (!isContractLegalLiEffectivelyEmpty(node)) return;
      node.remove();
      removed = true;
    });
  }
}

/** Починка HTML шаблона: вложенные списки, пустые 1.3, комментарии вставки из Word. */
export function normalizeContractLegalListInHtml(sourceHtml: string): string {
  const trimmed = sourceHtml.trim();
  if (!trimmed) return sourceHtml;

  const doc = new DOMParser().parseFromString(
    `<div id="__contract_legal_norm_root">${trimmed}</div>`,
    'text/html'
  );
  const root = doc.getElementById('__contract_legal_norm_root');
  if (!root) return sourceHtml;

  stripTemplateEditorFragmentComments(root);
  flattenInvalidHeadingNesting(root);
  unwrapNestedContractLegalLists(root);
  absorbIntroParagraphBeforeLegalList(root);
  repairMergedActRootSections(root);
  restructureFlatActStyleList(root);
  stripLegacyPlaceholderFromLegalListItems(root);
  upgradeRemarkBlankLineRows(root);
  removeEmptyContractLegalListItems(root);
  removeEmptyContractLegalLists(root);
  ensureContractLegalListNumberingAttrs(root);

  return root.innerHTML;
}
