/** Класс для блока «шапки» договора (название + подзаголовок при необходимости). */
export const CONTRACT_DOC_TITLE_CLASS = 'contractDocTitle';

/** Без \\b: в JS границы слов для кириллицы и «№» работают ненадёжно. */
const CONTRACT_TITLE_TEXT_RE = /договор/i;
const CONTRACT_TITLE_NUMBER_RE =
  /(?:№\s*\{\{contract\.number\}\}|{{contract\.number}}|№\s*\d|(?:^|\s)№(?:\s|$))/i;

const MAX_TITLE_INLINE_PT = 14;

export function normalizeTitleText(text: string): string {
  return text
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Преамбулы Д/с и приложений — не заголовок договора, хотя есть «договор» и №. */
const NON_CONTRACT_TITLE_PREFIX_RE =
  /^(?:Приложение\s*№|Стороны\b|Настоящее\b|к\s+договор|Дополнительное\s+соглашение)/iu;

/** Текст похож на название договора (после Word / строгой нормализации). */
export function isLikelyContractTitleText(text: string): boolean {
  const t = normalizeTitleText(text);
  if (!t || t.length > 280) return false;
  if (NON_CONTRACT_TITLE_PREFIX_RE.test(t)) return false;
  if (!CONTRACT_TITLE_TEXT_RE.test(t)) return false;
  if (/^договор/i.test(t) && t.length < 140) return true;
  if (CONTRACT_TITLE_NUMBER_RE.test(t) && /^договор/i.test(t)) return true;
  return false;
}

/** Шапка Д/с: подзаголовок «к Договору…» содержит «договор» и №, но не название договора. */
function isRepairAddendumHeaderElement(el: Element): boolean {
  const node = el as HTMLElement;
  if (node.classList.contains('packageAddendumHeaderSub')) return true;
  if (node.classList.contains('packageAddendumHeaderTitle')) return true;
  if (node.classList.contains('packageAddendumHeaderBlock')) return true;
  return node.closest('.packageAddendumHeaderBlock') != null;
}

export function isLikelyContractTitleElement(el: Element): boolean {
  if (isRepairAddendumHeaderElement(el)) return false;
  const tag = el.tagName.toLowerCase();
  if (!['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th'].includes(tag)) return false;
  if ((el as HTMLElement).classList.contains('docPrint')) return false;
  return isLikelyContractTitleText(el.textContent ?? '');
}

function parseFontSizePt(styleValue: string): number | null {
  const m = styleValue.trim().match(/^([\d.]+)\s*(pt|px)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2].toLowerCase() === 'px' ? n * 0.75 : n;
}

/** Снимает inline font-size (в т.ч. !important из Word) у потомков заголовка. */
export function clearNestedFontSizeInsideHeading(heading: Element): void {
  heading.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('font-size', '', 'important');
    el.style.removeProperty('font-size');
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) return;
    const cleaned = styleAttr
      .replace(/\bfont-size\s*:\s*[^;]+;?/gi, '')
      .replace(/\bmso-(?:bidi-)?font-size\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .replace(/^[\s;]+|[\s;]+$/g, '')
      .trim();
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  });
}

/** Убирает гигантский кегль Word (>14pt) внутри блока названия. */
export function clampOversizedFontSizeInElementTree(root: Element, maxPt: number): void {
  root.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    if (/^H[1-6]$/i.test(el.tagName)) return;
    const fromStyle = el.style.fontSize ? parseFontSizePt(el.style.fontSize) : null;
    const fromAttr = el
      .getAttribute('style')
      ?.match(/font-size\s*:\s*([^;]+)/i)?.[1]
      ?.trim();
    const fromAttrPt = fromAttr ? parseFontSizePt(fromAttr) : null;
    const pt = fromStyle ?? fromAttrPt;
    if (pt == null || pt <= maxPt) return;
    el.style.setProperty('font-size', '', 'important');
    el.style.removeProperty('font-size');
    const styleAttr = el.getAttribute('style');
    if (!styleAttr) return;
    const cleaned = styleAttr.replace(/\bfont-size\s*:\s*[^;]+;?/gi, '').trim();
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  });
}

const HEADING_TITLE_PT: Record<string, string> = {
  H1: '14pt',
  H2: '12pt',
  H3: '11pt',
};

export function applyStandardHeadingTitleStyle(h: HTMLElement): void {
  h.classList.add(CONTRACT_DOC_TITLE_CLASS);
  const pt = HEADING_TITLE_PT[h.tagName] ?? '14pt';
  h.style.setProperty('text-align', 'center', 'important');
  h.style.setProperty('font-size', pt, 'important');
  h.style.setProperty('margin', h.tagName === 'H1' ? '0 0 12pt' : '14pt 0 8pt', 'important');
  h.style.setProperty('font-weight', 'bold', 'important');
  clearNestedFontSizeInsideHeading(h);
  clampOversizedFontSizeInElementTree(h, MAX_TITLE_INLINE_PT);
}

const H1_TITLE_STYLE = 'text-align: center; font-size: 14pt; margin: 0 0 12pt; font-weight: bold;';

function findContractTitleCandidate(docPrint: HTMLElement): HTMLElement | null {
  const ordered = [
    ...docPrint.querySelectorAll<HTMLElement>('h1, h2, h3'),
    ...docPrint.querySelectorAll<HTMLElement>('p, div, td, th'),
  ];
  for (const el of ordered) {
    if (el.classList.contains('docPrint')) continue;
    if (isRepairAddendumHeaderElement(el)) continue;
    if (!isLikelyContractTitleElement(el)) continue;
    return el;
  }
  return null;
}

function promoteBlockToTitleHeading(el: HTMLElement): HTMLElement {
  if (/^H[1-3]$/i.test(el.tagName)) {
    applyStandardHeadingTitleStyle(el);
    return el;
  }
  const h1 = document.createElement('h1');
  h1.className = CONTRACT_DOC_TITLE_CLASS;
  h1.setAttribute('style', H1_TITLE_STYLE);
  h1.innerHTML = el.innerHTML;
  clearNestedFontSizeInsideHeading(h1);
  clampOversizedFontSizeInElementTree(h1, MAX_TITLE_INLINE_PT);
  el.replaceWith(h1);
  return h1;
}

/**
 * Приводит название договора к H1–H3 с кеглем конструктора (14/12/11 pt),
 * убирает огромные span из Word внутри заголовка (в т.ч. в таблицах Word).
 */
export function normalizeContractTitleInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;

  const docPrint =
    root instanceof Element && root.classList.contains('docPrint')
      ? (root as HTMLElement)
      : (root.querySelector('.docPrint') as HTMLElement | null);
  if (!docPrint) return;
  if (docPrint.querySelector('.packageAddendumHeaderBlock')) return;

  const candidate = findContractTitleCandidate(docPrint);
  if (!candidate) return;
  promoteBlockToTitleHeading(candidate);
}

export function normalizeContractTitleInHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html || '';
  normalizeContractTitleInDom(container);
  return container.innerHTML;
}
