/**
 * Утилиты для защиты от XSS (межсайтового скриптинга).
 * sanitizeHtml использует dompurify только на клиенте; на сервере — лёгкий fallback
 * (избегает isomorphic-dompurify/jsdom, вызывающего ENOENT в Next.js Turbopack).
 */

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
 * Лёгкая санитизация на сервере (без jsdom, без ReDoS).
 * Удаляет script/iframe/object целиком и атрибуты on*.
 */
function sanitizeHtmlServer(html: string): string {
  const tags = ['script', 'iframe', 'object', 'embed'];
  let out = html;
  for (const tag of tags) {
    for (;;) {
      const lower = out.toLowerCase();
      const i = lower.indexOf(`<${tag}`);
      if (i === -1) break;
      const endTag = `</${tag}>`;
      const endIdx = lower.indexOf(endTag, i);
      const end = endIdx === -1 ? out.indexOf('>', i) + 1 : endIdx + endTag.length;
      if (end <= 0) break;
      out = out.slice(0, i) + out.slice(end);
    }
  }
  // Удаляем on* атрибуты
  out = out.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  return out;
}

/**
 * Санитизирует HTML-контент статей (блог, rich text).
 * На клиенте использует dompurify; на сервере — лёгкий fallback без jsdom.
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') {
    return sanitizeHtmlServer(html);
  }
  // Клиент: dompurify (только в браузере)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require('dompurify');
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
