import { CONTRACT_LEGAL_LIST_CLASS } from './contractLegalList';
import { CONTRACT_APPENDIX_REF_CLASS } from './contractTemplateAppendixRef';

export type ParagraphTextAlign = 'left' | 'center' | 'right' | 'justify';

const VISUAL_BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote';

function normalizeTextAlignKeyword(raw: string): ParagraphTextAlign | null {
  const value = raw.toLowerCase();
  if (value === 'center') return 'center';
  if (value === 'right' || value === 'end') return 'right';
  if (value === 'justify') return 'justify';
  if (value === 'left' || value === 'start') return 'left';
  return null;
}

export function parseExplicitTextAlign(
  cssText: string | null | undefined
): ParagraphTextAlign | null {
  if (!cssText) return null;
  const match = cssText.match(/text-align\s*:\s*([\w-]+)/i);
  if (!match) return null;
  return normalizeTextAlignKeyword(match[1]);
}

export function setTextAlignInStyleString(style: string, align: ParagraphTextAlign): string {
  let next = style
    .replace(/\btext-align\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
  const alignDecl = `text-align: ${align}`;
  next = next ? `${next}; ${alignDecl}` : alignDecl;
  return next;
}

export function stripTextAlignFromStyleString(style: string): string {
  return style
    .replace(/\btext-align\s*:\s*[^;]+;?/gi, '')
    .replace(/;;+/g, ';')
    .trim()
    .replace(/^;|;$/g, '');
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

function stripNestedTextAlignInBlock(block: HTMLElement): void {
  for (const el of block.querySelectorAll<HTMLElement>('[style]')) {
    if (el === block) continue;
    el.style.removeProperty('text-align');
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) continue;
    const cleaned = stripTextAlignFromStyleString(styleAttr);
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  }
}

export function applyTextAlignToBlockElement(block: HTMLElement, align: ParagraphTextAlign): void {
  block.style.textAlign = align;

  const isAppendixRef = block.classList.contains(CONTRACT_APPENDIX_REF_CLASS);
  const isParagraph = block.tagName === 'P';

  if (align === 'justify' && isParagraph && !isAppendixRef) {
    block.style.textIndent = '1.25cm';
  } else if (isParagraph && !isAppendixRef) {
    block.style.removeProperty('text-indent');
  }

  stripNestedTextAlignInBlock(block);
  syncBlockElementStyleAttribute(block);
}

function findVisualBlockElement(editor: HTMLElement, node: Node | null): HTMLElement | null {
  const tags = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'BLOCKQUOTE']);
  let current: Node | null = node;
  while (current && current !== editor) {
    if (current instanceof HTMLElement && tags.has(current.tagName)) {
      return current;
    }
    current = current.parentNode;
  }
  return null;
}

function findVisualBlockAtCollapsedCaret(editor: HTMLElement, range: Range): HTMLElement | null {
  const direct = findVisualBlockElement(editor, range.startContainer);
  if (direct) return direct;

  if (range.startContainer === editor) {
    const next = editor.children[range.startOffset];
    if (next instanceof HTMLElement) return findVisualBlockElement(editor, next) ?? next;
    const prev = editor.children[range.startOffset - 1];
    if (prev instanceof HTMLElement) return findVisualBlockElement(editor, prev) ?? prev;
  }

  return null;
}

export function collectVisualBlocksInRange(editor: HTMLElement, range: Range): HTMLElement[] {
  const blocks = new Set<HTMLElement>();

  if (range.collapsed) {
    const block = findVisualBlockAtCollapsedCaret(editor, range);
    if (block) blocks.add(block);
    return [...blocks];
  }

  for (const el of editor.querySelectorAll<HTMLElement>(VISUAL_BLOCK_SELECTOR)) {
    if (range.intersectsNode(el)) blocks.add(el);
  }

  if (blocks.size === 0) {
    const block = findVisualBlockElement(editor, range.commonAncestorContainer);
    if (block) blocks.add(block);
  }

  return [...blocks];
}

export function applyVisualParagraphAlign(editor: HTMLElement, align: ParagraphTextAlign): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  for (const block of collectVisualBlocksInRange(editor, range)) {
    applyTextAlignToBlockElement(block, align);
  }
}

export function patchHtmlOpenTagTextAlign(openTag: string, align: ParagraphTextAlign): string {
  const isAppendixRef = /\bclass\s*=\s*["'][^"']*contractAppendixRef/i.test(openTag);
  const isParagraph = /^<p\b/i.test(openTag);
  const styleMatch = openTag.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  const quote = styleMatch?.[0].includes('"') ? '"' : "'";
  const current = styleMatch?.[2] ?? styleMatch?.[3] ?? '';
  let updated = setTextAlignInStyleString(current, align);

  if (align === 'justify' && isParagraph && !isAppendixRef) {
    updated = setTextIndentInStyleString(updated, 1.25);
  } else if (isParagraph && !isAppendixRef) {
    updated = setTextIndentInStyleString(updated, 0);
  }

  if (styleMatch) {
    return openTag.replace(styleMatch[0], `style=${quote}${updated}${quote}`);
  }
  if (!updated) return openTag;
  return openTag.replace(/>$/, ` style="${updated}">`);
}

type HtmlBlockOpenTagRef = { openTagStart: number; openTagEnd: number; attrs: string };

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

function findHtmlBlockOpenTagRefAtOffset(
  source: string,
  offset: number
): HtmlBlockOpenTagRef | null {
  const before = source.slice(0, offset);
  let best: HtmlBlockOpenTagRef | null = null;
  for (const tag of HTML_BLOCK_ALIGN_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(before)) !== null) {
      const openStart = match.index;
      const openEnd = openStart + match[0].length;
      const closeRe = new RegExp(`</${tag}>`, 'gi');
      closeRe.lastIndex = openEnd;
      const closeMatch = closeRe.exec(source);
      if (!closeMatch) continue;
      if (offset >= openEnd && offset <= closeMatch.index) {
        best = { openTagStart: openStart, openTagEnd: openEnd, attrs: match[1] ?? '' };
      }
    }
  }
  return best;
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

export function applyHtmlParagraphAlign(
  source: string,
  start: number,
  end: number,
  align: ParagraphTextAlign
): string {
  const blocks = collectHtmlBlockOpenTagRefsIntersectingRange(source, start, end);
  if (blocks.length === 0) return source;

  let next = source;
  for (const block of blocks) {
    const openTag = next.slice(block.openTagStart, block.openTagEnd);
    const patched = patchHtmlOpenTagTextAlign(openTag, align);
    next = next.slice(0, block.openTagStart) + patched + next.slice(block.openTagEnd);
  }
  return next;
}

/** Снимает text-align с вложенных span и переносит justify на блок (преамбула акта после Word). */
export function repairParagraphTextAlignInDom(root: ParentNode): void {
  const scope =
    root instanceof Element && root.classList.contains('docPrint')
      ? root
      : root.querySelector('.docPrint');
  if (!scope) return;

  for (const block of scope.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6')) {
    if (block.classList.contains(CONTRACT_APPENDIX_REF_CLASS)) continue;
    if (block.closest(`ol.${CONTRACT_LEGAL_LIST_CLASS}`)) continue;

    const blockAlign = parseExplicitTextAlign(block.getAttribute('style'));
    let nestedJustify = false;
    for (const el of block.querySelectorAll<HTMLElement>('[style]')) {
      if (el === block) continue;
      const nestedAlign = parseExplicitTextAlign(el.getAttribute('style'));
      if (nestedAlign === 'justify') nestedJustify = true;
      if (blockAlign && nestedAlign && blockAlign !== nestedAlign) {
        el.style.removeProperty('text-align');
        const styleAttr = el.getAttribute('style');
        if (styleAttr) {
          const cleaned = stripTextAlignFromStyleString(styleAttr);
          if (cleaned) el.setAttribute('style', cleaned);
          else el.removeAttribute('style');
        }
      }
    }

    if (nestedJustify && blockAlign !== 'justify') {
      applyTextAlignToBlockElement(block, 'justify');
    }
  }
}
