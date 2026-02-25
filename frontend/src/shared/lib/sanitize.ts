/**
 * Утилиты для защиты от XSS (межсайтового скриптинга).
 * Используют isomorphic-dompurify для санитизации на сервере и клиенте.
 */
import DOMPurify from 'isomorphic-dompurify';

/** Разрешённые теги для контента статей блога (rich text) */
const ALLOWED_BLOG_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'pre',
  'code',
  'img',
  'figure',
  'figcaption',
  'hr',
  'span',
  'div',
];

/** Разрешённые атрибуты для ссылок и изображений */
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class'];

/**
 * Санитизирует HTML-контент статей (блог, rich text).
 * Удаляет опасные теги (script, iframe, object, etc.) и атрибуты (onclick, etc.).
 * Работает на сервере и клиенте (isomorphic-dompurify).
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ALLOWED_BLOG_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTR,
  });
}

/**
 * Экранирует HTML-сущности и преобразует переводы строк в <br />.
 * Безопасно для plain text (описание товара и т.п.).
 */
export function escapeHtmlAndPreserveNewlines(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return escaped.replace(/\n/g, '<br />');
}

/** Опасные протоколы в href, приводящие к XSS */
const UNSAFE_HREF_PROTOCOLS = /^(javascript|data|vbscript|file):/i;

/**
 * Возвращает безопасный href для использования в <a> и Link.
 * Отклоняет javascript:, data:, vbscript:, file: и подобные.
 * Разрешены: http, https, mailto, tel, относительные пути (/...).
 *
 * @param href - URL из CMS, конфига или пользовательских данных
 * @param fallback - значение при небезопасном URL (по умолчанию '#')
 */
export function getSafeHref(href: string | null | undefined, fallback = '#'): string {
  if (href == null || typeof href !== 'string') return fallback;
  const trimmed = href.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  if (UNSAFE_HREF_PROTOCOLS.test(trimmed)) return fallback;
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  return fallback;
}

/**
 * Удаляет HTML-теги без ReDoS (безопасная замена /<[^>]*>/g).
 * Использует индексный поиск вместо regex для избежания катастрофического backtracking.
 */
function stripHtmlTags(s: string): string {
  let result = '';
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    if (lt === -1) {
      result += s.slice(i);
      break;
    }
    result += s.slice(i, lt) + ' ';
    const gt = s.indexOf('>', lt + 1);
    i = gt === -1 ? s.length : gt + 1;
  }
  return result;
}

/**
 * Извлекает только текст из HTML (для speech synthesis и т.п.).
 * Безопасно от ReDoS: не использует уязвимые regex для тегов.
 */
export function stripHtmlToText(html: string): string {
  return stripHtmlTags(html)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
