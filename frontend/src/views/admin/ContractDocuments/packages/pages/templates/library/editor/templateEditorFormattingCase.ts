export function selectionPlainTextForCaseCheck(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

export function selectionHasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

export function isSelectionAllUppercaseLetters(text: string): boolean {
  const letters = text.match(/\p{L}/gu);
  if (!letters?.length) return false;
  return letters.every(
    (ch) => ch === ch.toLocaleUpperCase('ru-RU') && ch !== ch.toLocaleLowerCase('ru-RU')
  );
}

export function applyCaseToPlainText(text: string, mode: 'upper' | 'lower'): string {
  return mode === 'upper' ? text.toLocaleUpperCase('ru-RU') : text.toLocaleLowerCase('ru-RU');
}

export function applyCaseToHtmlFragment(html: string, mode: 'upper' | 'lower'): string {
  if (!/<[a-z][\s/>]/i.test(html)) {
    return applyCaseToPlainText(html, mode);
  }
  const doc = new DOMParser().parseFromString(`<div id="__case_root">${html}</div>`, 'text/html');
  const root = doc.getElementById('__case_root');
  if (!root) return applyCaseToPlainText(html, mode);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = node.textContent ?? '';
    if (!value) continue;
    node.textContent = applyCaseToPlainText(value, mode);
  }
  return root.innerHTML;
}
