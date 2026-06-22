export type PaginationPageSlot = number | 'ellipsis';

const DEFAULT_MAX_PAGE_BUTTONS = 9;

/** Слоты для пагинатора: номера страниц и «…» при большом количестве. */
export function buildPaginationPageSlots(
  totalPages: number,
  currentPage: number,
  maxButtons = DEFAULT_MAX_PAGE_BUTTONS
): PaginationPageSlot[] {
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  const windowRadius = 2;
  for (let p = currentPage - windowRadius; p <= currentPage + windowRadius; p++) {
    if (p >= 1 && p <= totalPages) set.add(p);
  }

  const sorted = [...set].sort((a, b) => a - b);
  const out: PaginationPageSlot[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push('ellipsis');
    }
    out.push(sorted[i]);
  }
  return out;
}
