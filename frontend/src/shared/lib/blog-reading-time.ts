/** Согласовано с backend BlogService.computeReadingTimeMinutes (~200 слов/мин). */
export function computeBlogReadingTimeMinutes(content: string): number {
  const text = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
