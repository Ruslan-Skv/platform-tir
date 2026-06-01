/** Уплотнённые межабзацные интервалы договора (печать на 2 страницы). */

export const CONTRACT_DENSE_SPACING_CLASS = 'docPrintContractDense';
export const CONTRACT_PARAGRAPH_SPACING_ATTR = 'data-contract-paragraph-spacing';

export type ContractParagraphSpacingPreset = {
  lineHeight: number;
  paragraphMarginBottomPt: number;
  heading1MarginBottomPt: number;
  heading2Margin: string;
  heading3Margin: string;
  listItemMarginBottomPt: number;
};

/** Уплотнённый договор: ~4pt между абзацами, меньше отступы у разделов. */
export const CONTRACT_DENSE_SPACING_PRESET: ContractParagraphSpacingPreset = {
  lineHeight: 1.28,
  paragraphMarginBottomPt: 4,
  heading1MarginBottomPt: 8,
  heading2Margin: '8pt 0 3pt',
  heading3Margin: '8pt 0 3pt',
  listItemMarginBottomPt: 3,
};

/** Стандарт компактной печати (10pt). */
export const CONTRACT_DEFAULT_SPACING_PRESET: ContractParagraphSpacingPreset = {
  lineHeight: 1.32,
  paragraphMarginBottomPt: 6,
  heading1MarginBottomPt: 10,
  heading2Margin: '11pt 0 5pt',
  heading3Margin: '11pt 0 5pt',
  listItemMarginBottomPt: 5,
};

const SPACING_BLOCK_TAGS = new Set(['p', 'h1', 'h2', 'h3', 'li']);
const HTML_SPACING_BLOCK_TAGS = ['p', 'h1', 'h2', 'h3', 'li'] as const;
const EMBED_SKIP_SELECTOR = '.estimateRoomsEmbed, .estimateA4DocPrintEmbed';

function stripMarginAndLineHeightFromStyle(style: string): string {
  return style
    .replace(/\bmargin(?:-(?:top|right|bottom|left))?\s*:\s*[^;]+;?/gi, '')
    .replace(/\bline-height\s*:\s*[^;]+;?/gi, '')
    .replace(/;\s*;/g, ';')
    .replace(/^[\s;]+|[\s;]+$/g, '')
    .trim();
}

function marginRuleForTag(tag: string, preset: ContractParagraphSpacingPreset): string {
  const t = tag.toLowerCase();
  if (t === 'h1') return `margin: 0 0 ${preset.heading1MarginBottomPt}pt`;
  if (t === 'h2') return `margin: ${preset.heading2Margin}`;
  if (t === 'h3') return `margin: ${preset.heading3Margin}`;
  if (t === 'li') return `margin: 0 0 ${preset.listItemMarginBottomPt}pt`;
  return `margin: 0 0 ${preset.paragraphMarginBottomPt}pt`;
}

export function patchBlockSpacingStyle(
  style: string,
  tagName: string,
  preset: ContractParagraphSpacingPreset
): string {
  const base = stripMarginAndLineHeightFromStyle(style);
  const spacing = `${marginRuleForTag(tagName, preset)}; line-height: ${preset.lineHeight}`;
  return base ? `${base}; ${spacing}` : spacing;
}

function presetForDense(dense: boolean): ContractParagraphSpacingPreset {
  return dense ? CONTRACT_DENSE_SPACING_PRESET : CONTRACT_DEFAULT_SPACING_PRESET;
}

export function isContractSpacingBlockElement(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  if (!SPACING_BLOCK_TAGS.has(tag)) return false;
  if (el.closest(EMBED_SKIP_SELECTOR)) return false;
  return true;
}

export function isElementDenseSpacing(el: HTMLElement): boolean {
  const marked = el.getAttribute(CONTRACT_PARAGRAPH_SPACING_ATTR);
  if (marked === 'dense') return true;
  if (marked === 'normal') return false;

  const mb = el.style.marginBottom;
  if (mb) {
    const n = parseFloat(mb);
    if (!Number.isNaN(n)) return n <= 4.5;
  }

  const style = el.getAttribute('style') ?? '';
  return /margin:\s*0\s+0\s+4pt/i.test(style);
}

function applySpacingToBlockElement(el: HTMLElement, dense: boolean): void {
  const tag = el.tagName.toLowerCase();
  if (!SPACING_BLOCK_TAGS.has(tag)) return;
  const preset = presetForDense(dense);
  el.setAttribute(CONTRACT_PARAGRAPH_SPACING_ATTR, dense ? 'dense' : 'normal');
  el.setAttribute('style', patchBlockSpacingStyle(el.getAttribute('style') ?? '', tag, preset));
}

function setDocPrintDenseClass(docPrint: HTMLElement, dense: boolean): void {
  if (dense) docPrint.classList.add(CONTRACT_DENSE_SPACING_CLASS);
  else docPrint.classList.remove(CONTRACT_DENSE_SPACING_CLASS);
}

function applySpacingInContainer(
  root: ParentNode,
  preset: ContractParagraphSpacingPreset,
  dense: boolean
): void {
  for (const el of root.querySelectorAll<HTMLElement>('p, h1, h2, h3, li')) {
    if (!isContractSpacingBlockElement(el)) continue;
    applySpacingToBlockElement(el, dense);
  }
}

export function htmlHasContractDenseSpacing(html: string): boolean {
  return new RegExp(`\\b${CONTRACT_DENSE_SPACING_CLASS}\\b`).test(html);
}

/** Все блоки уже уплотнены → следующий клик разреживает. */
export function shouldApplyDenseSpacingToBlocks(blocks: HTMLElement[]): boolean {
  if (blocks.length === 0) return true;
  return blocks.some((el) => !isElementDenseSpacing(el));
}

export type ContractSpacingToggleResult = {
  html: string;
  dense: boolean;
  blockCount: number;
  scope: 'document' | 'selection';
};

/** Переключить интервалы у переданных абзацев (выделение). */
export function toggleContractSpacingOnBlockElements(
  blocks: HTMLElement[],
  htmlAfter?: string
): ContractSpacingToggleResult {
  const spacingBlocks = blocks.filter(
    (el): el is HTMLElement => el instanceof HTMLElement && isContractSpacingBlockElement(el)
  );
  const dense = shouldApplyDenseSpacingToBlocks(spacingBlocks);
  for (const el of spacingBlocks) {
    applySpacingToBlockElement(el, dense);
  }
  return {
    html: htmlAfter ?? '',
    dense,
    blockCount: spacingBlocks.length,
    scope: 'selection',
  };
}

function patchHtmlOpenTagSpacing(openTag: string, dense: boolean): string {
  const tagMatch = openTag.match(/^<(\w+)/i);
  const tag = (tagMatch?.[1] ?? 'p').toLowerCase();
  if (!SPACING_BLOCK_TAGS.has(tag)) return openTag;

  const preset = presetForDense(dense);
  const styleMatch = openTag.match(/\bstyle\s*=\s*("([^"]*)"|'([^']*)')/i);
  const spacingAttr = `${CONTRACT_PARAGRAPH_SPACING_ATTR}="${dense ? 'dense' : 'normal'}"`;

  if (styleMatch) {
    const quote = styleMatch[0].includes('"') ? '"' : "'";
    const current = styleMatch[2] ?? styleMatch[3] ?? '';
    const updated = patchBlockSpacingStyle(current, tag, preset);
    let next = openTag.replace(styleMatch[0], `style=${quote}${updated}${quote}`);
    if (new RegExp(`\\b${CONTRACT_PARAGRAPH_SPACING_ATTR}\\b`).test(next)) {
      next = next.replace(
        new RegExp(`\\s*${CONTRACT_PARAGRAPH_SPACING_ATTR}\\s*=\\s*("|')[^"']*\\1`, 'i'),
        ` ${spacingAttr}`
      );
    } else {
      next = next.replace(/<(\w+)/i, `<$1 ${spacingAttr}`);
    }
    return next;
  }

  const style = patchBlockSpacingStyle('', tag, preset);
  return openTag.replace(/^<(\w+)(\s[^>]*)?>/i, `<$1 ${spacingAttr} style="${style}">`);
}

type HtmlBlockOpenTagRef = { openTagStart: number; openTagEnd: number; attrs: string };

function collectHtmlSpacingBlockOpenTagRefs(
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

  for (const tag of HTML_SPACING_BLOCK_TAGS) {
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

  for (const tag of HTML_SPACING_BLOCK_TAGS) {
    const re = new RegExp(`<${tag}(\\s[^>]*)?>`, 'i');
    const slice = source.slice(rangeStart);
    const match = re.exec(slice);
    if (match) {
      return [
        {
          openTagStart: rangeStart + match.index,
          openTagEnd: rangeStart + match.index + match[0].length,
          attrs: match[1] ?? '',
        },
      ];
    }
  }

  return [];
}

function isOpenTagHtmlDense(openTag: string): boolean {
  if (new RegExp(`${CONTRACT_PARAGRAPH_SPACING_ATTR}\\s*=\\s*["']dense["']`, 'i').test(openTag)) {
    return true;
  }
  if (new RegExp(`${CONTRACT_PARAGRAPH_SPACING_ATTR}\\s*=\\s*["']normal["']`, 'i').test(openTag)) {
    return false;
  }
  return /margin:\s*0\s+0\s+4pt/i.test(openTag);
}

/** Переключить интервалы в выделенном фрагменте HTML (режим «Исходный HTML»). */
export function toggleContractParagraphSpacingInHtmlRange(
  html: string,
  start: number,
  end: number
): ContractSpacingToggleResult {
  const refs = collectHtmlSpacingBlockOpenTagRefs(html, start, end);
  if (refs.length === 0) {
    return toggleContractParagraphSpacingInHtmlWhole(html);
  }

  const openTags = refs.map((ref) => html.slice(ref.openTagStart, ref.openTagEnd));
  const dense = openTags.some((tag) => !isOpenTagHtmlDense(tag));

  let next = html;
  for (const ref of refs) {
    const openTag = next.slice(ref.openTagStart, ref.openTagEnd);
    const patched = patchHtmlOpenTagSpacing(openTag, dense);
    next = next.slice(0, ref.openTagStart) + patched + next.slice(ref.openTagEnd);
  }

  return { html: next, dense, blockCount: refs.length, scope: 'selection' };
}

/** Уплотняет или восстанавливает интервалы во всём `.docPrint`. */
export function applyContractParagraphSpacingToHtml(
  html: string,
  options?: { dense?: boolean }
): string {
  const dense = options?.dense ?? true;
  const preset = presetForDense(dense);

  if (typeof DOMParser === 'undefined') return html;

  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__contract_spacing_root">${html}</div>`,
      'text/html'
    );
    const root = doc.getElementById('__contract_spacing_root');
    if (!root) return html;

    const docPrintNodes = root.querySelectorAll('.docPrint');
    const targets = docPrintNodes.length > 0 ? Array.from(docPrintNodes) : [root];

    for (const docPrint of targets) {
      setDocPrintDenseClass(docPrint as HTMLElement, dense);
      applySpacingInContainer(docPrint, preset, dense);
    }

    return root.innerHTML;
  } catch {
    return html;
  }
}

export function toggleContractParagraphSpacingInHtmlWhole(
  html: string
): ContractSpacingToggleResult {
  const dense = !htmlHasContractDenseSpacing(html);
  return {
    html: applyContractParagraphSpacingToHtml(html, { dense }),
    dense,
    blockCount: 0,
    scope: 'document',
  };
}

export function applyContractDenseSpacingToHtml(html: string): string {
  return applyContractParagraphSpacingToHtml(html, { dense: true });
}

export function toggleContractParagraphSpacingInVisualDocument(
  editor: HTMLElement
): ContractSpacingToggleResult {
  const docPrint = (editor.querySelector('.docPrint') ?? editor) as HTMLElement;
  const dense = !docPrint.classList.contains(CONTRACT_DENSE_SPACING_CLASS);
  setDocPrintDenseClass(docPrint, dense);
  applySpacingInContainer(docPrint, presetForDense(dense), dense);
  return { html: editor.innerHTML, dense, blockCount: 0, scope: 'document' };
}

/** @deprecated Используйте toggleContractParagraphSpacingInVisualDocument */
export function applyContractDenseSpacingToVisualEditor(editor: HTMLElement): void {
  toggleContractParagraphSpacingInVisualDocument(editor);
}

export const CONTRACT_DENSE_SPACING_CSS = `
  body.contractPrintCompact .docPrintContractDense,
  .docPrint.docPrintContractCompact.docPrintContractDense,
  .docPrint.docPrintContractDense {
    line-height: 1.28 !important;
  }
  body.contractPrintCompact .docPrintContractDense p,
  .docPrint.docPrintContractDense p {
    margin: 0 0 4pt !important;
    line-height: 1.28 !important;
  }
  body.contractPrintCompact .docPrintContractDense p[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  .docPrint.docPrintContractDense p[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"] {
    margin: 0 0 6pt !important;
    line-height: 1.32 !important;
  }
  body.contractPrintCompact .docPrintContractDense h1,
  .docPrint.docPrintContractDense h1 {
    margin: 0 0 8pt !important;
    line-height: 1.28 !important;
  }
  body.contractPrintCompact .docPrintContractDense h1[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  .docPrint.docPrintContractDense h1[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"] {
    margin: 0 0 10pt !important;
    line-height: 1.32 !important;
  }
  body.contractPrintCompact .docPrintContractDense h2,
  .docPrint.docPrintContractDense h2,
  body.contractPrintCompact .docPrintContractDense h3,
  .docPrint.docPrintContractDense h3 {
    margin: 8pt 0 3pt !important;
    line-height: 1.28 !important;
  }
  body.contractPrintCompact .docPrintContractDense h2[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  .docPrint.docPrintContractDense h2[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  body.contractPrintCompact .docPrintContractDense h3[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  .docPrint.docPrintContractDense h3[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"] {
    margin: 11pt 0 5pt !important;
    line-height: 1.32 !important;
  }
  body.contractPrintCompact .docPrintContractDense ol.contractLegalList[data-section],
  .docPrint.docPrintContractDense ol.contractLegalList[data-section] {
    margin: 0 0 4pt !important;
  }
  body.contractPrintCompact .docPrintContractDense ol.contractLegalList[data-section] > li,
  .docPrint.docPrintContractDense ol.contractLegalList[data-section] > li {
    margin: 0 0 3pt !important;
  }
  body.contractPrintCompact .docPrintContractDense ol.contractLegalList[data-section] > li[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"],
  .docPrint.docPrintContractDense ol.contractLegalList[data-section] > li[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"] {
    margin: 0 0 5pt !important;
  }
  p[${CONTRACT_PARAGRAPH_SPACING_ATTR}="dense"] {
    margin: 0 0 4pt;
    line-height: 1.28;
  }
  p[${CONTRACT_PARAGRAPH_SPACING_ATTR}="normal"] {
    margin: 0 0 6pt;
    line-height: 1.32;
  }
  @media print {
    body.contractPrintCompact .docPrintContractDense p,
    .docPrint.docPrintContractDense p {
      margin: 0 0 4pt !important;
    }
    body.contractPrintCompact .docPrintContractDense h2,
    .docPrint.docPrintContractDense h2,
    body.contractPrintCompact .docPrintContractDense h3,
    .docPrint.docPrintContractDense h3 {
      margin: 8pt 0 3pt !important;
    }
  }
`.trim();
