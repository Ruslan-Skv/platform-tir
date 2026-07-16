import type { Category, FlatCategoryOption } from './categories-page.types';

export function collectExpandableIds(categories: Category[]): string[] {
  const ids: string[] = [];
  const collectIds = (cats: Category[]) => {
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        ids.push(cat.id);
        collectIds(cat.children);
      }
    });
  };
  collectIds(categories);
  return ids;
}

export function countCategories(categories: Category[]): number {
  return categories.reduce(
    (sum, cat) => sum + 1 + (cat.children?.length ? countCategories(cat.children) : 0),
    0
  );
}

const EXPANDED_STORAGE_KEY = 'admin_catalog_categories_expanded';

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

export function formatCategoryProductCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} товар`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} товара`;
  }
  return `${count} товаров`;
}

export function flattenCategories(categories: Category[], prefix = ''): FlatCategoryOption[] {
  const result: FlatCategoryOption[] = [];
  for (const cat of categories) {
    result.push({ id: cat.id, name: prefix + cat.name });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, prefix + '— '));
    }
  }
  return result;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ё/g, 'yo')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'h')
    .replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'sch')
    .replace(/ъ/g, '')
    .replace(/ы/g, 'y')
    .replace(/ь/g, '')
    .replace(/э/g, 'e')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    .substring(0, 100);
}
