import { isLikelyContractAppendixRefText } from './contractTemplateAppendixRef';
import { isLikelyContractTitleText, normalizeTitleText } from './contractTemplateTitle';

export const CONTRACT_SECTION_HEADING_P_STYLE =
  'text-align: center; margin: 0 0 6pt; line-height: 1.32';

/** Заголовок раздела договора: «3. СРОКИ», «10. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН» (не подпункт 1.1.). */
export function isLikelyContractSectionHeadingText(text: string): boolean {
  const t = normalizeTitleText(text);
  if (!t || t.length > 140) return false;
  if (isLikelyContractTitleText(t)) return false;
  if (isLikelyContractAppendixRefText(t)) return false;
  const match = t.match(/^(\d+)\.\s+(.+)$/);
  if (!match) return false;
  if (/^\d/.test(match[2])) return false;
  const body = match[2].trim();
  if (body.length < 3) return false;
  return /[А-ЯЁA-Z]{3,}/.test(body);
}

function isInsideRequisitesBlock(el: Element): boolean {
  return Boolean(el.closest('.contractRequisitesBlock, .signTable, .signTableActHandwritten'));
}

function isStandardSectionHeadingParagraph(el: HTMLElement): boolean {
  if (el.tagName !== 'P') return false;
  const text = normalizeTitleText(el.textContent ?? '');
  if (!isLikelyContractSectionHeadingText(text)) return false;
  const style = el.getAttribute('style') ?? '';
  if (!/text-align:\s*center/i.test(style)) return false;
  const boldChild = el.querySelector(':scope > b, :scope > strong');
  if (!boldChild) return false;
  return normalizeTitleText(boldChild.textContent ?? '') === text;
}

function hasNestedFontSizeMarkup(el: HTMLElement): boolean {
  return Boolean(el.querySelector('span[style*="font-size"], font[size]'));
}

function shouldNormalizeSectionHeadingElement(el: HTMLElement): boolean {
  const text = normalizeTitleText(el.textContent ?? '');
  if (!isLikelyContractSectionHeadingText(text)) return false;
  if (isInsideRequisitesBlock(el)) return false;
  if (isStandardSectionHeadingParagraph(el)) return false;
  const tag = el.tagName;
  if (!/^H[1-6]$|^P$/i.test(tag)) return false;
  if (/^H[3-6]$/i.test(tag)) return true;
  if (hasNestedFontSizeMarkup(el)) return true;
  if (/^H[12]$/i.test(tag)) return hasNestedFontSizeMarkup(el);
  return false;
}

function buildStandardSectionHeadingParagraph(text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.setAttribute('data-contract-paragraph-spacing', 'normal');
  p.setAttribute('style', CONTRACT_SECTION_HEADING_P_STYLE);
  const b = document.createElement('b');
  b.textContent = text;
  p.appendChild(b);
  return p;
}

function replaceWithStandardSectionHeading(el: HTMLElement): void {
  const text = normalizeTitleText(el.textContent ?? '');
  if (!text) return;
  el.replaceWith(buildStandardSectionHeadingParagraph(text));
}

/** Приводит заголовки разделов «N. НАЗВАНИЕ» к единому виду: `<p><b>…</b></p>` по центру. */
export function normalizeContractSectionHeadingsInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;
  const candidates = [...root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, p')];
  for (const el of candidates) {
    if (!shouldNormalizeSectionHeadingElement(el)) continue;
    replaceWithStandardSectionHeading(el);
  }
}

export function normalizeContractSectionHeadingsInHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const container = document.createElement('div');
  container.innerHTML = html || '';
  normalizeContractSectionHeadingsInDom(container);
  return container.innerHTML;
}
