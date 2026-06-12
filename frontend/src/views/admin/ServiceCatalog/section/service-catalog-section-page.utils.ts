import type { ServiceCatalogCategory } from './service-catalog-section-page.types';

export function flattenCategoriesForSelect(
  cats: ServiceCatalogCategory[],
  prefix = ''
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const c of cats) {
    out.push({ id: c.id, name: prefix + c.name });
    if (c.children?.length) {
      out.push(...flattenCategoriesForSelect(c.children, prefix + '— '));
    }
  }
  return out;
}

export function collectDescendantIds(cat: ServiceCatalogCategory): Set<string> {
  const s = new Set<string>();
  const walk = (c: ServiceCatalogCategory) => {
    for (const ch of c.children ?? []) {
      s.add(ch.id);
      walk(ch);
    }
  };
  walk(cat);
  return s;
}

export function countNestedCategories(cat: ServiceCatalogCategory): number {
  return collectDescendantIds(cat).size;
}

export function buildDeleteCategoryModalMessage(name: string, nestedCategoryCount: number): string {
  if (nestedCategoryCount > 0) {
    return `Удалить категорию «${name}»?\n\nБудут также удалены все дочерние и вложенные подкатегории (${nestedCategoryCount}) и все виды работ внутри этой ветки.`;
  }
  return `Удалить категорию «${name}»? Все виды работ в этой категории также будут удалены.`;
}

export function findCategoryById(
  cats: ServiceCatalogCategory[],
  id: string
): ServiceCatalogCategory | null {
  for (const c of cats) {
    if (c.id === id) return c;
    const inner = c.children?.length ? findCategoryById(c.children, id) : null;
    if (inner) return inner;
  }
  return null;
}

export function flattenVisible(
  cats: ServiceCatalogCategory[],
  level: number,
  expanded: Set<string>
): Array<{ cat: ServiceCatalogCategory; level: number }> {
  const out: Array<{ cat: ServiceCatalogCategory; level: number }> = [];
  for (const c of cats) {
    out.push({ cat: c, level });
    const ch = c.children;
    if (ch?.length && expanded.has(c.id)) {
      out.push(...flattenVisible(ch, level + 1, expanded));
    }
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яё]/g, (c) => {
      const map: Record<string, string> = {
        а: 'a',
        б: 'b',
        в: 'v',
        г: 'g',
        д: 'd',
        е: 'e',
        ё: 'e',
        ж: 'zh',
        з: 'z',
        и: 'i',
        й: 'y',
        к: 'k',
        л: 'l',
        м: 'm',
        н: 'n',
        о: 'o',
        п: 'p',
        р: 'r',
        с: 's',
        т: 't',
        у: 'u',
        ф: 'f',
        х: 'h',
        ц: 'ts',
        ч: 'ch',
        ш: 'sh',
        щ: 'sch',
        ъ: '',
        ы: 'y',
        ь: '',
        э: 'e',
        ю: 'yu',
        я: 'ya',
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
