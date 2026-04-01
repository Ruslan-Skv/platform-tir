/**
 * Соответствует логике getAttrValueFromProductJson на бэкенде.
 */
export function getProductAttrValue(
  attributes: unknown,
  meta: { slug: string; name?: string | null }
): string | null {
  if (attributes == null) return null;
  const name = meta.name?.trim() ?? '';
  if (Array.isArray(attributes)) {
    for (const item of attributes) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      if (o.slug === meta.slug && o.value != null) return String(o.value).trim();
      if (name && typeof o.name === 'string' && o.name === name && o.value != null) {
        return String(o.value).trim();
      }
    }
    return null;
  }
  if (typeof attributes === 'object') {
    const o = attributes as Record<string, unknown>;
    const bySlug = o[meta.slug];
    if (bySlug != null) return String(bySlug).trim();
    if (name) {
      const byName = o[name];
      if (byName != null) return String(byName).trim();
    }
  }
  return null;
}
