export type TemplateEditorSelectionBookmark = {
  start: number;
  end: number;
};

/** Смещение выделения в символах относительно корня contentEditable. */
export function getTemplateEditorSelectionBookmark(
  root: HTMLElement
): TemplateEditorSelectionBookmark | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;

  const measure = (container: Node, offset: number): number => {
    const probe = document.createRange();
    probe.selectNodeContents(root);
    probe.setEnd(container, offset);
    return probe.toString().length;
  };

  const start = measure(range.startContainer, range.startOffset);
  const end = measure(range.endContainer, range.endOffset);
  return { start, end };
}

/** Восстановить выделение по символьным смещениям внутри contentEditable. */
export function setTemplateEditorSelectionBookmark(
  root: HTMLElement,
  bookmark: TemplateEditorSelectionBookmark
): void {
  const sel = window.getSelection();
  if (!sel) return;

  const locate = (target: number): { node: Text; offset: number } | null => {
    let charCount = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      const len = node.length;
      if (charCount + len >= target) {
        return { node, offset: Math.max(0, target - charCount) };
      }
      charCount += len;
      node = walker.nextNode() as Text | null;
    }
    return null;
  };

  const startPos = locate(bookmark.start);
  const endPos = locate(Math.max(bookmark.start, bookmark.end));
  const range = document.createRange();

  if (!startPos) {
    range.selectNodeContents(root);
    range.collapse(false);
  } else {
    range.setStart(startPos.node, startPos.offset);
    if (endPos) {
      range.setEnd(endPos.node, endPos.offset);
    } else {
      range.setEnd(startPos.node, startPos.offset);
    }
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

/** Обновить innerHTML редактора, сохранив позицию курсора, если фокус внутри. */
export function setTemplateEditorInnerHtmlPreservingSelection(
  root: HTMLElement,
  nextHtml: string
): void {
  if (root.innerHTML === nextHtml) return;
  const bookmark =
    document.activeElement === root ? getTemplateEditorSelectionBookmark(root) : null;
  root.innerHTML = nextHtml;
  if (bookmark) {
    root.focus({ preventScroll: true });
    setTemplateEditorSelectionBookmark(root, bookmark);
  }
}
