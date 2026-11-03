/**
 * Персональный порядок разделов сайдбара: href из navOrder идут в сохранённом порядке,
 * разделы вне списка (новые или недавно полученные) — после них в базовом порядке.
 */
export function applyAdminSidebarNavOrder<T extends { href: string }>(
  items: T[],
  navOrder: string[]
): T[] {
  if (navOrder.length === 0) return items;
  const position = new Map(navOrder.map((href, index) => [href, index] as const));
  return items
    .map((item, baseIndex) => ({ item, baseIndex, order: position.get(item.href) }))
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return a.baseIndex - b.baseIndex;
    })
    .map((entry) => entry.item);
}
