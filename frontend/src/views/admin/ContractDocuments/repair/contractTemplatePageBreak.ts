/** Разрыв страницы в шаблоне договора (печать / PDF). */

export const CONTRACT_TEMPLATE_PAGE_BREAK_CLASS = 'contractTemplatePageBreak';

export function buildContractTemplatePageBreakHtml(): string {
  return `<div class="${CONTRACT_TEMPLATE_PAGE_BREAK_CLASS}" style="page-break-after: always;" data-contract-page-break="1" contenteditable="false"></div>`;
}

function styleHasPageBreakAfter(style: string): boolean {
  const s = style.toLowerCase();
  return /page-break-after\s*:\s*always\b/.test(s) || /\bbreak-after\s*:\s*page\b/.test(s);
}

/** Добавляет класс маркера старым разрывам без него (только для отображения в конструкторе). */
export function normalizeContractTemplatePageBreaksInHtml(html: string): string {
  if (typeof document === 'undefined' || !html.trim()) return html;
  const host = document.createElement('div');
  host.innerHTML = html;
  let changed = false;
  for (const el of host.querySelectorAll('div')) {
    const style = el.getAttribute('style') ?? '';
    if (!styleHasPageBreakAfter(style)) continue;
    if (!el.classList.contains(CONTRACT_TEMPLATE_PAGE_BREAK_CLASS)) {
      el.classList.add(CONTRACT_TEMPLATE_PAGE_BREAK_CLASS);
    }
    if (!el.hasAttribute('data-contract-page-break')) {
      el.setAttribute('data-contract-page-break', '1');
    }
    if (el.getAttribute('contenteditable') !== 'false') {
      el.setAttribute('contenteditable', 'false');
    }
    changed = true;
  }
  return changed ? host.innerHTML : html;
}
