import type { Product } from '@/entities/product/types';

export interface CategoryFilterOption {
  slug: string;
  label: string;
  count: number;
  /** 0 — родительская / корневая; 1 — дочерняя (визуальный отступ в фильтре) */
  depth?: 0 | 1;
}

/**
 * Опции фильтра «Категория»: родители и дочерние, с порядком и глубиной для отступа в UI.
 */
export function buildCategoryFilterOptions(products: readonly Product[]): CategoryFilterOption[] {
  const withSlug = products.filter((p) => p.categorySlug?.trim());
  if (withSlug.length === 0) return [];

  const parentSet = new Set<string>();
  const parentLabels = new Map<string, string>();
  for (const p of withSlug) {
    const ps = p.parentCategorySlug?.trim();
    if (ps) {
      parentSet.add(ps);
      const name = p.parentCategoryName?.trim();
      if (name && !parentLabels.has(ps)) parentLabels.set(ps, name);
    }
  }

  const leafBySlug = new Map<string, { label: string; count: number; parentSlug?: string }>();
  for (const p of withSlug) {
    const ls = p.categorySlug!.trim();
    const cur = leafBySlug.get(ls) ?? {
      label: p.category,
      count: 0,
      parentSlug: p.parentCategorySlug?.trim(),
    };
    cur.count += 1;
    cur.label = p.category;
    if (p.parentCategorySlug?.trim()) cur.parentSlug = p.parentCategorySlug.trim();
    leafBySlug.set(ls, cur);
  }

  const countForParent = (ps: string): number =>
    withSlug.filter((p) => p.categorySlug?.trim() === ps || p.parentCategorySlug?.trim() === ps)
      .length;

  const childrenByParent = new Map<string, { slug: string; label: string; count: number }[]>();
  for (const [slug, v] of leafBySlug) {
    if (v.parentSlug) {
      const arr = childrenByParent.get(v.parentSlug) ?? [];
      arr.push({ slug, label: v.label, count: v.count });
      childrenByParent.set(v.parentSlug, arr);
    }
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }

  const roots: { slug: string; label: string; count: number }[] = [];
  for (const [slug, v] of leafBySlug) {
    if (!v.parentSlug) {
      roots.push({ slug, label: v.label, count: v.count });
    }
  }
  roots.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  const out: CategoryFilterOption[] = [];

  const parentsSorted = [...parentSet].sort((a, b) =>
    (parentLabels.get(a) ?? a).localeCompare(parentLabels.get(b) ?? b, 'ru')
  );

  for (const ps of parentsSorted) {
    out.push({
      slug: ps,
      label: parentLabels.get(ps) ?? ps,
      count: countForParent(ps),
      depth: 0,
    });
    for (const kid of childrenByParent.get(ps) ?? []) {
      out.push({ slug: kid.slug, label: kid.label, count: kid.count, depth: 1 });
    }
  }

  for (const r of roots) {
    if (parentSet.has(r.slug)) continue;
    out.push({ slug: r.slug, label: r.label, count: r.count, depth: 0 });
  }

  return out.length > 1 ? out : [];
}
