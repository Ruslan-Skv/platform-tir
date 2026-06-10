import {
  collectVisualBlocksInRange,
  parseExplicitTextAlign,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateParagraphAlign';

import type { ParagraphTextAlign } from './templateEditorFormatToolbar';

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

function stripBoldFromHtmlFragment(fragment: DocumentFragment): DocumentFragment {
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

/** Размеры как в списке Word (пт). */
export const VISUAL_FONT_SIZE_PT_OPTIONS = [
  8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
] as const;

export const DEFAULT_VISUAL_FONT_SIZE_PT = 11;

function pxToPt(px: number): number {
  return Math.round(((px * 72) / 96) * 2) / 2;
}

function parseCssFontSizeToPt(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  const ptMatch = normalized.match(/^([\d.]+)\s*pt$/);
  if (ptMatch) {
    const pt = Number.parseFloat(ptMatch[1]);
    return Number.isFinite(pt) ? pt : null;
  }
  const pxMatch = normalized.match(/^([\d.]+)\s*px$/);
  if (pxMatch) {
    const px = Number.parseFloat(pxMatch[1]);
    return Number.isFinite(px) ? pxToPt(px) : null;
  }
  return null;
}

function getInlineFontSizePt(el: HTMLElement): number | null {
  const styleAttr = el.getAttribute('style') ?? '';
  const fromAttr = styleAttr.match(/font-size\s*:\s*([^;]+)/i)?.[1]?.trim();
  if (fromAttr) {
    const pt = parseCssFontSizeToPt(fromAttr);
    if (pt != null) return pt;
  }
  if (el.style.fontSize) {
    const pt = parseCssFontSizeToPt(el.style.fontSize);
    if (pt != null) return pt;
  }
  return null;
}

function collectSelectionFontSizesPt(editor: HTMLElement, range: Range): number[] {
  const sizes: number[] = [];
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
      const text = node.textContent?.replace(/\u200B/g, '').trim() ?? '';
      return text ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent) continue;
    let pt = getInlineFontSizePt(parent);
    if (pt == null) {
      const computed = window.getComputedStyle(parent).fontSize;
      pt = parseCssFontSizeToPt(computed) ?? DEFAULT_VISUAL_FONT_SIZE_PT;
    }
    sizes.push(pt);
  }
  return sizes;
}

export function getVisualSelectionFontSizePt(
  editor: HTMLElement,
  range: Range
): { pt: number; mixed: boolean } {
  const sizes = collectSelectionFontSizesPt(editor, range);
  if (sizes.length === 0) {
    return { pt: DEFAULT_VISUAL_FONT_SIZE_PT, mixed: false };
  }
  const first = sizes[0];
  const mixed = sizes.some((size) => Math.abs(size - first) > 0.01);
  return { pt: first, mixed };
}

function stripFontSizeFromElementStyle(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style') ?? '';
  if (!/font-size\s*:/i.test(styleAttr) && !el.style.fontSize) return;
  el.style.fontSize = '';
  const nextStyle = styleAttr
    .replace(/font-size\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (nextStyle) el.setAttribute('style', nextStyle);
  else el.removeAttribute('style');
}

function replaceFontElementWithSizedSpan(fontEl: Element, sizePt: number): HTMLSpanElement {
  const span = document.createElement('span');
  span.style.fontSize = `${sizePt}pt`;
  while (fontEl.firstChild) span.appendChild(fontEl.firstChild);
  return span;
}

export function applyVisualFontSizePt(editor: HTMLElement, sizePt: number): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  if (range.collapsed) {
    const block = collectVisualBlocksInRange(editor, range)[0];
    if (block) {
      block.style.fontSize = `${sizePt}pt`;
      return;
    }
    const span = document.createElement('span');
    span.style.fontSize = `${sizePt}pt`;
    span.appendChild(document.createTextNode('\u200B'));
    range.insertNode(span);
    const caret = document.createRange();
    caret.setStart(span.firstChild!, 1);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
    return;
  }

  const extracted = range.extractContents();
  const holder = document.createElement('div');
  holder.appendChild(extracted);
  for (const fontEl of [...holder.querySelectorAll('font')]) {
    fontEl.replaceWith(replaceFontElementWithSizedSpan(fontEl, sizePt));
  }
  for (const el of holder.querySelectorAll<HTMLElement>('*')) {
    stripFontSizeFromElementStyle(el);
  }
  const span = document.createElement('span');
  span.style.fontSize = `${sizePt}pt`;
  while (holder.firstChild) span.appendChild(holder.firstChild);
  range.insertNode(span);
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(nextRange);
}

const HTML_BLOCK_ALIGN_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'li',
  'td',
  'th',
  'blockquote',
] as const;

function getBlockTextAlign(block: HTMLElement): ParagraphTextAlign | null {
  const fromAttr = parseExplicitTextAlign(block.getAttribute('style'));
  if (fromAttr) return fromAttr;
  const fromInline = parseExplicitTextAlign(block.style.cssText);
  if (fromInline) return fromInline;
  return parseExplicitTextAlign(`text-align: ${window.getComputedStyle(block).textAlign}`);
}

export function getVisualSelectionTextAlign(
  editor: HTMLElement,
  range: Range
): ParagraphTextAlign | null {
  const blocks = collectVisualBlocksInRange(editor, range);
  if (blocks.length === 0) return null;
  const aligns = blocks.map(getBlockTextAlign);
  if (aligns.some((align) => align === null)) return null;
  const first = aligns[0];
  return aligns.every((align) => align === first) ? first : null;
}

export type HeadingLevel = 1 | 2 | 3;

function getBlockHeadingLevel(block: HTMLElement): HeadingLevel | null {
  const tag = block.tagName;
  if (tag === 'H1') return 1;
  if (tag === 'H2') return 2;
  if (tag === 'H3') return 3;
  return null;
}

export function getVisualSelectionHeadingLevelFromCommand(): HeadingLevel | null {
  const formatBlock = String(document.queryCommandValue('formatBlock') ?? '')
    .trim()
    .toLowerCase();
  const match = formatBlock.match(/^h([1-3])$/);
  if (!match) return null;
  return Number(match[1]) as HeadingLevel;
}

export function getVisualSelectionHeadingLevel(
  editor: HTMLElement,
  range: Range
): HeadingLevel | null {
  const blocks = collectVisualBlocksInRange(editor, range);
  if (blocks.length === 0) return getVisualSelectionHeadingLevelFromCommand();
  const levels = blocks.map(getBlockHeadingLevel);
  const first = levels[0];
  return levels.every((level) => level === first) ? first : null;
}

function parseHeadingLevelFromOpenTagHtml(openTag: string): HeadingLevel | null {
  const match = openTag.match(/^<h([1-3])\b/i);
  if (!match) return null;
  return Number(match[1]) as HeadingLevel;
}

export function getHtmlSelectionHeadingLevel(
  source: string,
  start: number,
  end: number
): HeadingLevel | null {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return null;
  const levels = blocks.map((block) =>
    parseHeadingLevelFromOpenTagHtml(source.slice(block.openTagStart, block.openTagEnd))
  );
  const first = levels[0];
  return levels.every((level) => level === first) ? first : null;
}

function parseTextAlignFromHtmlAttrs(attrs: string): ParagraphTextAlign | null {
  const styleMatch = attrs.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  const styleValue = styleMatch?.[2] ?? styleMatch?.[3] ?? '';
  return parseExplicitTextAlign(styleValue);
}

type HtmlBlockOpenTagRef = {
  openTagStart: number;
  openTagEnd: number;
  attrs: string;
};

function findHtmlBlockOpenTagRefAtOffset(
  source: string,
  offset: number
): HtmlBlockOpenTagRef | null {
  for (const tag of HTML_BLOCK_ALIGN_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = openEnd;
      const closeMatch = closeRe.exec(source);
      if (!closeMatch) continue;
      if (offset >= openEnd && offset <= closeMatch.index) {
        return { openTagStart: openStart, openTagEnd: openEnd, attrs: match[1] ?? '' };
      }
    }
  }
  return null;
}

function collectHtmlBlockOpenTagRefsIntersectingRange(
  source: string,
  start: number,
  end: number
): HtmlBlockOpenTagRef[] {
  const blocks: {
    openTagStart: number;
    openTagEnd: number;
    attrs: string;
    contentStart: number;
    contentEnd: number;
  }[] = [];
  for (const tag of HTML_BLOCK_ALIGN_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = openEnd;
      const closeMatch = closeRe.exec(source);
      if (!closeMatch) continue;
      blocks.push({
        openTagStart: openStart,
        openTagEnd: openEnd,
        attrs: match[1] ?? '',
        contentStart: openEnd,
        contentEnd: closeMatch.index,
      });
    }
  }
  const rangeStart = Math.min(start, end);
  const rangeEnd = Math.max(start, end);
  const hits = blocks.filter(
    (block) => block.contentStart < rangeEnd && block.contentEnd > rangeStart
  );
  if (hits.length > 0) {
    hits.sort((a, b) => b.openTagStart - a.openTagStart);
    return hits.map(({ openTagStart, openTagEnd, attrs }) => ({ openTagStart, openTagEnd, attrs }));
  }

  const caretBlock = findHtmlBlockOpenTagRefAtOffset(source, rangeStart);
  if (caretBlock) return [caretBlock];

  const ahead = source.slice(rangeStart);
  const beforeTag = ahead.match(/^<(p|h[1-6]|li|td|th|blockquote)(\s[^>]*)?>/i);
  if (beforeTag) {
    return [
      {
        openTagStart: rangeStart,
        openTagEnd: rangeStart + beforeTag[0].length,
        attrs: beforeTag[2] ?? '',
      },
    ];
  }

  return [];
}

function collectHtmlBlocksIntersectingRange(
  source: string,
  start: number,
  end: number
): { attrs: string }[] {
  return collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
}

export function getHtmlSelectionTextAlign(
  source: string,
  start: number,
  end: number
): ParagraphTextAlign | null {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return null;
  const aligns = blocks.map((block) => parseTextAlignFromHtmlAttrs(block.attrs));
  if (aligns.some((align) => align === null)) return null;
  const first = aligns[0];
  return aligns.every((align) => align === first) ? first : null;
}

export function applyVisualLineSpacing(
  editor: HTMLElement,
  lineHeight: number,
  marginBottomPt: number
): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  for (const block of collectVisualBlocksInRange(editor, range)) {
    block.style.lineHeight = String(lineHeight);
    block.style.marginBottom = `${marginBottomPt}pt`;
  }
}

function setTextIndentInStyleString(style: string, indentCm: number): string {
  let next = style
    .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  if (indentCm > 0) {
    const indent = `text-indent: ${indentCm}cm`;
    next = next ? `${next}; ${indent}` : indent;
  }
  return next;
}

function syncBlockElementStyleAttribute(block: HTMLElement): void {
  const cssText = block.style.cssText.trim().replace(/;;+/g, ';');
  if (cssText) block.setAttribute('style', cssText);
  else block.removeAttribute('style');
}

function applyTextIndentToBlockElement(block: HTMLElement, indentCm: number): void {
  if (indentCm <= 0) block.style.removeProperty('text-indent');
  else block.style.textIndent = `${indentCm}cm`;
  syncBlockElementStyleAttribute(block);
}

function patchHtmlOpenTagTextIndent(openTag: string, indentCm: number): string {
  const styleMatch = openTag.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  if (styleMatch) {
    const quote = styleMatch[0].includes('"') ? '"' : "'";
    const current = styleMatch[2] ?? styleMatch[3] ?? '';
    const updated = setTextIndentInStyleString(current, indentCm);
    return openTag.replace(styleMatch[0], `style=${quote}${updated}${quote}`);
  }
  if (indentCm <= 0) return openTag;
  return openTag.replace(/>$/, ` style="text-indent: ${indentCm}cm;">`);
}

export function applyHtmlParagraphIndentCm(
  source: string,
  start: number,
  end: number,
  indentCm: number
): string {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return source;

  let next = source;
  for (const block of blocks) {
    const openTag = next.slice(block.openTagStart, block.openTagEnd);
    const patched = patchHtmlOpenTagTextIndent(openTag, indentCm);
    next = next.slice(0, block.openTagStart) + patched + next.slice(block.openTagEnd);
  }
  return next;
}

export function applyVisualParagraphIndent(editor: HTMLElement, indentCm: number): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  for (const block of collectVisualBlocksInRange(editor, range)) {
    applyTextIndentToBlockElement(block, indentCm);
  }
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
