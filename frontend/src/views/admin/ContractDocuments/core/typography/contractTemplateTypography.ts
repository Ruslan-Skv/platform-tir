import {
  addDocPrintContractCompactClassToHtml,
  prepareContractHtmlForCompactPrint,
  prepareContractHtmlForScreenPreview,
} from '../printDocument';
import {
  CONTRACT_PARAGRAPH_SPACING_ATTR,
  applyContractParagraphSpacingToHtml,
  stripMarginAndLineHeightFromStyle,
} from './contractTemplateCompactSpacing';
import {
  ensureContractContentInDocPrint,
  packageContractTemplateStructureInDom,
  packageContractTemplateStructureInHtml,
  sanitizeContractHeadingMarkup,
} from './contractTemplateStructure';
import { normalizeContractTitleInDom } from './contractTemplateTitle';

const SIGN_TABLE_SELECTOR = '.signTable, .signTableActHandwritten';

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

function unwrapRedundantBodyFontSpans(root: ParentNode): void {
  for (const span of [
    ...root.querySelectorAll<HTMLSpanElement>('.docPrint p span, .docPrint li span'),
  ]) {
    if (span.closest(SIGN_TABLE_SELECTOR)) continue;
    const style = span.getAttribute('style') ?? '';
    const onlyFontSize =
      /\bfont-size\s*:/i.test(style) &&
      !/\b(?:text-align|text-indent|line-height|margin)\s*:/i.test(style);
    if (onlyFontSize && !span.className.trim() && span.attributes.length <= 1) {
      unwrapElementNode(span);
    }
  }
}

function clearSignTableCellSpacing(root: ParentNode): void {
  for (const td of root.querySelectorAll<HTMLTableCellElement>(`${SIGN_TABLE_SELECTOR} td`)) {
    td.removeAttribute(CONTRACT_PARAGRAPH_SPACING_ATTR);
    const style = td.getAttribute('style') ?? '';
    const cleaned = stripMarginAndLineHeightFromStyle(style);
    if (cleaned) td.setAttribute('style', cleaned);
    else td.removeAttribute('style');
  }
}

/**
 * Единая типографика тела документа: 10pt, line-height 1.32, одинаковые интервалы у p/li,
 * без смешения px/pt и без «уплотнения» таблицы подписей.
 */
export function unifyContractDocumentTypographyInHtml(html: string): string {
  if (typeof window === 'undefined') return html;

  const wrapped = ensureContractContentInDocPrint(html || '');
  const container = window.document.createElement('div');
  container.innerHTML = wrapped;
  packageContractTemplateStructureInDom(container);
  normalizeContractTitleInDom(container);
  sanitizeContractHeadingMarkup(container);
  unwrapRedundantBodyFontSpans(container);

  const withoutWordBodyFonts = prepareContractHtmlForCompactPrint(container.innerHTML, {
    preserveHeadingFontSizes: true,
    preserveInlineFontSizes: false,
  });

  container.innerHTML = withoutWordBodyFonts;
  clearSignTableCellSpacing(container);

  const withUniformSpacing = applyContractParagraphSpacingToHtml(container.innerHTML, {
    dense: false,
  });

  return addDocPrintContractCompactClassToHtml(withUniformSpacing);
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
  return unifyContractDocumentTypographyInHtml(container.innerHTML);
}

export const FONT_SIZE_TOOLTIP = {
  title: 'Размер шрифта (пт)',
  steps: [
    'Только в визуальном конструкторе: выделите фрагмент или поставьте курсор в абзац, выберите размер в списке «пт».',
    'Размер записывается в HTML шаблона (inline или весь абзац) и виден в предпросмотре справа и в пакете документов.',
    'Заголовки договора задавайте кнопками H1–H3 (14 / 12 / 11 пт по центру) — так надёжнее, чем произвольный кегль.',
    'Кнопка Tt снимает стили Word, но размеры заголовков H1–H3 в шаблоне сохраняет.',
  ],
  note: 'Масштаб «− [100] % +» у конструктора и предпросмотра только увеличивает картинку на экране, на печать не влияет.',
} as const;

export const CLEANUP_TOOLTIP = {
  clearFormat: {
    title: 'Очистить форматирование (Tx)',
    steps: [
      'Выделите фрагмент текста (абзац, фразу) — не весь договор целиком.',
      'Нажмите Tx — с выделения снимаются жирный, курсив, подчёркивание, ссылки и inline-стили.',
      'Структура документа (абзацы, списки, таблицы) сохраняется.',
    ],
    note: 'Не путать с Tt и «Нормализовать»: Tx только для выделенного фрагмента, без изменения всего шаблона.',
  },
  wordTypography: {
    title: 'Шрифты договора — убрать стили Word (Tt)',
    steps: [
      'Применяется ко всему шаблону (после вставки из Word или HTML).',
      'Удаляются классы Mso*, теги font, inline font-family и font-size из Word.',
      'Включается компактная вёрстка договора для экрана и печати (10pt, Times New Roman).',
      'Пробелы, пустые строки и выравнивание абзацев эта кнопка не трогает.',
    ],
    note: 'Следующий шаг после импорта из Word — затем при необходимости «Нормализовать».',
  },
  normalizeSoft: {
    title: 'Нормализовать — мягко',
    steps: [
      'Обрабатывается весь шаблон.',
      'Убираются лишние пробелы, переносы внутри строк и пустые абзацы.',
      'Разметка и стили абзацев (выравнивание, отступы) не меняются.',
    ],
    note: 'Если текст «разъехался» после правок — сначала мягко, при необходимости — строго.',
  },
  normalizeStrict: {
    title: 'Нормализовать — строго (для договора)',
    steps: [
      'Всё, что делает «мягко», плюс объединение соседних абзацев-дублей.',
      'Простым абзацам задаётся вид договора: по ширине, красная строка 1,25 см.',
      'Упрощаются некоторые таблицы-«простыни» из Word (вводная часть).',
    ],
    note: 'Используйте на готовом тексте договора. Не заменяет Tt после импорта Word.',
  },
} as const;

/** Для предпросмотра на экране (библиотека, пакет документов). */
export function prepareContractTemplateHtmlForPreview(html: string): string {
  const structured = packageContractTemplateStructureInHtml(html || '');
  return unifyContractDocumentTypographyInHtml(structured);
}
