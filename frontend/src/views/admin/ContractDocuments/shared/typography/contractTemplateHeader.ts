/** Преамбула договора: данные заказчика без жирного/курсива (роли «Заказчик»/«Подрядчик» можно оставить). */

const PARTY_ROLE_BOLD_RE =
  /^(?:«)?(?:Подрядчик|Заказчик|Исполнитель|ПОДРЯДЧИК|ИСПОЛНИТЕЛЬ)(?:»)?$/iu;

const PREAMBLE_CUSTOMER_SPLIT_RE = /,\s*с\s+одной\s+стороны,?\s+и\s+/iu;

function unwrapElementKeepChildren(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

function shouldKeepPartyRoleBold(el: Element): boolean {
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return PARTY_ROLE_BOLD_RE.test(text);
}

function charOffsetBeforeElement(container: HTMLElement, el: Element): number {
  const doc = container.ownerDocument;
  const range = doc.createRange();
  range.selectNodeContents(container);
  try {
    range.setEndBefore(el);
    return range.toString().length;
  } catch {
    return 0;
  }
}

/** Снимает жирный/курсив с данных заказчика в абзаце преамбулы (после «…с одной стороны, и»). */
export function normalizeContractPreambleParagraphCustomerTypography(p: HTMLElement): void {
  const fullText = p.textContent ?? '';
  const splitMatch = PREAMBLE_CUSTOMER_SPLIT_RE.exec(fullText);
  if (!splitMatch) return;

  const customerStartOffset = splitMatch.index + splitMatch[0].length;

  for (const el of [...p.querySelectorAll('strong, b, em, i')]) {
    if (shouldKeepPartyRoleBold(el)) continue;
    if (charOffsetBeforeElement(p, el) >= customerStartOffset) {
      unwrapElementKeepChildren(el);
    }
  }
}

/**
 * Шапка договора (от заголовка H1 до первого H2): данные заказчика — обычным текстом.
 */
export function normalizeContractHeaderCustomerTypography(html: string): string {
  if (!html.includes('docPrint')) return html;
  if (typeof DOMParser === 'undefined') return html;

  try {
    const doc = new DOMParser().parseFromString(
      `<div id="__contract_header_root">${html}</div>`,
      'text/html'
    );
    const root = doc.getElementById('__contract_header_root');
    if (!root) return html;

    const docPrint = root.querySelector('.docPrint') ?? root;
    const h1 = docPrint.querySelector('h1');
    if (!h1) return html;

    let el: Element | null = h1.nextElementSibling;
    while (el && el.tagName !== 'H2') {
      if (el.tagName === 'P') {
        normalizeContractPreambleParagraphCustomerTypography(el as HTMLElement);
      }
      el = el.nextElementSibling;
    }

    return root.innerHTML;
  } catch {
    return html;
  }
}
