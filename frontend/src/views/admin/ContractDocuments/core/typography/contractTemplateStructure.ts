import { normalizeContractActHandwrittenSignaturesInDom } from './contractTemplateActSignatures';
import {
  packageContractAppendixAndActTitlesInDom,
  packageContractAppendixRefInDom,
  packageContractAppendixRefInHtml,
} from './contractTemplateAppendixRef';
import { normalizeContractHeaderCustomerTypography } from './contractTemplateHeader';
import {
  fixBrokenMemoHeadingNestingInDom,
  fixBrokenMemoHeadingNestingInHtml,
} from './contractTemplateMemoStructure';
import { fixParagraphTextAlignInDom } from './contractTemplateParagraphAlign';
import {
  applyStandardHeadingTitleStyle,
  isLikelyContractTitleText,
  normalizeTitleText,
} from './contractTemplateTitle';
import {
  alignContractRequisitesBlockSignatures,
  normalizeRequisitesBlockTypography,
} from './packageContractRequisitesLayout';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function docPrintHasBody(el: Element): boolean {
  return Boolean(
    el.querySelector('table, p, h1, h2, h3, ol, ul, li, td') ||
    (el.textContent ?? '').replace(/\s/g, '').length > 40
  );
}

/** Пустые оболочки `<div class="docPrint">` в конце шаблона (после правок в конструкторе). */
function removeEmptyDocPrintShells(root: ParentNode): void {
  root.querySelectorAll('.docPrint').forEach((el) => {
    if (docPrintHasBody(el)) return;
    el.remove();
  });
}

/**
 * Весь договор должен быть внутри `.docPrint`, иначе CSS кегля (10pt / H1 14pt) не применяется.
 * Раньше в конце оставался пустой `<div class="docPrint">`, а таблица Word — снаружи.
 */
export function ensureContractContentInDocPrint(html: string): string {
  if (typeof window === 'undefined') {
    if (!html.trim()) return '<div class="docPrint"></div>';
    if (/\bdocPrint\b/i.test(html) && /<table\b/i.test(html)) {
      const hasOpenDocPrintBeforeTable = new RegExp(
        '<div\\b[^>]*\\bclass\\s*=\\s*["\'][^"\']*\\bdocPrint\\b[^"\']*["\'][^>]*>[\\s\\S]*<table',
        'i'
      ).test(html);
      if (hasOpenDocPrintBeforeTable) return html;
    }
    if (/\bdocPrint\b/i.test(html)) return html;
    return `<div class="docPrint">\n${html}\n</div>`;
  }

  const container = document.createElement('div');
  container.innerHTML = html || '';
  removeEmptyDocPrintShells(container);

  const host = [...container.querySelectorAll('.docPrint')].find(docPrintHasBody);
  if (host) return container.innerHTML;

  const wrapper = document.createElement('div');
  wrapper.className = 'docPrint';
  while (container.firstChild) {
    wrapper.appendChild(container.firstChild);
  }
  container.appendChild(wrapper);
  return container.innerHTML;
}

function isEmptyHeading(el: Element): boolean {
  return !(el.textContent ?? '').replace(/\u200B/g, '').trim();
}

/** Удаляет пустые заголовки и сбрасывает «гигантские» line-height/margin из Word/Cursor. */
export function sanitizeContractHeadingMarkup(root: ParentNode): void {
  for (const h of [...root.querySelectorAll(HEADING_SELECTOR)]) {
    if (isEmptyHeading(h)) {
      h.remove();
      continue;
    }
    const el = h as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    if (!style) continue;
    const cleaned = style
      .replace(/\bline-height\s*:\s*[^;]+;?/gi, '')
      .replace(/\bmargin(?:-\w+)?\s*:\s*[^;]+;?/gi, '')
      .replace(/\bfont-variant[^:]*:\s*[^;]+;?/gi, '')
      .replace(
        /\bfont-(?:size-adjust|language-override|kerning|optical-sizing|feature-settings|variation-settings|stretch)\s*:\s*[^;]+;?/gi,
        ''
      )
      .replace(/\btext-align\s*:\s*start\b;?/gi, 'text-align: center;')
      .replace(/;\s*;/g, ';')
      .replace(/^[\s;]+|[\s;]+$/g, '')
      .trim();
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  }
}

function findBestTitleHeading(docPrint: HTMLElement): HTMLElement | null {
  const headings = [...docPrint.querySelectorAll<HTMLElement>('h1, h2, h3')].filter((h) => {
    const t = normalizeTitleText(h.textContent ?? '');
    return t.length > 8 && isLikelyContractTitleText(t);
  });
  if (headings.length === 0) return null;

  const depthOf = (el: Element): number => {
    let d = 0;
    for (let p = el.parentElement; p; p = p.parentElement) d += 1;
    return d;
  };

  return headings.sort((a, b) => {
    const depthDiff = depthOf(b) - depthOf(a);
    if (depthDiff !== 0) return depthDiff;
    return (a.textContent?.length ?? 0) - (b.textContent?.length ?? 0);
  })[0]!;
}

/** Одна ячейка / один H1 для названия договора вместо вложенных h1>h2>h3 из конструктора. */
export function packageContractTitleBlock(docPrint: HTMLElement): void {
  const heading = findBestTitleHeading(docPrint);
  if (!heading) return;

  const titleText = normalizeTitleText(heading.textContent ?? '');
  if (!titleText) return;

  const h1 = document.createElement('h1');
  h1.textContent = titleText;
  applyStandardHeadingTitleStyle(h1);

  const td = heading.closest('td');
  if (td) {
    td.innerHTML = '';
    td.appendChild(h1);
    return;
  }

  let wrapper: HTMLElement = heading;
  while (
    wrapper.parentElement &&
    wrapper.parentElement !== docPrint &&
    /^(H[1-6]|SPAN|STRONG|B)$/i.test(wrapper.parentElement.tagName)
  ) {
    wrapper = wrapper.parentElement as HTMLElement;
  }
  wrapper.replaceWith(h1);
}

export function packageContractTemplateStructureInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;
  removeEmptyDocPrintShells(root);
  packageContractAppendixAndActTitlesInDom(root);
  sanitizeContractHeadingMarkup(root);

  const docPrint =
    root instanceof Element && root.classList.contains('docPrint')
      ? (root as HTMLElement)
      : (root.querySelector('.docPrint') as HTMLElement | null);
  if (!docPrint) return;

  fixBrokenMemoHeadingNestingInDom(docPrint);
  packageContractAppendixRefInDom(docPrint);
  fixParagraphTextAlignInDom(docPrint);
  packageContractTitleBlock(docPrint);
  normalizeContractActHandwrittenSignaturesInDom(docPrint);
}

export function packageContractTemplateStructureInHtml(html: string): string {
  const withMemo = fixBrokenMemoHeadingNestingInHtml(html);
  const withAppendix = packageContractAppendixRefInHtml(withMemo);
  if (typeof window === 'undefined') return withAppendix;
  const wrapped = ensureContractContentInDocPrint(withAppendix);
  const container = document.createElement('div');
  container.innerHTML = wrapped;
  packageContractTemplateStructureInDom(container);
  const aligned = alignContractRequisitesBlockSignatures(container.innerHTML);
  const requisites = normalizeRequisitesBlockTypography(aligned);
  return normalizeContractHeaderCustomerTypography(requisites);
}
