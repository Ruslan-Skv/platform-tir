/**
 * Контент статей: в БД хранится HTML (редактор) или старый plain text.
 */

/** Грубая проверка, что строка уже размечена как HTML, а не простой текст. */
export function looksLikeBlogHtml(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  if (!/<[a-z!?/]/i.test(t)) return false;
  return /<(p|div|ul|ol|li|h[1-6]|br|blockquote|strong|b|em|i|a|img|figure|pre|code|table|span)\b/i.test(
    t
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Превращает plain text (абзацы через пустую строку) в безопасный HTML.
 * Уже HTML-контент возвращает без изменений.
 */
export function plainTextToBlogHtml(text: string): string {
  const t = text.trim();
  if (!t) return '';
  if (looksLikeBlogHtml(text)) return text;
  return t
    .split(/\n\s*\n/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

/** Пустой контент в редакторе / после сохранения. */
export function isTrivialEmptyBlogHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return !text;
}

/** Блок статьи: есть осмысленный текст или хотя бы одно изображение с URL */
export function blockHasTextOrImages(bodyHtml: string, images: { url: string }[]): boolean {
  if (!isTrivialEmptyBlogHtml(bodyHtml)) return true;
  return images.some((i) => i.url.trim());
}
