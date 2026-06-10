import {
  CONTRACT_DOC_TITLE_CLASS,
  applyStandardHeadingTitleStyle,
  normalizeTitleText,
} from './contractTemplateTitle';

/** Ссылка на приложение к договору («Приложение №2 к договору № …»). */
export const CONTRACT_APPENDIX_REF_CLASS = 'contractAppendixRef';

export const CONTRACT_APPENDIX_REF_INLINE_STYLE =
  'text-align:left;font-size:9pt;font-weight:normal;margin:0 0 4pt;line-height:1.32';

/** Эталонная строка «Приложение №N к договору…» (как в акте: отдельный абзац, не заголовок). */
export function buildContractAppendixRefParagraphHtml(appendixNumber: number | string = 1): string {
  return `<p class="${CONTRACT_APPENDIX_REF_CLASS}" style="${CONTRACT_APPENDIX_REF_INLINE_STYLE}">Приложение №${appendixNumber} к договору № {{contract.number}} от {{contract.date}}</p>`;
}

const APPENDIX_REF_RE = /Приложение\s*№\s*\d+/i;
const APPENDIX_CONTRACT_RE = /к\s+договору|{{contract\.number}}/i;
const ACT_TITLE_RE = /акт\s+при/i;

const SUBHEADING_HTML_RE = /<h([34])\b[^>]*>([\s\S]*?)<\/h\1>/gi;

export function isLikelyContractAppendixRefText(text: string): boolean {
  const t = normalizeTitleText(text);
  if (!t || t.length > 200) return false;
  if (ACT_TITLE_RE.test(t)) return false;
  return APPENDIX_REF_RE.test(t) && APPENDIX_CONTRACT_RE.test(t);
}

export function isLikelyActDocumentTitleText(text: string): boolean {
  const t = normalizeTitleText(text);
  if (!t || t.length > 160) return false;
  return ACT_TITLE_RE.test(t) && !APPENDIX_REF_RE.test(t);
}

export function clearInlineTypography(el: HTMLElement): void {
  el.style.setProperty('text-align', 'left', 'important');
  el.style.setProperty('font-size', '9pt', 'important');
  el.style.setProperty('font-weight', 'normal', 'important');
  el.style.setProperty('margin', '0 0 4pt', 'important');
  el.style.setProperty('line-height', '1.32', 'important');
  for (const child of el.querySelectorAll<HTMLElement>('*')) {
    child.style.setProperty('text-align', 'left', 'important');
    child.style.setProperty('font-size', 'inherit', 'important');
    child.style.setProperty('font-weight', 'normal', 'important');
    const styleAttr = child.getAttribute('style');
    if (!styleAttr) continue;
    const cleaned = styleAttr
      .replace(/\btext-align\s*:\s*[^;]+;?/gi, '')
      .replace(/\bfont-size\s*:\s*[^;]+;?/gi, '')
      .replace(/\bfont-weight\s*:\s*[^;]+;?/gi, '')
      .replace(/;\s*;/g, ';')
      .replace(/^[\s;]+|[\s;]+$/g, '')
      .trim();
    if (cleaned) child.setAttribute('style', cleaned);
    else child.removeAttribute('style');
  }
}

function pruneEmptyShells(root: ParentNode): void {
  for (const el of [...root.querySelectorAll('h1, h2, h3, h4, h5, h6, span')]) {
    const text = (el.textContent ?? '').replace(/\u200B/g, '').trim();
    if (!text && !el.querySelector('img, table, p, ul, ol')) {
      el.remove();
    }
  }
}

function plainHeadingText(innerHtml: string): string {
  return innerHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function replaceSubheadingMatch(full: string, inner: string): string {
  const plain = plainHeadingText(inner);
  if (!plain) return full;
  if (isLikelyContractAppendixRefText(plain)) {
    return `<p class="${CONTRACT_APPENDIX_REF_CLASS}" style="${CONTRACT_APPENDIX_REF_INLINE_STYLE}">${inner.trim()}</p>`;
  }
  if (isLikelyActDocumentTitleText(plain)) {
    return `<h2 class="${CONTRACT_DOC_TITLE_CLASS}" style="text-align:center;font-size:12pt;font-weight:bold;margin:11pt 0 5pt;line-height:1.32">${normalizeTitleText(plain)}</h2>`;
  }
  return full;
}

function unwrapAppendixHeadingShells(html: string): string {
  return html
    .replace(/<h2\b[^>]*>\s*<span[^>]*>\s*(?=<p class="contractAppendixRef")/gi, '')
    .replace(/<span[^>]*>\s*(?=<p class="contractAppendixRef")/gi, '')
    .replace(/<\/span>\s*<\/h2>/gi, '')
    .replace(/<p class="contractAppendixRef"[^>]*>\s*<\/p>/gi, '');
}

/** Строковая нормализация (работает и при невалидной вложенности h2>h3). */
export function packageContractAppendixRefInHtml(html: string): string {
  if (!APPENDIX_REF_RE.test(html) && !ACT_TITLE_RE.test(html)) return html;

  let out = html.replace(SUBHEADING_HTML_RE, (full, _level, inner) =>
    replaceSubheadingMatch(full, inner)
  );
  out = unwrapAppendixHeadingShells(out);
  return out;
}

/** «Приложение №N…» и «Акт приема-передачи…» — отдельные блоки без вложенных заголовков. */
export function packageContractAppendixRefInDom(docPrint: HTMLElement): void {
  for (const heading of [...docPrint.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6')]) {
    if (!heading.isConnected) continue;
    const text = heading.textContent ?? '';
    if (isLikelyContractAppendixRefText(text)) {
      const p = docPrint.ownerDocument.createElement('p');
      p.className = CONTRACT_APPENDIX_REF_CLASS;
      p.innerHTML = heading.innerHTML;
      clearInlineTypography(p);
      heading.replaceWith(p);
      continue;
    }
    if (isLikelyActDocumentTitleText(text)) {
      const h2 = docPrint.ownerDocument.createElement('h2');
      h2.className = CONTRACT_DOC_TITLE_CLASS;
      h2.textContent = normalizeTitleText(text);
      applyStandardHeadingTitleStyle(h2);
      heading.replaceWith(h2);
    }
  }

  pruneEmptyShells(docPrint);
}

export function packageContractAppendixAndActTitlesInDom(root: ParentNode): void {
  if (typeof window === 'undefined') return;
  const docPrint =
    root instanceof Element && root.classList.contains('docPrint')
      ? (root as HTMLElement)
      : (root.querySelector('.docPrint') as HTMLElement | null);
  if (!docPrint) return;
  packageContractAppendixRefInDom(docPrint);
}
