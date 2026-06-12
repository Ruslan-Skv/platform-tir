export const CARD_SECTIONS_STORAGE_KEY = 'admin_product_card_template_sections';

export const DEFAULT_CARD_SECTIONS = [
  'main',
  'pricing',
  'cardBadges',
  'variants',
  'cardVariants',
  'seo',
  'images',
  'video',
  'description',
  'attributes',
  'components',
] as const;

export function getCardSections(): string[] {
  if (typeof window === 'undefined') return [...DEFAULT_CARD_SECTIONS];
  try {
    const saved = localStorage.getItem(CARD_SECTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_CARD_SECTIONS];
}
