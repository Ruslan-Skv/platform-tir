export type InlineFormatKind = 'bold' | 'italic' | 'underline';

export const INLINE_FORMAT_TAGS: Record<InlineFormatKind, string[]> = {
  bold: ['strong', 'b'],
  italic: ['em', 'i'],
  underline: ['u'],
};

export const INLINE_FORMAT_EXEC: Record<InlineFormatKind, 'bold' | 'italic' | 'underline'> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
};

export const INLINE_FORMAT_WRAP: Record<
  InlineFormatKind,
  { before: string; after: string; placeholder: string }
> = {
  bold: { before: '<strong>', after: '</strong>', placeholder: 'жирный текст' },
  italic: { before: '<em>', after: '</em>', placeholder: 'курсив' },
  underline: { before: '<u>', after: '</u>', placeholder: 'подчёркнуто' },
};

export function tryUnwrapHtmlInlineTags(
  source: string,
  start: number,
  end: number,
  tags: string[]
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  for (const tag of tags) {
    const wrappedRe = new RegExp(`^\\s*<${tag}(\\s[^>]*)?>([\\s\\S]*)</${tag}>\\s*$`, 'i');
    const wrapped = selected.match(wrappedRe);
    if (wrapped) {
      const inner = wrapped[2] ?? '';
      return {
        next: source.slice(0, start) + inner + source.slice(end),
        cursor: start,
        selectLength: inner.length,
      };
    }
  }
  for (const tag of tags) {
    const openRe = new RegExp(`<${tag}(\\s[^>]*)?>\\s*$`, 'i');
    const closeRe = new RegExp(`^\\s*</${tag}>`, 'i');
    const before = source.slice(0, start);
    const after = source.slice(end);
    const openM = before.match(openRe);
    const closeM = after.match(closeRe);
    if (openM && closeM) {
      const openStart = start - openM[0].length;
      const closeEnd = end + closeM[0].length;
      return {
        next: source.slice(0, openStart) + selected + source.slice(closeEnd),
        cursor: openStart,
        selectLength: selected.length,
      };
    }
  }
  return null;
}

const HTML_FONT_WEIGHT_BOLD_STYLE_RE = /font-weight\s*:\s*(?:bold|bolder|[7-9]00)\b/i;
const HTML_FONT_STYLE_ITALIC_RE = /font-style\s*:\s*italic\b/i;
const HTML_BOLD_STYLE_TAG_NAMES = 'span|p|div|td|th|li|b|strong';
const HTML_ITALIC_STYLE_TAG_NAMES = 'span|p|div|td|th|li|em|i';

function htmlTagChunkIsBoldMarkup(tagName: string, attrs: string): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'b' || tag === 'strong') return true;
  return HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(attrs);
}

function htmlTagChunkIsItalicMarkup(tagName: string, attrs: string): boolean {
  const tag = tagName.toLowerCase();
  if (tag === 'em' || tag === 'i') return true;
  return HTML_FONT_STYLE_ITALIC_RE.test(attrs);
}

export function tryUnwrapHtmlFontStyleItalic(
  source: string,
  start: number,
  end: number
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  const wrappedRe = new RegExp(
    `^\\s*<(${HTML_ITALIC_STYLE_TAG_NAMES})(\\s[^>]*)>([\\s\\S]*)<\\/\\1>\\s*$`,
    'i'
  );
  const wrapped = selected.match(wrappedRe);
  if (wrapped) {
    const tagName = wrapped[1] ?? '';
    const attrs = wrapped[2] ?? '';
    if (!htmlTagChunkIsItalicMarkup(tagName, attrs)) return null;
    const inner = wrapped[3] ?? '';
    return {
      next: source.slice(0, start) + inner + source.slice(end),
      cursor: start,
      selectLength: inner.length,
    };
  }
  const openRe = new RegExp(`<(${HTML_ITALIC_STYLE_TAG_NAMES})(\\s[^>]*)>\\s*$`, 'i');
  const closeRe = new RegExp(`^\\s*<\\/(${HTML_ITALIC_STYLE_TAG_NAMES})>`, 'i');
  const before = source.slice(0, start);
  const after = source.slice(end);
  const openM = before.match(openRe);
  const closeM = after.match(closeRe);
  if (openM && closeM) {
    const tagName = openM[1] ?? '';
    const attrs = openM[2] ?? '';
    if (!htmlTagChunkIsItalicMarkup(tagName, attrs)) return null;
    const openStart = start - openM[0].length;
    const closeEnd = end + closeM[0].length;
    return {
      next: source.slice(0, openStart) + selected + source.slice(closeEnd),
      cursor: openStart,
      selectLength: selected.length,
    };
  }
  return null;
}

export function tryUnwrapHtmlFontWeightBold(
  source: string,
  start: number,
  end: number
): { next: string; cursor: number; selectLength: number } | null {
  const selected = source.slice(start, end);
  const wrappedRe = new RegExp(
    `^\\s*<(${HTML_BOLD_STYLE_TAG_NAMES})(\\s[^>]*)>([\\s\\S]*)<\\/\\1>\\s*$`,
    'i'
  );
  const wrapped = selected.match(wrappedRe);
  if (wrapped) {
    const tagName = wrapped[1] ?? '';
    const attrs = wrapped[2] ?? '';
    if (!htmlTagChunkIsBoldMarkup(tagName, attrs)) return null;
    const inner = wrapped[3] ?? '';
    return {
      next: source.slice(0, start) + inner + source.slice(end),
      cursor: start,
      selectLength: inner.length,
    };
  }
  const openRe = new RegExp(`<(${HTML_BOLD_STYLE_TAG_NAMES})(\\s[^>]*)>\\s*$`, 'i');
  const closeRe = new RegExp(`^\\s*<\\/${HTML_BOLD_STYLE_TAG_NAMES}>`, 'i');
  const before = source.slice(0, start);
  const after = source.slice(end);
  const openM = before.match(openRe);
  const closeM = after.match(closeRe);
  if (openM && closeM) {
    const tagName = openM[1] ?? '';
    const attrs = openM[2] ?? '';
    if (!htmlTagChunkIsBoldMarkup(tagName, attrs)) return null;
    const openStart = start - openM[0].length;
    const closeEnd = end + closeM[0].length;
    return {
      next: source.slice(0, openStart) + selected + source.slice(closeEnd),
      cursor: openStart,
      selectLength: selected.length,
    };
  }
  return null;
}

function isBoldFontWeightValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === 'bold' || normalized === 'bolder') return true;
  const numeric = Number.parseInt(normalized, 10);
  return !Number.isNaN(numeric) && numeric >= 700;
}

function rangeCloneContainsBoldMarkup(range: Range): boolean {
  const fragment = range.cloneContents();
  if (fragment.querySelector('b, strong, B, STRONG')) return true;
  for (const el of fragment.querySelectorAll<HTMLElement>('[style]')) {
    const styleAttr = el.getAttribute('style') ?? '';
    if (HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(styleAttr)) return true;
    if (isBoldFontWeightValue(el.style.fontWeight)) return true;
  }
  return false;
}

function isItalicFontStyleValue(value: string): boolean {
  return value.trim().toLowerCase() === 'italic';
}

function rangeCloneContainsItalicMarkup(range: Range): boolean {
  const fragment = range.cloneContents();
  if (fragment.querySelector('em, i, EM, I')) return true;
  for (const el of fragment.querySelectorAll<HTMLElement>('[style]')) {
    const styleAttr = el.getAttribute('style') ?? '';
    if (HTML_FONT_STYLE_ITALIC_RE.test(styleAttr)) return true;
    if (isItalicFontStyleValue(el.style.fontStyle)) return true;
  }
  return false;
}

function unwrapElementNode(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function rangeFullyContainsNode(range: Range, node: Node): boolean {
  const nodeRange = document.createRange();
  nodeRange.selectNode(node);
  const startsBeforeOrAt = range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0;
  const endsAfterOrAt = range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
  return startsBeforeOrAt && endsAfterOrAt;
}

function stripBoldFontWeightFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (
    !HTML_FONT_WEIGHT_BOLD_STYLE_RE.test(styleAttr) &&
    !isBoldFontWeightValue(el.style.fontWeight)
  ) {
    return;
  }
  el.style.fontWeight = 'normal';
  const nextStyle = styleAttr
    .replace(/font-weight\s*:\s*(?:bold|bolder|[7-9]00)\s*;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function _stripBoldFromHtmlFragment(fragment: DocumentFragment): DocumentFragment {
  const holder = document.createElement('div');
  holder.appendChild(fragment);
  for (const el of [...holder.querySelectorAll('b, strong, B, STRONG')]) {
    unwrapElementNode(el);
  }
  for (const el of holder.querySelectorAll<HTMLElement>('[style]')) {
    stripBoldFontWeightFromElementStyle(el);
  }
  const result = document.createDocumentFragment();
  while (holder.firstChild) result.appendChild(holder.firstChild);
  return result;
}

function stripBoldFromRangeInEditor(editor: HTMLElement, range: Range): void {
  const boldElements = [...editor.querySelectorAll<HTMLElement>('b, strong, B, STRONG')];
  for (const el of boldElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    unwrapElementNode(el);
  }
  const styledElements = [...editor.querySelectorAll<HTMLElement>('[style]')];
  for (const el of styledElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    stripBoldFontWeightFromElementStyle(el);
  }
}

function stripItalicFontStyleFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (!HTML_FONT_STYLE_ITALIC_RE.test(styleAttr) && !isItalicFontStyleValue(el.style.fontStyle)) {
    return;
  }
  el.style.fontStyle = 'normal';
  const nextStyle = styleAttr
    .replace(/font-style\s*:\s*italic\s*;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function stripItalicFromRangeInEditor(editor: HTMLElement, range: Range): void {
  const italicElements = [...editor.querySelectorAll<HTMLElement>('em, i, EM, I')];
  for (const el of italicElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    unwrapElementNode(el);
  }
  const styledElements = [...editor.querySelectorAll<HTMLElement>('[style]')];
  for (const el of styledElements) {
    if (!range.intersectsNode(el)) continue;
    if (!rangeFullyContainsNode(range, el)) continue;
    stripItalicFontStyleFromElementStyle(el);
  }
}

export function toggleVisualBoldInEditor(editor: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    document.execCommand('bold');
    return;
  }
  const shouldUnbold = document.queryCommandState('bold') || rangeCloneContainsBoldMarkup(range);
  if (shouldUnbold) {
    if (document.queryCommandState('bold')) {
      document.execCommand('bold');
      return;
    }
    stripBoldFromRangeInEditor(editor, range);
    return;
  }
  document.execCommand('bold');
}

export function toggleVisualItalicInEditor(editor: HTMLElement): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;
  if (range.collapsed) {
    document.execCommand('italic');
    return;
  }
  const shouldUnitalic =
    document.queryCommandState('italic') || rangeCloneContainsItalicMarkup(range);
  if (shouldUnitalic) {
    if (document.queryCommandState('italic')) {
      document.execCommand('italic');
      return;
    }
    stripItalicFromRangeInEditor(editor, range);
    return;
  }
  document.execCommand('italic');
}

export const EMPTY_INLINE_FORMAT_ACTIVE: Record<InlineFormatKind, boolean> = {
  bold: false,
  italic: false,
  underline: false,
};

function isHtmlCaretInsideTag(source: string, pos: number, tag: string): boolean {
  const before = source.slice(0, pos);
  const openRe = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
  const closeRe = new RegExp(`</${tag}>`, 'gi');
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return new RegExp(`^[\\s\\S]*?</${tag}>`, 'i').test(after);
}

function isHtmlCaretInsideFontStyleItalic(source: string, pos: number): boolean {
  const before = source.slice(0, pos);
  const openRe =
    /<(span|p|div|td|th|li|em|i)(\s+[^>]*style="[^"]*font-style\s*:\s*italic[^"]*"[^>]*)>/gi;
  const closeRe = /<\/(span|p|div|td|th|li|em|i)>/gi;
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return /^[\s\S]*?<\/(span|p|div|td|th|li|em|i)>/i.test(after);
}

function isHtmlCaretInsideFontWeightBold(source: string, pos: number): boolean {
  const before = source.slice(0, pos);
  const openRe = /<(span|p)(\s+[^>]*style="[^"]*font-weight\s*:\s*bold[^"]*"[^>]*)>/gi;
  const closeRe = /<\/(span|p)>/gi;
  let openCount = 0;
  let closeCount = 0;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(before)) !== null) {
    openCount += 1;
    void m;
  }
  while ((m = closeRe.exec(before)) !== null) {
    closeCount += 1;
    void m;
  }
  if (openCount <= closeCount) return false;
  const after = source.slice(pos);
  return /^[\s\S]*?<\/(span|p)>/i.test(after);
}

export function isHtmlInlineFormatActive(
  source: string,
  start: number,
  end: number,
  kind: InlineFormatKind
): boolean {
  const tags = INLINE_FORMAT_TAGS[kind];
  if (tryUnwrapHtmlInlineTags(source, start, end, tags)) return true;
  if (kind === 'bold' && tryUnwrapHtmlFontWeightBold(source, start, end)) return true;
  if (kind === 'italic' && tryUnwrapHtmlFontStyleItalic(source, start, end)) return true;
  const positions = start === end ? [start] : [start, end];
  if (kind === 'bold') {
    if (positions.some((pos) => isHtmlCaretInsideFontWeightBold(source, pos))) return true;
  }
  if (kind === 'italic') {
    if (positions.some((pos) => isHtmlCaretInsideFontStyleItalic(source, pos))) return true;
  }
  return tags.some((tag) => positions.some((pos) => isHtmlCaretInsideTag(source, pos, tag)));
}
