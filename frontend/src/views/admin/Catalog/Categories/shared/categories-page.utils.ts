import type { Category, FlatCategoryOption } from './categories-page.types';

export function collectExpandableIds(categories: Category[]): Set<string> {
  const ids = new Set<string>();
  const collectIds = (cats: Category[]) => {
    cats.forEach((cat) => {
      if (cat.children && cat.children.length > 0) {
        ids.add(cat.id);
        collectIds(cat.children);
      }
    });
  };
  collectIds(categories);
  return ids;
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
