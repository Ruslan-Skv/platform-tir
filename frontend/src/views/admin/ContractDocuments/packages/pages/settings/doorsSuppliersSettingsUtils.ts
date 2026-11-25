import type { DoorsSupplierOption } from '@/shared/api/admin-contract-document-packages';

/** Ставит или снимает отметку у поставщика. */
export function toggleSupplierId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id];
}

/** Одинаковы ли списки id независимо от порядка. */
export function isSameSupplierIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

/** Отмеченные поставщики — в порядке справочника (таком же, как в выпадающем списке). */
export function orderSupplierIdsByOptions(ids: string[], options: DoorsSupplierOption[]): string[] {
  const selected = new Set(ids);
  return options.filter((option) => selected.has(option.id)).map((option) => option.id);
}

/** Поиск по коммерческому и юридическому названию. */
export function filterDoorsSupplierOptions(
  options: DoorsSupplierOption[],
  search: string
): DoorsSupplierOption[] {
  const query = search.trim().toLowerCase();
  if (!query) return options;
  return options.filter((option) =>
    `${option.title} ${option.legalName}`.toLowerCase().includes(query)
  );
}
