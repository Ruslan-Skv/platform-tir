/**
 * Сохранение/восстановление скролла сетки каталога при уходе в карточку и «Назад».
 * Используем scrollY + layout-offset карточки (без CSS transform), чтобы hover
 * translateY не давал систематический сдвиг при каждом возврате.
 */

export type CatalogScrollRestoreState = {
  y: number;
  slug?: string;
  /** offsetTop по цепочке offsetParent — без transform */
  layoutTop?: number;
};

const STORAGE_PREFIX = 'catalog_scroll:';

export function getCatalogScrollStorageKey(urlKey: string): string {
  return `${STORAGE_PREFIX}${urlKey}`;
}

/** Позиция элемента в документе без учёта CSS transform (в отличие от getBoundingClientRect). */
function getLayoutTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

function findCatalogProductCard(slug: string): HTMLElement | null {
  try {
    return document.querySelector(
      `[data-catalog-product-slug="${CSS.escape(slug)}"]`
    ) as HTMLElement | null;
  } catch {
    return document.querySelector(
      `[data-catalog-product-slug="${slug.replace(/"/g, '\\"')}"]`
    ) as HTMLElement | null;
  }
}

export function saveCatalogScrollPosition(productSlug?: string): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/catalog/products')) return;
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  const urlKey = `${window.location.pathname}${window.location.search}`;
  const slug = productSlug?.trim() || undefined;
  const el = slug ? findCatalogProductCard(slug) : null;
  const payload: CatalogScrollRestoreState = {
    y: window.scrollY,
    slug,
    layoutTop: el ? getLayoutTop(el) : undefined,
  };
  sessionStorage.setItem(getCatalogScrollStorageKey(urlKey), JSON.stringify(payload));
}

export function readCatalogScrollRestore(urlKey: string): CatalogScrollRestoreState | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(getCatalogScrollStorageKey(urlKey));
  if (raw == null) return null;

  if (/^\d+(\.\d+)?$/.test(raw.trim())) {
    const y = Number(raw);
    return Number.isFinite(y) && y >= 0 ? { y } : null;
  }

  try {
    const parsed = JSON.parse(raw) as CatalogScrollRestoreState & { cardTop?: number };
    if (!parsed || typeof parsed.y !== 'number' || !Number.isFinite(parsed.y) || parsed.y < 0) {
      return null;
    }
    return {
      y: parsed.y,
      slug: typeof parsed.slug === 'string' && parsed.slug ? parsed.slug : undefined,
      layoutTop:
        typeof parsed.layoutTop === 'number' && Number.isFinite(parsed.layoutTop)
          ? parsed.layoutTop
          : undefined,
    };
  } catch {
    return null;
  }
}

export function clearCatalogScrollRestore(urlKey: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getCatalogScrollStorageKey(urlKey));
}

function applyRestore(saved: CatalogScrollRestoreState): void {
  const el = saved.slug ? findCatalogProductCard(saved.slug) : null;
  if (el && saved.layoutTop != null) {
    const delta = getLayoutTop(el) - saved.layoutTop;
    window.scrollTo({ top: Math.max(0, saved.y + delta), behavior: 'auto' });
    return;
  }
  window.scrollTo({ top: saved.y, behavior: 'auto' });
}

/**
 * Один раз ставит скролл (с поправкой на CLS по layoutTop), затем редко
 * переприменяет ту же формулу — без покадрового удержания viewport-якоря.
 */
export function restoreCatalogScrollPosition(opts: {
  urlKey: string;
  settleMs?: number;
}): () => void {
  const saved = readCatalogScrollRestore(opts.urlKey);
  if (!saved) return () => undefined;

  const settleMs = opts.settleMs ?? 1000;
  applyRestore(saved);
  clearCatalogScrollRestore(opts.urlKey);

  const startedAt = performance.now();
  const reapply = () => {
    if (performance.now() - startedAt > settleMs) return;
    applyRestore(saved);
  };

  const t1 = window.setTimeout(reapply, 100);
  const t2 = window.setTimeout(reapply, 400);
  const t3 = window.setTimeout(reapply, Math.min(settleMs, 900));

  const ro =
    typeof ResizeObserver !== 'undefined' && saved.slug
      ? new ResizeObserver(() => {
          reapply();
        })
      : null;

  const grid = document.querySelector('[data-catalog-products-grid]');
  if (grid) ro?.observe(grid);

  return () => {
    window.clearTimeout(t1);
    window.clearTimeout(t2);
    window.clearTimeout(t3);
    ro?.disconnect();
  };
}
