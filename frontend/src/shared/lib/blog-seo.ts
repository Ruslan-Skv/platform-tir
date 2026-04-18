/**
 * Логика совпадает с backend `blog-seo.util.ts` — превью и кнопка «Подставить».
 */

const SEO_TITLE_MAX = 60;
const SEO_DESCRIPTION_MAX = 155;

export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncateSeoTitle(title: string, maxLen = SEO_TITLE_MAX): string {
  const t = title.trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 24 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

export function truncateSeoDescription(text: string, maxLen = SEO_DESCRIPTION_MAX): string {
  const t = text.trim();
  if (!t) return '';
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${base.trimEnd()}…`;
}

export function deriveSeoDescription(
  contentHtml: string,
  excerpt: string | null | undefined
): string | null {
  const fromExcerpt = excerpt?.trim();
  if (fromExcerpt) {
    return truncateSeoDescription(fromExcerpt);
  }
  const plain = plainTextFromHtml(contentHtml);
  if (!plain) return null;
  return truncateSeoDescription(plain);
}

export function resolveSeoDescription(
  contentHtml: string,
  excerpt: string | null | undefined,
  explicit: string | undefined
): string | null {
  const ex = explicit?.trim();
  if (ex) {
    return truncateSeoDescription(ex);
  }
  return deriveSeoDescription(contentHtml, excerpt);
}

export function deriveSeoTitle(
  articleTitle: string,
  explicitSeoTitle: string | undefined
): string | null {
  const ex = explicitSeoTitle?.trim();
  if (ex) return ex;
  const t = truncateSeoTitle(articleTitle);
  return t || null;
}

/** Значения, которые уйдут на сервер при пустых полях SEO (как после автозаполнения). */
export function computeBlogSeoPreview(params: {
  title: string;
  contentHtml: string;
  excerpt?: string;
}): { seoTitle: string; seoDescription: string } {
  const seoTitle = deriveSeoTitle(params.title, undefined) ?? '';
  const seoDescription =
    resolveSeoDescription(params.contentHtml, params.excerpt ?? null, undefined) ?? '';
  return { seoTitle, seoDescription };
}
