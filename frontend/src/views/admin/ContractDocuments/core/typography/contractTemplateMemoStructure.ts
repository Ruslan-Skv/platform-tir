import {
  CONTRACT_APPENDIX_REF_CLASS,
  clearInlineTypography,
  isLikelyContractAppendixRefText,
  packageContractAppendixRefInDom,
} from './contractTemplateAppendixRef';
import { normalizeTitleText } from './contractTemplateTitle';

const MEMO_TITLE_RE = /памятка\s+по\s+эксплуатации/i;
const MEMO_BODY_BLOCK_TAGS = new Set(['P', 'UL', 'OL', 'H3', 'H4', 'TABLE', 'HR', 'DIV']);
const NESTED_H2_IN_HTML_RE =
  /<h2\b[^>]*>([\s\S]*?)<h2\b[^>]*>([\s\S]*?)<\/h2>(?:\s*<\/(?:span|strong|b|em|i)>)?\s*<\/h2>/gi;

const APPENDIX_P_STYLE =
  'text-align:left;font-size:9pt;font-weight:normal;margin:0 0 4pt;line-height:1.32';
const MEMO_H3_STYLE = 'text-align:center;font-weight:normal;margin:11pt 0 5pt;line-height:1.32';

export function isLikelyMemoDocumentTitleText(text: string): boolean {
  const t = normalizeTitleText(text);
  if (!t || t.length > 200) return false;
  return MEMO_TITLE_RE.test(t);
}

export function findMemoTitleIndexInPlain(text: string): number {
  const match = text.match(MEMO_TITLE_RE);
  return match?.index ?? -1;
}

function collectNodesBefore(parent: Element, stop: Element): Node[] {
  const nodes: Node[] = [];
  let current: ChildNode | null = parent.firstChild;
  while (current && current !== stop) {
    nodes.push(current);
    current = current.nextSibling;
  }
  return nodes;
}

function getHtmlRangeBeforeChild(parent: Element, stop: Element, doc: Document): string {
  const range = doc.createRange();
  range.selectNodeContents(parent);
  range.setEndBefore(stop);
  const holder = doc.createElement('div');
  holder.appendChild(range.cloneContents());
  return holder.innerHTML.trim();
}

function nodesToHtml(doc: Document, nodes: Node[]): string {
  const holder = doc.createElement('div');
  for (const node of nodes) {
    holder.appendChild(node.cloneNode(true));
  }
  return holder.innerHTML.trim();
}

function removeNodes(nodes: Node[]): void {
  for (const node of nodes) {
    node.parentNode?.removeChild(node);
  }
}

function createAppendixRefParagraph(doc: Document, innerHtml: string): HTMLParagraphElement {
  const p = doc.createElement('p');
  p.className = CONTRACT_APPENDIX_REF_CLASS;
  p.innerHTML = innerHtml;
  clearInlineTypography(p);
  return p;
}

function createAppendixRefParagraphFromPlain(doc: Document, plain: string): HTMLParagraphElement {
  const p = doc.createElement('p');
  p.className = CONTRACT_APPENDIX_REF_CLASS;
  p.textContent = normalizeTitleText(plain);
  clearInlineTypography(p);
  return p;
}

function unwrapSingleSpanShell(heading: HTMLElement): void {
  if (heading.childElementCount !== 1) return;
  const span = heading.firstElementChild;
  if (!span || span.tagName !== 'SPAN') return;
  if (!span.querySelector('p, ul, ol, h3, h2')) return;
  while (span.firstChild) {
    heading.insertBefore(span.firstChild, span);
  }
  span.remove();
}

function splitMemoTitleAndBody(
  innerHeading: HTMLElement,
  doc: Document
): {
  h3: HTMLElement;
  body: DocumentFragment;
} {
  const h3 = doc.createElement('h3');
  h3.style.textAlign = 'center';
  h3.style.fontWeight = 'normal';
  h3.style.margin = '11pt 0 5pt';
  h3.style.lineHeight = '1.32';

  unwrapSingleSpanShell(innerHeading);

  const titleNodes: Node[] = [];
  let child: ChildNode | null = innerHeading.firstChild;
  while (child) {
    const tag = child instanceof Element ? child.tagName : '';
    if (MEMO_BODY_BLOCK_TAGS.has(tag)) break;
    titleNodes.push(child);
    child = child.nextSibling;
  }

  const titleHolder = doc.createElement('div');
  for (const node of titleNodes) {
    titleHolder.appendChild(node.cloneNode(true));
  }
  const titleText = normalizeTitleText(titleHolder.textContent ?? '');
  if (titleText && isLikelyMemoDocumentTitleText(titleText)) {
    h3.textContent = titleText;
  } else {
    const plain = normalizeTitleText(innerHeading.textContent ?? '');
    const match = plain.match(MEMO_TITLE_RE);
    if (match) {
      h3.textContent = normalizeTitleText(match[0]);
    }
  }

  removeNodes(titleNodes);

  const body = doc.createDocumentFragment();
  while (innerHeading.firstChild) {
    body.appendChild(innerHeading.firstChild);
  }

  return { h3, body };
}

function replaceHeadingWithMemoBlocks(
  heading: HTMLElement,
  doc: Document,
  appendixHtml?: string
): void {
  const parent = heading.parentNode;
  if (!parent) return;

  if (appendixHtml && isLikelyContractAppendixRefText(appendixHtml.replace(/<[^>]+>/g, ' '))) {
    parent.insertBefore(createAppendixRefParagraph(doc, appendixHtml), heading);
  }

  const { h3, body } = splitMemoTitleAndBody(heading, doc);
  parent.insertBefore(h3, heading);
  parent.insertBefore(body, heading);
  heading.remove();
}

function findNestedMemoInnerH2(outer: HTMLElement): HTMLElement | null {
  const direct = outer.querySelector(':scope > h2');
  if (direct && direct !== outer) return direct;
  return outer.getElementsByTagName('h2')[0] ?? null;
}

function fixNestedH2MemoShellInDom(docPrint: HTMLElement): void {
  const doc = docPrint.ownerDocument;

  for (const outer of [...docPrint.querySelectorAll<HTMLElement>('h2')]) {
    if (!outer.isConnected) continue;
    const innerH2 = findNestedMemoInnerH2(outer);
    if (!innerH2) continue;

    let appendixHtml = '';
    if (innerH2.parentElement === outer) {
      const appendixNodes = collectNodesBefore(outer, innerH2);
      appendixHtml = nodesToHtml(doc, appendixNodes);
      removeNodes(appendixNodes);
    } else {
      appendixHtml = getHtmlRangeBeforeChild(outer, innerH2, doc);
    }

    const parent = outer.parentNode;
    if (!parent) continue;

    if (appendixHtml && isLikelyContractAppendixRefText(appendixHtml.replace(/<[^>]+>/g, ' '))) {
      parent.insertBefore(createAppendixRefParagraph(doc, appendixHtml), outer);
    }

    const { h3, body } = splitMemoTitleAndBody(innerH2, doc);
    innerH2.remove();
    parent.insertBefore(h3, outer);
    parent.insertBefore(body, outer);
    outer.remove();
  }
}

/** Соседние h2 «Приложение…» + «Памятка…» на любом уровне внутри docPrint. */
function fixAdjacentMemoHeadingsInDom(docPrint: HTMLElement): void {
  const doc = docPrint.ownerDocument;
  const h2s = [...docPrint.querySelectorAll<HTMLElement>('h2')];

  for (let i = 0; i < h2s.length - 1; i++) {
    const first = h2s[i];
    const second = h2s[i + 1];
    if (!first?.isConnected || !second?.isConnected) continue;
    if (first.contains(second)) continue;
    if (!isLikelyContractAppendixRefText(first.textContent ?? '')) continue;
    if (!MEMO_TITLE_RE.test(second.textContent ?? '')) continue;

    first.replaceWith(createAppendixRefParagraph(doc, first.innerHTML));
    replaceHeadingWithMemoBlocks(second, doc);
  }
}

/** Один h2 с текстом «Приложение…» + «Памятка…» (слишком длинный для isLikelyContractAppendixRefText). */
function fixCombinedMemoHeadingInDom(docPrint: HTMLElement): void {
  const doc = docPrint.ownerDocument;

  for (const heading of [...docPrint.querySelectorAll<HTMLElement>('h2')]) {
    if (!heading.isConnected) continue;
    const plain = heading.textContent ?? '';
    const memoIndex = findMemoTitleIndexInPlain(plain);
    if (memoIndex <= 0) continue;

    const appendixPlain = plain.slice(0, memoIndex).trim();
    if (!isLikelyContractAppendixRefText(appendixPlain)) continue;

    const parent = heading.parentNode;
    if (!parent) continue;

    parent.insertBefore(createAppendixRefParagraphFromPlain(doc, appendixPlain), heading);
    replaceHeadingWithMemoBlocks(heading, doc);
  }
}

/** contentEditable: p/ul внутри h2 (часто через span-обёртку). */
function fixMemoHeadingWithBlockChildrenInDom(docPrint: HTMLElement): void {
  const doc = docPrint.ownerDocument;

  for (const heading of [...docPrint.querySelectorAll<HTMLElement>('h2')]) {
    if (!heading.isConnected) continue;
    if (!heading.querySelector('p, ul, ol, h3')) continue;
    const plain = heading.textContent ?? '';
    if (!MEMO_TITLE_RE.test(plain)) continue;

    const memoIndex = findMemoTitleIndexInPlain(plain);
    let appendixHtml = '';
    if (memoIndex > 0) {
      const appendixPlain = plain.slice(0, memoIndex).trim();
      if (isLikelyContractAppendixRefText(appendixPlain)) {
        const parent = heading.parentNode;
        if (parent) {
          parent.insertBefore(createAppendixRefParagraphFromPlain(doc, appendixPlain), heading);
        }
      }
    } else {
      const firstBlock = heading.querySelector('p, ul, ol, h3');
      if (firstBlock) {
        appendixHtml = getHtmlRangeBeforeChild(heading, firstBlock, doc);
        if (!isLikelyContractAppendixRefText(appendixHtml.replace(/<[^>]+>/g, ' '))) {
          appendixHtml = '';
        }
      }
    }

    replaceHeadingWithMemoBlocks(heading, doc, appendixHtml || undefined);
  }
}

function fixNestedH2MemoShellInHtmlString(html: string): string {
  let out = html;
  let prev = '';
  while (prev !== out) {
    prev = out;
    out = out.replace(NESTED_H2_IN_HTML_RE, (_full, beforeInner, inner) => {
      const appendixPlain = beforeInner
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const appendixP = isLikelyContractAppendixRefText(appendixPlain)
        ? `<p class="${CONTRACT_APPENDIX_REF_CLASS}" style="${APPENDIX_P_STYLE}">${beforeInner.trim()}</p>`
        : '';

      const titleSplit = inner.split(/(?=<p\b|<ul\b|<ol\b|<h3\b)/i);
      const titleChunk = titleSplit[0] ?? '';
      const bodyChunk = titleSplit.slice(1).join('');
      const titlePlain = titleChunk
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const h3 =
        titlePlain && isLikelyMemoDocumentTitleText(titlePlain)
          ? `<h3 style="${MEMO_H3_STYLE}">${normalizeTitleText(titlePlain)}</h3>`
          : '';
      return `${appendixP}${h3}${bodyChunk}`;
    });
  }
  return out;
}

/** Разворачивает ошибочную вложенность h2 (памятка + «Приложение №…» в заголовках). */
export function fixBrokenMemoHeadingNestingInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;
  const docPrint =
    root instanceof Element && root.classList.contains('docPrint')
      ? (root as HTMLElement)
      : (root.querySelector('.docPrint') as HTMLElement | null);
  if (!docPrint) return;

  fixNestedH2MemoShellInDom(docPrint);
  fixAdjacentMemoHeadingsInDom(docPrint);
  fixCombinedMemoHeadingInDom(docPrint);
  fixMemoHeadingWithBlockChildrenInDom(docPrint);
  packageContractAppendixRefInDom(docPrint);
}

export function fixBrokenMemoHeadingNestingInHtml(html: string): string {
  if (!/<h2\b/i.test(html) || !MEMO_TITLE_RE.test(html)) return html;
  const stringFixed = fixNestedH2MemoShellInHtmlString(html);
  if (typeof window === 'undefined') return stringFixed;
  const wrapped = stringFixed.includes('docPrint')
    ? stringFixed
    : `<div class="docPrint docPrintContractCompact">${stringFixed}</div>`;
  const container = document.createElement('div');
  container.innerHTML = wrapped;
  fixBrokenMemoHeadingNestingInDom(container);
  const docPrint = container.querySelector('.docPrint');
  return docPrint?.innerHTML ?? stringFixed;
}
