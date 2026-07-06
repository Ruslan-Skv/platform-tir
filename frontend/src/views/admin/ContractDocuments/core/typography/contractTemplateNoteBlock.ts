/** Примечание в шаблоне — `<blockquote>` с серой подложкой. */

export function blockquoteHasMeaningfulText(blockquote: HTMLElement): boolean {
  const clone = blockquote.cloneNode(true) as HTMLElement;
  for (const br of clone.querySelectorAll('br')) {
    br.remove();
  }
  return (clone.textContent ?? '').replace(/\u00A0/g, ' ').trim().length > 0;
}

function findNoteBlockquoteForNode(
  editor: HTMLElement,
  node: Node | null
): HTMLQuoteElement | null {
  let current: Node | null = node;
  while (current && current !== editor) {
    if (current instanceof HTMLQuoteElement && current.tagName === 'BLOCKQUOTE') {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function placeCaretAfterRemoval(
  editor: HTMLElement,
  parent: Node,
  next: ChildNode | null,
  prev: ChildNode | null
): void {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (next instanceof HTMLElement) {
    if (next.tagName === 'P' || next.tagName === 'DIV') {
      range.setStart(next, 0);
    } else {
      range.setStartBefore(next);
    }
  } else if (prev instanceof HTMLElement) {
    range.selectNodeContents(prev);
    range.collapse(false);
  } else {
    const p = document.createElement('p');
    p.appendChild(document.createElement('br'));
    parent.insertBefore(p, next);
    range.setStart(p, 0);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/** Удаляет пустые blockquote из DOM. */
export function removeEmptyNoteBlockquotesInDom(root: ParentNode): boolean {
  let removed = false;
  for (const bq of [...root.querySelectorAll('blockquote')]) {
    if (blockquoteHasMeaningfulText(bq as HTMLElement)) continue;
    bq.remove();
    removed = true;
  }
  return removed;
}

export function removeEmptyNoteBlockquotesInHtml(html: string): string {
  if (typeof window === 'undefined' || !/<blockquote\b/i.test(html)) return html;
  const container = document.createElement('div');
  container.innerHTML = html;
  if (!removeEmptyNoteBlockquotesInDom(container)) return html;
  return container.innerHTML;
}

/** Backspace/Delete в пустом примечании — убрать оболочку blockquote. */
export function handleNoteBlockquoteBackspaceOrDelete(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const blockquote = findNoteBlockquoteForNode(editor, range.commonAncestorContainer);
  if (!blockquote) return false;
  if (blockquoteHasMeaningfulText(blockquote)) return false;

  const parent = blockquote.parentNode;
  if (!parent) return false;
  const next = blockquote.nextSibling;
  const prev = blockquote.previousSibling;
  blockquote.remove();
  placeCaretAfterRemoval(editor, parent, next, prev);
  return true;
}

/** Повторное нажатие «Примечание» внутри blockquote — снять выделение блока. */
export function removeNoteBlockquoteAtSelection(editor: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;

  const blockquote = findNoteBlockquoteForNode(editor, range.commonAncestorContainer);
  if (!blockquote) return false;

  const parent = blockquote.parentNode;
  if (!parent) return false;
  const fragment = document.createDocumentFragment();
  while (blockquote.firstChild) {
    fragment.appendChild(blockquote.firstChild);
  }
  const next = blockquote.nextSibling;
  blockquote.replaceWith(fragment);
  const selAfter = window.getSelection();
  if (selAfter) {
    const afterRange = document.createRange();
    afterRange.setStartBefore(next ?? parent.lastChild ?? parent);
    afterRange.collapse(true);
    selAfter.removeAllRanges();
    selAfter.addRange(afterRange);
  }
  removeEmptyNoteBlockquotesInDom(editor);
  return true;
}

export function pruneEmptyNoteBlockquotesInEditor(editor: HTMLElement): boolean {
  return removeEmptyNoteBlockquotesInDom(editor);
}
