import type { ServiceCatalogCategory } from './service-catalog-section-page.types';

const EXPANDED_STORAGE_KEY = 'admin_service_catalog_categories_expanded';

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

export function collectExpandableIds(categories: ServiceCatalogCategory[]): string[] {
  const ids: string[] = [];
  const walk = (cats: ServiceCatalogCategory[]) => {
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        ids.push(cat.id);
        walk(cat.children);
      }
    });
  };
  walk(categories);
  return ids;
}

export function countCategories(categories: ServiceCatalogCategory[]): number {
  return categories.reduce(
    (sum, cat) => sum + 1 + (cat.children?.length ? countCategories(cat.children) : 0),
    0
  );
}

export function countNestedCategories(cat: ServiceCatalogCategory): number {
  return collectDescendantIds(cat).size;
}

export function loadExpandedCategoryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(EXPANDED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function saveExpandedCategoryIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...ids]));
}

export function formatCategoryItemsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} вид работ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} вида работ`;
  }
  return `${count} видов работ`;
}

export function buildDeleteCategoryModalMessage(name: string, nestedCategoryCount: number): string {
  if (nestedCategoryCount > 0) {
    return `Удалить категорию «${name}»? Вместе с ${nestedCategoryCount} подкатегориями и всеми видами работ внутри этой ветки. Действие нельзя отменить.`;
  }
  return `Удалить категорию «${name}»? Все виды работ в этой категории также будут удалены. Действие нельзя отменить.`;
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
