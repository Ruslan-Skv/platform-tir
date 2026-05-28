import { prepareContractHtmlForScreenPreview } from '@/views/admin/ContractDocuments/repair/printDocument';

const MSO_CLASS_RE = /\bMso\S*/gi;
const FONT_FAMILY_STYLE_RE =
  /\b(?:font-family|mso-(?:ascii|hansi|cs|fareast)-font-family)\s*:\s*[^;]+;?/gi;

function stripTypographyNoiseFromInlineStyle(style: string): string {
  return style
    .replace(FONT_FAMILY_STYLE_RE, '')
    .replace(/\bfont-size\s*:\s*[^;]+;?/gi, '')
    .replace(/\bmso-(?:bidi-)?font-size\s*:\s*[^;]+;?/gi, '')
    .replace(/;\s*;/g, ';')
    .replace(/^[\s;]+|[\s;]+$/g, '')
    .trim();
}

function cleanElementInlineTypography(el: HTMLElement): void {
  const styleAttr = el.getAttribute('style');
  if (styleAttr) {
    const cleaned = stripTypographyNoiseFromInlineStyle(styleAttr);
    if (cleaned) el.setAttribute('style', cleaned);
    else el.removeAttribute('style');
  }
  if (el.style.fontFamily) el.style.removeProperty('font-family');
  if (el.style.fontSize) el.style.removeProperty('font-size');

  const classAttr = el.getAttribute('class');
  if (classAttr) {
    const cleanedClass = classAttr
      .replace(MSO_CLASS_RE, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (cleanedClass) el.setAttribute('class', cleanedClass);
    else el.removeAttribute('class');
  }

  if (el.tagName === 'FONT') {
    el.removeAttribute('face');
    el.removeAttribute('size');
  }
}

function unwrapElementNode(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/** Очистка HTML из буфера обмена (Word / браузер) перед вставкой в конструктор. */
export function sanitizePastedContractHtml(html: string): string {
  if (typeof window === 'undefined') return html;
  const container = window.document.createElement('div');
  container.innerHTML = html || '';

  for (const el of container.querySelectorAll('style, link, meta, script, title')) {
    el.remove();
  }

  for (const el of container.querySelectorAll<HTMLElement>('*')) {
    cleanElementInlineTypography(el);
  }

  for (const fontEl of [...container.querySelectorAll('font')]) {
    unwrapElementNode(fontEl);
  }

  for (const span of [...container.querySelectorAll('span')]) {
    if (
      span.attributes.length === 0 ||
      (span.attributes.length === 1 &&
        span.hasAttribute('style') &&
        !span.getAttribute('style')?.trim())
    ) {
      unwrapElementNode(span);
    }
  }

  return container.innerHTML;
}

function sanitizeContractTemplateDom(root: ParentNode): void {
  for (const el of root.querySelectorAll<HTMLElement>('*')) {
    cleanElementInlineTypography(el);
  }
  for (const fontEl of [...root.querySelectorAll('font')]) {
    unwrapElementNode(fontEl);
  }
}

/**
 * Приводит шаблон к типографике договора: убирает «мусор» Word,
 * inline font-size / font-family, включает `.docPrintContractCompact` (как при печати).
 */
export function normalizeContractTemplateTypography(html: string): string {
  if (typeof window === 'undefined') return prepareContractHtmlForScreenPreview(html);
  const container = window.document.createElement('div');
  container.innerHTML = html || '';
  sanitizeContractTemplateDom(container);
  return prepareContractHtmlForScreenPreview(container.innerHTML);
}

/** Для предпросмотра на экране (библиотека, пакет документов). */
export function prepareContractTemplateHtmlForPreview(html: string): string {
  if (!/\bdocPrint\b/i.test(html)) return html;
  return prepareContractHtmlForScreenPreview(html);
}
